"use client";

// Bir ada seçmek için arama kutulu liste: köprü kurmak, ebeveyn değiştirmek, limandan yerleştirmek.

import { useEffect, useMemo, useRef, useState } from "react";
import { useWorkspace } from "../WorkspaceProvider";
import { ancestry, displayTitle, pageTitle } from "../model/selectors";
import type { Id, Island } from "../model/types";

type Props = {
  title: string;
  filter: (island: Island) => boolean;
  onPick: (id: Id) => void;
  onClose: () => void;
  /** Listenin başında gösterilecek ek seçenek, ör. "Ana ada yap". */
  extra?: { label: string; run: () => void };
};

const norm = (s: string) => s.toLocaleLowerCase("tr");

export function IslandPicker({ title, filter, onPick, onClose, extra }: Props) {
  const ws = useWorkspace();
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => input.current?.focus(), []);

  const items = useMemo(() => {
    const query = norm(q.trim());
    return Object.values(ws.islands)
      .filter(filter)
      .filter((i) => !query || norm(displayTitle(i)).includes(query))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 50);
  }, [ws, q, filter]);

  return (
    <div className="ark-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ark-dialog" role="dialog" aria-modal="true" aria-label={title}
        onKeyDown={(e) => e.key === "Escape" && onClose()}>
        <div className="ark-dialog-head">
          <h2>{title}</h2>
          <button type="button" className="ark-icon-btn" onClick={onClose} aria-label="Kapat">✕</button>
        </div>
        <input ref={input} className="input" placeholder="Ada ara…" value={q} onChange={(e) => setQ(e.target.value)}
          aria-label="Ada ara" />
        <ul className="ark-list" role="listbox" aria-label="Adalar">
          {extra && (
            <li>
              <button type="button" className="ark-list-item ark-list-item--extra" onClick={extra.run}>{extra.label}</button>
            </li>
          )}
          {items.map((i) => (
            <li key={i.id}>
              <button type="button" className="ark-list-item" onClick={() => onPick(i.id)}>
                <span className="ark-list-title">{displayTitle(i)}</span>
                <span className="ark-list-meta">
                  {[pageTitle(ws, i.pageId), ...ancestry(ws, i.id).slice(0, -1).map(displayTitle)].join(" › ")}
                </span>
              </button>
            </li>
          ))}
          {!items.length && <li className="ark-muted ark-list-empty">Eşleşen ada yok.</li>}
        </ul>
      </div>
    </div>
  );
}
