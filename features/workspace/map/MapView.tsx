"use client";

import "@xyflow/react/dist/style.css";
import {
  applyNodeChanges,
  Background,
  BackgroundVariant,
  type Connection,
  ConnectionMode,
  Controls,
  MiniMap,
  type NodeChange,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Viewport,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore, useWorkspace } from "../WorkspaceProvider";
import { childrenOf, depthOf, descendantIds, pageIslands } from "../model/selectors";
import type { Id, Workspace } from "../model/types";
import { useShell } from "../shell/ShellContext";
import { useCommands } from "../shell/useCommands";
import { isEditableTarget } from "../shell/keys";
import { islandSize, topLeft } from "./geometry";
import { type IslandFlowNode, IslandNode } from "./IslandNode";
import { SeaEdge, type SeaFlowEdge } from "./SeaEdge";

const nodeTypes = { island: IslandNode };
const edgeTypes = { sea: SeaEdge };

function buildNodes(ws: Workspace, pageId: Id, selectedId: Id | null): IslandFlowNode[] {
  return pageIslands(ws, pageId).map((i) => {
    const depth = depthOf(ws, i.id);
    const size = islandSize(depth);
    const farBridges = ws.bridges.filter((b) => {
      const other = b.from === i.id ? b.to : b.to === i.id ? b.from : null;
      return other && ws.islands[other]?.pageId !== pageId;
    }).length;
    return {
      id: i.id,
      type: "island",
      position: topLeft(i.x, i.y, size),
      width: size.w,
      height: size.h,
      selected: i.id === selectedId,
      // Ana adalar uyduların altında dursun ki uydular tıklanabilsin.
      zIndex: depth,
      data: { islandId: i.id, title: i.title, depth, satellites: childrenOf(ws, i.id).length, farBridges },
    };
  });
}

function buildEdges(ws: Workspace, pageId: Id, selectedBridge: Id | null): SeaFlowEdge[] {
  const onPage = (id: Id) => ws.islands[id]?.pageId === pageId;
  const ties: SeaFlowEdge[] = pageIslands(ws, pageId)
    .filter((i) => i.parentId && onPage(i.parentId))
    .map((i) => ({
      id: `tie:${i.id}`,
      type: "sea",
      source: i.parentId!,
      target: i.id,
      selectable: false,
      focusable: false,
      data: { kind: "tie" },
    }));
  const bridges: SeaFlowEdge[] = ws.bridges
    .filter((b) => onPage(b.from) && onPage(b.to))
    .map((b) => ({
      id: b.id,
      type: "sea",
      source: b.from,
      target: b.to,
      selected: b.id === selectedBridge,
      data: { kind: "bridge" },
      ariaLabel: "Köprü",
    }));
  return [...ties, ...bridges];
}

type Drag = { id: Id; moveSatellites: boolean; origin: Map<Id, { x: number; y: number }> };

function Map() {
  const store = useStore();
  const ws = useWorkspace();
  const shell = useShell();
  const commands = useCommands();
  const flow = useReactFlow();
  const { pageId, selectedId } = shell;
  const [selectedBridge, setSelectedBridge] = useState<Id | null>(null);
  const [nodes, setNodes] = useState<IslandFlowNode[]>([]);
  const drag = useRef<Drag | null>(null);
  const page = ws.pages.find((p) => p.id === pageId);

  // Modelden gelen düğümler. Sürükleme sürerken yerel konumları ezmemek için beklenir.
  useEffect(() => {
    if (!pageId || drag.current) return;
    setNodes(buildNodes(ws, pageId, selectedId));
  }, [ws, pageId, selectedId]);

  const edges = useMemo(() => (pageId ? buildEdges(ws, pageId, selectedBridge) : []), [ws, pageId, selectedBridge]);

  const flyTo = useCallback(
    (id: Id) => {
      const island = store.getSnapshot().islands[id];
      if (!island) return;
      flow.setCenter(island.x, island.y, { zoom: Math.max(flow.getZoom(), 0.9), duration: 450 });
    },
    [flow, store],
  );

  useEffect(() => {
    shell.registerFly(flyTo);
    return () => shell.registerFly(null);
  }, [shell, flyTo]);

  // Sayfa değişince o sayfanın son görünümüne dön, yoksa bütün adaları sığdır.
  useEffect(() => {
    if (!pageId) return;
    const frame = requestAnimationFrame(() => {
      const pending = shell.takePendingFly();
      const vp = store.getSnapshot().pages.find((p) => p.id === pageId)?.viewport;
      if (vp) flow.setViewport(vp);
      else flow.fitView({ padding: 0.3, maxZoom: 1 });
      if (pending) flyTo(pending);
    });
    return () => cancelAnimationFrame(frame);
    // Sadece sayfa değiştiğinde çalışmalı.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId]);

  const onMoveEnd = useCallback(
    (_: unknown, vp: Viewport) => {
      if (pageId) store.actions.setPageViewport(pageId, { x: Math.round(vp.x), y: Math.round(vp.y), zoom: +vp.zoom.toFixed(3) });
    },
    [pageId, store],
  );

  const onNodesChange = useCallback((changes: NodeChange<IslandFlowNode>[]) => {
    setNodes((current) => {
      let next = applyNodeChanges(changes, current);
      const d = drag.current;
      const moved = d && changes.find((c) => c.type === "position" && c.id === d.id && c.position);
      if (d && d.moveSatellites && moved && moved.type === "position" && moved.position) {
        const o = d.origin.get(d.id)!;
        const dx = moved.position.x - o.x;
        const dy = moved.position.y - o.y;
        next = next.map((n) => {
          const start = n.id !== d.id ? d.origin.get(n.id) : undefined;
          return start ? { ...n, position: { x: start.x + dx, y: start.y + dy } } : n;
        });
      }
      return next;
    });
  }, []);

  const onNodeDragStart = useCallback(
    (event: MouseEvent | TouchEvent, node: IslandFlowNode) => {
      const moveSatellites = !event.altKey; // Alt ile sürüklenirse uydular yerinde kalır.
      const ids = new Set([node.id, ...(moveSatellites ? descendantIds(store.getSnapshot(), node.id) : [])]);
      const origin = new globalThis.Map<Id, { x: number; y: number }>();
      for (const n of nodes) if (ids.has(n.id)) origin.set(n.id, { ...n.position });
      drag.current = { id: node.id, moveSatellites, origin };
      shell.select(node.id);
      setSelectedBridge(null);
    },
    [nodes, shell, store],
  );

  const onNodeDragStop = useCallback(
    (_: MouseEvent | TouchEvent, node: IslandFlowNode) => {
      const d = drag.current;
      drag.current = null;
      if (!d) return;
      const size = islandSize(node.data.depth);
      store.checkpoint();
      store.actions.moveIsland(node.id, node.position.x + size.w / 2, node.position.y + size.h / 2, d.moveSatellites);
      store.checkpoint();
    },
    [store],
  );

  const onConnect = useCallback(
    (c: Connection) => {
      if (c.source && c.target) commands.connect(c.source, c.target);
    },
    [commands],
  );

  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!pageId || !(e.target as Element).classList.contains("react-flow__pane")) return;
      const p = flow.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      commands.addRoot(pageId, p.x, p.y);
    },
    [pageId, flow, commands],
  );

  // Klavye: Tab uydu, Delete sil, Esc seçimi bırak, ⌘Z / ⇧⌘Z geri al / yinele.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) store.redo();
        else store.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        store.redo();
        return;
      }
      if (e.key === "Tab" && selectedId && store.getSnapshot().islands[selectedId]?.pageId) {
        e.preventDefault();
        const id = commands.addSatellite(selectedId);
        requestAnimationFrame(() => flyTo(id));
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedBridge) {
          e.preventDefault();
          commands.disconnect(selectedBridge);
          setSelectedBridge(null);
        } else if (selectedId) {
          e.preventDefault();
          commands.deleteIsland(selectedId);
        }
        return;
      }
      if (e.key === "Escape") {
        shell.select(null);
        setSelectedBridge(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, selectedBridge, store, commands, shell, flyTo]);

  if (!page) return null;
  const empty = nodes.length === 0;

  return (
    <div className="ark-map" onDoubleClick={onDoubleClick}>
      <ReactFlow<IslandFlowNode, SeaFlowEdge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={(_, n) => {
          shell.select(n.id);
          setSelectedBridge(null);
        }}
        onEdgeClick={(_, e) => {
          if (e.data?.kind !== "bridge") return;
          setSelectedBridge(e.id);
          shell.select(null);
        }}
        onPaneClick={() => {
          shell.select(null);
          setSelectedBridge(null);
        }}
        onConnect={onConnect}
        isValidConnection={(c) => c.source !== c.target}
        connectionMode={ConnectionMode.Loose}
        connectionRadius={70}
        onMoveEnd={onMoveEnd}
        zoomOnDoubleClick={false}
        deleteKeyCode={null}
        selectionKeyCode={null}
        multiSelectionKeyCode={null}
        minZoom={0.15}
        maxZoom={2.5}
        attributionPosition="bottom-left"
        aria-label={`${page.title} haritası`}
      >
        <Background variant={BackgroundVariant.Lines} gap={80} lineWidth={0.6} color="var(--contour)" />
        <MiniMap className="ark-minimap" pannable zoomable nodeBorderRadius={40} ariaLabel="Mini harita" />
        <Controls className="ark-controls" showInteractive={false} position="top-right" />
      </ReactFlow>

      {empty && (
        <div className="ark-empty">
          <p>Bu sayfa boş.</p>
          <p className="ark-muted">Haritada boş bir yere çift tıkla ya da buradan başla.</p>
          <button type="button" className="btn btn--small" onClick={() => pageId && commands.addRoot(pageId, 0, 0)}>
            İlk adayı oluştur
          </button>
        </div>
      )}

      <p className="ark-hint" aria-hidden="true">
        Çift tık: ada · Tab: uydu · Kenardaki noktadan sürükle: köprü · Alt+sürükle: uydular yerinde kalsın
      </p>
    </div>
  );
}

export function MapView() {
  return (
    <ReactFlowProvider>
      <Map />
    </ReactFlowProvider>
  );
}
