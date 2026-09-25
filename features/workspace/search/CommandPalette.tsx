"use client";

// ⌘K / Ctrl+K: bütün sayfalarda ve limanda başlık ve defter içeriğinde arar, seçilen adaya uçar.

import { useEffect, useMemo, useRef, useState } from "react";
import { useStore, useWorkspace } from "../WorkspaceProvider";
import { fragmentText } from "../model/notes";
import { ancestry, displayTitle, pageTitle } from "../model/selectors";
import type { Id } from "../model/types";
import { useShell } from "../shell/ShellContext";
import { useCommands } from "../shell/useCommands";

type Result =
  | { kind: "island"; id: Id; title: string; where: string; snippet: string }
  | { kind: "command"; id: string; title: string; run: () => void };

const norm = (s: string) => s.toLocaleLowerCase("tr");

function snippetAround(text: string, query: string) {
  const i = norm(text).indexOf(query);
  if (i < 0) return text.slice(0, 90);
  const start = Math.max(0, i - 30);
  return (start > 0 ? "…" : "") + text.slice(start, i + query.length + 60).replace(/\n/g, " ");
}

export function CommandPalette() {
  const shell = useShell();
  const ws = useWorkspace();
  const store = useStore();
  const commands = useCommands();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (shell.searchOpen) {
      setQ("");
      setActive(0);
      requestAnimationFrame(() => input.current?.focus());
    }
  }, [shell.searchOpen]);

  // Defter metinleri palet açılınca bir kez okunur.
  const texts = useMemo(() => {
    if (!shell.searchOpen) return new Map<Id, string>();
    const m = new Map<Id, string>();
    for (const id of Object.keys(ws.islands)) m.set(id, fragmentText(store.collections.notes.get(id)));
    return m;
  }, [shell.searchOpen, ws, store]);

  const results = useMemo<Result[]>(() => {
    const query = norm(q.trim());
    const cmds: Result[] = [
      { kind: "command", id: "note", title: "Limana hızlı not", run: () => { commands.newHarborNote(); shell.setHarborOpen(true); } },
      { kind: "command", id: "harbor", title: "Limanı aç", run: () => shell.setHarborOpen(true) },
      {
        kind: "command",
        id: "page",
        title: "Yeni sayfa",
        run: () => shell.setPageId(store.actions.createPage("Yeni sayfa")),
      },
    ];
    const islands = Object.values(ws.islands)
      .map((i) => {
        const title = displayTitle(i);
        const body = texts.get(i.id) ?? "";
        const inTitle = !query || norm(title).includes(query);
        const inBody = !!query && norm(body).includes(query);
        if (!inTitle && !inBody) return null;
        return {
          score: (inTitle ? 2 : 0) + (inBody ? 1 : 0) + i.updatedAt / 1e15,
          r: {
            kind: "island" as const,
            id: i.id,
            title,
            where: [pageTitle(ws, i.pageId), ...ancestry(ws, i.id).slice(0, -1).map(displayTitle)].join(" › "),
            snippet: inBody ? snippetAround(body, query) : body.slice(0, 90).replace(/\n/g, " "),
          },
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30)
      .map((x) => x.r);
    const matchingCmds = cmds.filter((c) => !query || norm(c.title).includes(query));
    return query ? [...islands, ...matchingCmds] : [...matchingCmds, ...islands];
  }, [q, ws, texts, commands, shell, store]);

  if (!shell.searchOpen) return null;

  const close = () => shell.setSearchOpen(false);
  const run = (r: Result) => {
    close();
    if (r.kind === "command") return r.run();
    const island = ws.islands[r.id];
    if (island?.pageId === null) shell.setHarborOpen(true);
    shell.goTo(r.id);
    if (island?.pageId === null) shell.select(r.id);
  };

  return (
    <div className="ark-overlay ark-overlay--top" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="ark-dialog ark-palette" role="dialog" aria-modal="true" aria-label="Ara">
        <input
          ref={input}
          className="input ark-palette-input"
          placeholder="Ada, not ya da komut ara…"
          value={q}
          aria-label="Ara"
          aria-controls="ark-palette-list"
          aria-activedescendant={results[active] ? `pal-${active}` : undefined}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
            else if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" && results[active]) {
              e.preventDefault();
              run(results[active]);
            }
          }}
        />
        <ul id="ark-palette-list" className="ark-list" role="listbox" aria-label="Sonuçlar">
          {results.map((r, i) => (
            <li key={`${r.kind}-${r.id}`} id={`pal-${i}`} role="option" aria-selected={i === active}>
              <button type="button" className="ark-list-item" data-active={i === active} onMouseEnter={() => setActive(i)} onClick={() => run(r)}>
                {r.kind === "island" ? (
                  <>
                    <span className="ark-list-title">{r.title}</span>
                    <span className="ark-list-meta">{r.where}</span>
                    {r.snippet && <span className="ark-list-snippet">{r.snippet}</span>}
                  </>
                ) : (
                  <span className="ark-list-title ark-list-title--cmd">{r.title}</span>
                )}
              </button>
            </li>
          ))}
          {!results.length && <li className="ark-muted ark-list-empty">Sonuç yok.</li>}
        </ul>
      </div>
    </div>
  );
}
