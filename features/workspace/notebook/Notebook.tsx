"use client";

// Seçili adanın defteri: nerede olduğun (yol), başlık, metin, uydular, köprüler ve ada işlemleri.
// Masaüstünde haritanın yanında panel, mobilde tam ekran sayfa olarak kullanılır.

import { useCallback, useEffect, useRef, useState } from "react";
import type * as Y from "yjs";
import { useStore, useWorkspace } from "../WorkspaceProvider";
import {
  ancestry, bridgesOf, childrenOf, descendantIds, displayTitle, freeSpot, otherEnd, pageTitle, satellitePosition,
} from "../model/selectors";
import type { Id, Island } from "../model/types";
import { IslandPicker } from "../shell/IslandPicker";
import { useShell } from "../shell/ShellContext";
import { useCommands } from "../shell/useCommands";
import { NoteEditor } from "./NoteEditor";

type Picker = "bridge" | "parent" | "dock" | null;

export function Notebook({ islandId, variant = "panel", onClose }: { islandId: Id; variant?: "panel" | "page"; onClose?: () => void }) {
  const ws = useWorkspace();
  const store = useStore();
  const shell = useShell();
  const commands = useCommands();
  const island = ws.islands[islandId];
  const [picker, setPicker] = useState<Picker>(null);

  // Defter içeriği. Geri alma ile ada geri gelirse yeni bir fragment oluşur; editör ona yeniden bağlanır.
  const [note, setNote] = useState<{ id: Id; fragment: Y.XmlFragment } | null>(null);
  const exists = island !== undefined;
  useEffect(() => {
    if (!exists) return setNote(null);
    const fragment = store.collections.notes.get(islandId) ?? store.actions.ensureNote(islandId);
    setNote((cur) => (cur?.id === islandId && cur.fragment === fragment ? cur : { id: islandId, fragment }));
  }, [islandId, exists, store, ws]);
  // Ada değiştiği ilk çizimde önceki adanın defteri kullanılmasın.
  const fragment = note?.id === islandId ? note.fragment : null;

  const touchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onNoteChange = useCallback(() => {
    if (touchTimer.current) clearTimeout(touchTimer.current);
    touchTimer.current = setTimeout(() => store.actions.touchIsland(islandId), 1500);
  }, [islandId, store]);
  useEffect(() => () => {
    if (touchTimer.current) clearTimeout(touchTimer.current);
  }, [islandId]);

  if (!island) return null;

  const path = ancestry(ws, islandId);
  const satellites = childrenOf(ws, islandId);
  const bridges = bridgesOf(ws, islandId);
  const inHarbor = island.pageId === null;
  const currentPage = ws.pages.find((p) => p.id === shell.pageId);

  const dockToPage = (pageId: Id) => {
    const spot = freeSpot(ws, pageId);
    store.checkpoint();
    store.actions.placeIsland(islandId, pageId, spot.x, spot.y);
    shell.goTo(islandId);
  };
  const dockAsSatellite = (parentId: Id) => {
    const parent = ws.islands[parentId];
    if (!parent?.pageId) return;
    const pos = satellitePosition(ws, parentId);
    store.checkpoint();
    store.actions.placeIsland(islandId, parent.pageId, pos.x, pos.y, parentId);
    setPicker(null);
    shell.goTo(islandId);
  };
  const changeParent = (parentId: Id | null) => {
    try {
      store.checkpoint();
      store.actions.setParent(islandId, parentId);
      setPicker(null);
    } catch (err) {
      shell.notify(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <article className={`ark-notebook ark-notebook--${variant}`} aria-label={`${displayTitle(island)} defteri`}>
      <header className="ark-nb-head">
        {onClose && (
          <button type="button" className="ark-icon-btn" onClick={onClose} aria-label={variant === "page" ? "Geri" : "Defteri kapat"}>
            {variant === "page" ? "←" : "✕"}
          </button>
        )}
        <nav className="ark-crumbs" aria-label="Neredesin">
          <span className="ark-crumb ark-crumb--page">{inHarbor ? "⚓ Liman" : pageTitle(ws, island.pageId)}</span>
          {path.map((p) => (
            <span key={p.id} className="ark-crumb-wrap">
              <span className="ark-crumb-sep" aria-hidden="true">›</span>
              {p.id === islandId ? (
                <span className="ark-crumb" aria-current="location">{displayTitle(p)}</span>
              ) : (
                <button type="button" className="ark-crumb" onClick={() => shell.goTo(p.id)}>{displayTitle(p)}</button>
              )}
            </span>
          ))}
        </nav>
      </header>

      <div className="ark-nb-body">
        <TitleField island={island} onChange={(t) => store.actions.renameIsland(islandId, t)} />
        {fragment ? (
          <NoteEditor key={islandId} fragment={fragment} onChange={onNoteChange} />
        ) : (
          <div className="ark-prose ark-prose--loading" />
        )}

        {inHarbor ? (
          <section className="ark-nb-section">
            <h3 className="label">Haritaya yerleştir</h3>
            <div className="ark-row">
              {currentPage && (
                <button type="button" className="btn btn--small" onClick={() => dockToPage(currentPage.id)}>
                  {currentPage.title} sayfasına koy
                </button>
              )}
              <button type="button" className="btn btn--ghost btn--small" onClick={() => setPicker("dock")}>
                Bir adanın uydusu yap…
              </button>
            </div>
          </section>
        ) : (
          <section className="ark-nb-section">
            <div className="ark-nb-section-head">
              <h3 className="label">Uydular · {satellites.length}</h3>
              <button type="button" className="ark-link-btn" onClick={() => commands.addSatellite(islandId)}>+ Uydu ekle</button>
            </div>
            {satellites.length > 0 && (
              <ul className="ark-chips">
                {satellites.map((s) => (
                  <li key={s.id}>
                    <button type="button" className="ark-chip" onClick={() => shell.goTo(s.id)}>{displayTitle(s)}</button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section className="ark-nb-section">
          <div className="ark-nb-section-head">
            <h3 className="label">Köprüler · {bridges.length}</h3>
            <button type="button" className="ark-link-btn" onClick={() => setPicker("bridge")}>+ Köprü kur</button>
          </div>
          {bridges.length > 0 && (
            <ul className="ark-chips">
              {bridges.map((b) => {
                const other = ws.islands[otherEnd(b, islandId)];
                if (!other) return null;
                const far = other.pageId !== island.pageId;
                return (
                  <li key={b.id} className="ark-chip-row">
                    <button type="button" className="ark-chip" onClick={() => shell.goTo(other.id)}>
                      {far && <span className="ark-chip-page">{pageTitle(ws, other.pageId)} ›</span>} {displayTitle(other)}
                    </button>
                    <button type="button" className="ark-chip-x" aria-label={`${displayTitle(other)} köprüsünü kaldır`}
                      onClick={() => commands.disconnect(b.id)}>✕</button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <footer className="ark-nb-actions">
          {!inHarbor && (
            <>
              <button type="button" className="ark-link-btn" onClick={() => setPicker("parent")}>Başka adaya bağla…</button>
              <button type="button" className="ark-link-btn" onClick={() => commands.sendToHarbor(islandId)}>Limana gönder</button>
            </>
          )}
          <button type="button" className="ark-link-btn ark-link-btn--danger" onClick={() => commands.deleteIsland(islandId)}>Adayı sil</button>
        </footer>
      </div>

      {picker === "bridge" && (
        <IslandPicker
          title="Köprü kur"
          filter={(i) => i.id !== islandId && i.parentId !== islandId && island.parentId !== i.id && !bridges.some((b) => otherEnd(b, islandId) === i.id)}
          onPick={(id) => {
            commands.connect(islandId, id);
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === "parent" && (
        <IslandPicker
          title="Hangi adanın uydusu olsun?"
          filter={(i) => i.pageId === island.pageId && i.id !== islandId && i.id !== island.parentId && !descendantIds(ws, islandId).includes(i.id)}
          onPick={(id) => changeParent(id)}
          onClose={() => setPicker(null)}
          extra={island.parentId ? { label: "Ana ada yap", run: () => changeParent(null) } : undefined}
        />
      )}
      {picker === "dock" && (
        <IslandPicker
          title="Hangi adanın uydusu olsun?"
          filter={(i) => i.pageId !== null && i.id !== islandId}
          onPick={dockAsSatellite}
          onClose={() => setPicker(null)}
        />
      )}
    </article>
  );
}

/** Başlık alanı: yazarken anında kaydeder, dışarıdan gelen değişikliklerle (geri alma, başka cihaz) senkron kalır. */
function TitleField({ island, onChange }: { island: Island; onChange: (title: string) => void }) {
  const [value, setValue] = useState(island.title);
  const focused = useRef(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!focused.current) setValue(island.title);
  }, [island.title]);

  // Yeni ve adsız bir adaya geçilince başlığa odaklan.
  useEffect(() => {
    if (!island.title) ref.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [island.id]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      id={`title-${island.id}`}
      className="ark-title"
      rows={1}
      value={value}
      placeholder="Adsız ada"
      aria-label="Ada adı"
      onFocus={() => (focused.current = true)}
      onBlur={() => {
        focused.current = false;
        setValue(island.title);
      }}
      onChange={(e) => {
        const t = e.target.value.replace(/\n/g, " ");
        setValue(t);
        onChange(t);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.currentTarget.closest(".ark-notebook")?.querySelector(".ProseMirror") as HTMLElement | null)?.focus();
        }
      }}
    />
  );
}
