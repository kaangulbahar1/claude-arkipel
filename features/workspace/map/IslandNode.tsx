"use client";

import { Handle, type Node, type NodeProps, Position, useStore as useFlowStore } from "@xyflow/react";
import { memo } from "react";
import { islandPath, seedFrom } from "@/lib/island-shape";
import type { Id } from "../model/types";
import { islandSize } from "./geometry";

export type IslandNodeData = {
  islandId: Id;
  title: string;
  depth: number;
  satellites: number;
  /** Başka sayfalardaki adalara giden köprü sayısı. */
  farBridges: number;
};

export type IslandFlowNode = Node<IslandNodeData, "island">;

// Uzaklaştıkça önce derin uyduların, sonra bütün uyduların adı gizlenir.
const zoomLevel = (z: number) => (z < 0.55 ? 0 : z < 0.85 ? 1 : 2);

function IslandNodeView({ data, selected }: NodeProps<IslandFlowNode>) {
  const level = useFlowStore((s) => zoomLevel(s.transform[2]));
  const { w, h } = islandSize(data.depth);
  const seed = seedFrom(data.islandId);
  const showLabel = data.depth === 0 || level >= Math.min(data.depth, 2);
  const title = data.title.trim() || "Adsız ada";

  return (
    <div className="ark-node" data-depth={Math.min(data.depth, 2)} data-selected={selected} style={{ width: w, height: h }}>
      <svg className="ark-node-shape" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
        <path className="ark-node-contour" d={islandPath(w / 2, h / 2, w / 2 - 2, h / 2 - 2, seed, 0.98)} />
        <path className="ark-node-land" d={islandPath(w / 2, h / 2, w / 2 - 2, h / 2 - 2, seed, 0.8)} />
      </svg>
      {showLabel && (
        <span className="ark-node-label" title={title}>
          {title}
        </span>
      )}
      {!showLabel && data.satellites > 0 && <span className="ark-node-count">{data.satellites}</span>}
      {data.farBridges > 0 && (
        <span className="ark-node-far" title={`Başka sayfalara ${data.farBridges} köprü`}>
          ↗{data.farBridges}
        </span>
      )}
      {selected && (
        <svg className="ark-node-pin" width="22" height="30" viewBox="-11 0 22 30" aria-hidden="true">
          <path d="M0 0c-6 0-11 5-11 11 0 8 11 19 11 19s11-11 11-19C11 5 6 0 0 0z" />
          <circle cx="0" cy="11" r="4" />
        </svg>
      )}
      {/* Köprü kurmak için sürüklenen nokta; bırakılan adanın ortasındaki görünmez hedefe bağlanır. */}
      <Handle type="source" position={Position.Right} className="ark-handle" title="Sürükleyip başka bir adaya bırak: köprü kur" />
      <Handle type="target" position={Position.Top} className="ark-target" isConnectableStart={false} />
    </div>
  );
}

export const IslandNode = memo(IslandNodeView);
