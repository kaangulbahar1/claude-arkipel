"use client";

// Liman: henüz haritaya yerleştirilmemiş notlar. Hızlı not buraya düşer.

import { useMemo } from "react";
import { useStore, useWorkspace } from "../WorkspaceProvider";
import { fragmentText } from "../model/notes";
import { displayTitle, harborIslands } from "../model/selectors";
import { useShell } from "../shell/ShellContext";
import { useCommands } from "../shell/useCommands";

export function HarborList({ onOpen }: { onOpen?: () => void }) {
  const ws = useWorkspace();
  const store = useStore();
  const shell = useShell();
  const commands = useCommands();
  const notes = harborIslands(ws);
  const excerpts = useMemo(
    () => new Map(notes.map((n) => [n.id, fragmentText(store.collections.notes.get(n.id)).slice(0, 140)])),
    [notes, store],
  );

  return (
    <div className="ark-harbor">
      <div className="ark-harbor-head">
        <p className="ark-muted">Haritaya henüz yerleştirmediğin notlar.</p>
        <button type="button" className="btn btn--small btn--accent" onClick={() => { commands.newHarborNote(); onOpen?.(); }}>
          + Hızlı not
        </button>
      </div>
      {notes.length ? (
        <ul className="ark-list">
          {notes.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                className="ark-list-item"
                data-active={shell.selectedId === n.id}
                onClick={() => {
                  shell.select(n.id);
                  onOpen?.();
                }}
              >
                <span className="ark-list-title">{displayTitle(n)}</span>
                {excerpts.get(n.id) && <span className="ark-list-snippet">{excerpts.get(n.id)}</span>}
                <span className="ark-list-meta">
                  {new Date(n.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ark-muted ark-list-empty">Liman boş. Aceleyle aldığın notlar burada bekler.</p>
      )}
    </div>
  );
}

export function HarborDrawer() {
  const shell = useShell();
  const count = harborIslands(useWorkspace()).length;
  if (!shell.harborOpen) return null;
  return (
    <aside className="ark-drawer" aria-label="Liman">
      <div className="ark-drawer-head">
        <h2>⚓ Liman <span className="ark-muted">· {count}</span></h2>
        <button type="button" className="ark-icon-btn" onClick={() => shell.setHarborOpen(false)} aria-label="Limanı kapat">✕</button>
      </div>
      <HarborList />
    </aside>
  );
}
