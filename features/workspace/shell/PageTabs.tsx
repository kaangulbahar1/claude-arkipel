"use client";

// Sayfa sekmeleri: tıkla aç, çift tıkla yeniden adlandır, "+" yeni sayfa, "⋯" menüsü.

import { useEffect, useRef, useState } from "react";
import { useStore, useWorkspace } from "../WorkspaceProvider";
import { pageIslands } from "../model/selectors";
import type { Id } from "../model/types";
import { useShell } from "./ShellContext";

export function PageTabs() {
  const ws = useWorkspace();
  const store = useStore();
  const shell = useShell();
  const [editing, setEditing] = useState<Id | null>(null);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false);
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [menu]);

  const pages = ws.pages;
  const idx = pages.findIndex((p) => p.id === shell.pageId);
  const active = pages[idx];

  const move = (dir: -1 | 1) => {
    const ids = pages.map((p) => p.id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= ids.length) return;
    [ids[idx], ids[j]] = [ids[j], ids[idx]];
    store.checkpoint();
    store.actions.reorderPages(ids);
    setMenu(false);
  };

  const remove = () => {
    if (!active) return;
    const count = pageIslands(ws, active.id).length;
    store.checkpoint();
    store.actions.deletePage(active.id);
    store.checkpoint();
    setMenu(false);
    shell.notify(`"${active.title}" sayfası${count ? ` ve ${count} ada` : ""} silindi.`, { label: "Geri al", run: () => store.undo() });
  };

  const create = () => {
    store.checkpoint();
    const id = store.actions.createPage("Yeni sayfa");
    shell.setPageId(id);
    shell.select(null);
    setEditing(id);
  };

  return (
    <div className="ark-tabs" role="tablist" aria-label="Sayfalar">
      {pages.map((p) => (
        <div key={p.id} className="ark-tab-wrap">
          {editing === p.id ? (
            <input
              className="ark-tab ark-tab-input"
              defaultValue={p.title}
              autoFocus
              aria-label="Sayfa adı"
              onFocus={(e) => e.currentTarget.select()}
              onBlur={(e) => {
                store.actions.renamePage(p.id, e.currentTarget.value.trim() || p.title);
                setEditing(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") setEditing(null);
              }}
            />
          ) : (
            <button
              type="button"
              role="tab"
              aria-selected={p.id === shell.pageId}
              className="ark-tab"
              onClick={() => {
                if (p.id !== shell.pageId) shell.select(null);
                shell.setPageId(p.id);
              }}
              onDoubleClick={() => setEditing(p.id)}
            >
              {p.title}
            </button>
          )}
        </div>
      ))}
      <button type="button" className="ark-tab ark-tab--add" onClick={create} aria-label="Yeni sayfa" title="Yeni sayfa">+</button>

      {active && (
        <div className="ark-menu-wrap" ref={menuRef}>
          <button type="button" className="ark-icon-btn" aria-haspopup="menu" aria-expanded={menu}
            aria-label={`${active.title} sayfası seçenekleri`} onClick={() => setMenu((m) => !m)}>⋯</button>
          {menu && (
            <div className="ark-menu" role="menu">
              <button type="button" role="menuitem" onClick={() => { setEditing(active.id); setMenu(false); }}>Yeniden adlandır</button>
              <button type="button" role="menuitem" disabled={idx <= 0} onClick={() => move(-1)}>Sola taşı</button>
              <button type="button" role="menuitem" disabled={idx >= pages.length - 1} onClick={() => move(1)}>Sağa taşı</button>
              <button type="button" role="menuitem" className="is-danger" onClick={remove}>Sayfayı sil</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
