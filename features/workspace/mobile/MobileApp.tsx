"use client";

// Telefonda harita yerine sade bir not uygulaması: sayfalar, ada ağacı, tam ekran defter ve hızlı not.
// Veri modeli masaüstüyle aynı; telefonda alınan hızlı notlar limana düşer.

import { useState } from "react";
import { useStore, useWorkspace } from "../WorkspaceProvider";
import { HarborList } from "../harbor/Harbor";
import { childrenOf, displayTitle, freeSpot, harborIslands, rootsOf } from "../model/selectors";
import type { Id, Workspace } from "../model/types";
import { Notebook } from "../notebook/Notebook";
import { useShell } from "../shell/ShellContext";
import { useCommands } from "../shell/useCommands";

type Tab = "pages" | "harbor";

export function MobileApp() {
  const ws = useWorkspace();
  const shell = useShell();
  const commands = useCommands();
  const [tab, setTab] = useState<Tab>("pages");
  const selected = shell.selectedId ? ws.islands[shell.selectedId] : undefined;
  const harborCount = harborIslands(ws).length;

  if (selected) {
    return (
      <div className="ark-m">
        <Notebook islandId={selected.id} variant="page" onClose={() => shell.select(null)} />
      </div>
    );
  }

  return (
    <div className="ark-m">
      <header className="ark-m-top">
        <h1>{tab === "pages" ? "Adalar" : "⚓ Liman"}</h1>
        <button type="button" className="ark-icon-btn" onClick={() => shell.setSearchOpen(true)} aria-label="Ara">⌕</button>
      </header>

      <main className="ark-m-body">{tab === "pages" ? <PagesView /> : <HarborList />}</main>

      <button type="button" className="ark-fab" onClick={() => commands.newHarborNote()} aria-label="Hızlı not: limana yeni not">
        + Not
      </button>

      <nav className="ark-m-nav" aria-label="Bölümler">
        <button type="button" aria-current={tab === "pages" ? "page" : undefined} onClick={() => setTab("pages")}>Sayfalar</button>
        <button type="button" aria-current={tab === "harbor" ? "page" : undefined} onClick={() => setTab("harbor")}>
          Liman{harborCount > 0 && <span className="ark-badge">{harborCount}</span>}
        </button>
      </nav>
    </div>
  );
}

function PagesView() {
  const ws = useWorkspace();
  const store = useStore();
  const shell = useShell();
  const page = ws.pages.find((p) => p.id === shell.pageId);

  return (
    <>
      <div className="ark-m-pages" role="tablist" aria-label="Sayfalar">
        {ws.pages.map((p) => (
          <button key={p.id} type="button" role="tab" className="ark-m-page" aria-selected={p.id === shell.pageId}
            onClick={() => shell.setPageId(p.id)}>
            {p.title}
          </button>
        ))}
        <button type="button" className="ark-m-page ark-m-page--add" aria-label="Yeni sayfa"
          onClick={() => shell.setPageId(store.actions.createPage("Yeni sayfa"))}>+</button>
      </div>

      {page ? (
        <>
          <ul className="ark-tree" aria-label={`${page.title} adaları`}>
            {rootsOf(ws, page.id).map((r) => <TreeRow key={r.id} ws={ws} id={r.id} depth={0} />)}
          </ul>
          <button
            type="button"
            className="btn btn--ghost btn--small ark-m-add"
            onClick={() => {
              const spot = freeSpot(ws, page.id);
              store.checkpoint();
              shell.select(store.actions.createIsland({ pageId: page.id, x: spot.x, y: spot.y }));
            }}
          >
            + Ana ada
          </button>
        </>
      ) : (
        <p className="ark-muted ark-list-empty">Henüz sayfa yok.</p>
      )}
    </>
  );
}

function TreeRow({ ws, id, depth }: { ws: Workspace; id: Id; depth: number }) {
  const shell = useShell();
  const kids = childrenOf(ws, id);
  const [open, setOpen] = useState(depth < 1);
  const island = ws.islands[id];
  return (
    <li className="ark-tree-item" style={{ ["--depth" as string]: depth }}>
      <div className="ark-tree-row">
        {kids.length > 0 ? (
          <button type="button" className="ark-tree-toggle" aria-expanded={open}
            aria-label={`${displayTitle(island)} uydularını ${open ? "gizle" : "göster"}`} onClick={() => setOpen(!open)}>
            {open ? "▾" : "▸"}
          </button>
        ) : (
          <span className="ark-tree-toggle" aria-hidden="true">·</span>
        )}
        <button type="button" className="ark-tree-title" data-depth={Math.min(depth, 2)} onClick={() => shell.select(id)}>
          {displayTitle(island)}
          {kids.length > 0 && <span className="ark-muted"> · {kids.length}</span>}
        </button>
      </div>
      {open && kids.length > 0 && (
        <ul>
          {kids.map((k) => <TreeRow key={k.id} ws={ws} id={k.id} depth={depth + 1} />)}
        </ul>
      )}
    </li>
  );
}
