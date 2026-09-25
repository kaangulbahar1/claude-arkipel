// Çalışma alanını değiştiren tek yer. Her aksiyon tek bir Yjs işleminde (transaction) çalışır,
// böylece geri alma tek adımda yapılır ve senkron eklendiğinde değişiklikler bütün halinde gider.
//
// Kurallar:
// - Uydu her zaman ebeveyniyle aynı sayfadadır.
// - Bir ada silinince uyduları onun ebeveynine bağlanır; hiçbir not kendiliğinden kaybolmaz.
// - Döngü oluşturan ebeveyn atamaları reddedilir.

import * as Y from "yjs";
import { type Collections, LOCAL, readBridge, readIsland, readPage, toYMap } from "./doc";
import { type Block, writeBlocks } from "./notes";
import { bridgeBetween, childrenOf, descendantIds, satellitePosition } from "./selectors";
import type { Bridge, Id, Island, Viewport, Workspace } from "./types";

/** Harita görünümü değişiklikleri geri alma geçmişine girmez. */
export const VIEW = Symbol("arkipel-view");

export type ActionDeps = {
  now?: () => number;
  newId?: () => Id;
};

export function readWorkspace(c: Collections): Workspace {
  const pages = [...c.pages.values()].map(readPage).sort((a, b) => a.order - b.order || a.createdAt - b.createdAt);
  const islands: Record<Id, Island> = {};
  for (const m of c.islands.values()) {
    const i = readIsland(m);
    islands[i.id] = i;
  }
  const bridges: Bridge[] = [...c.bridges.values()].map(readBridge).filter((b) => islands[b.from] && islands[b.to]);
  return { pages, islands, bridges };
}

export function createActions(c: Collections, deps: ActionDeps = {}) {
  const now = deps.now ?? (() => Date.now());
  const newId = deps.newId ?? (() => crypto.randomUUID());
  const tx = <T,>(fn: () => T, origin: unknown = LOCAL): T => {
    let out!: T;
    c.doc.transact(() => {
      out = fn();
    }, origin);
    return out;
  };
  const ws = () => readWorkspace(c);
  const island = (id: Id) => c.islands.get(id);
  const touch = (m: Y.Map<unknown>) => m.set("updatedAt", now());

  function removeIslandInternal(id: Id) {
    for (const [bid, b] of c.bridges.entries()) {
      if (b.get("from") === id || b.get("to") === id) c.bridges.delete(bid);
    }
    c.notes.delete(id);
    c.islands.delete(id);
  }

  const actions = {
    // Sayfalar

    createPage(title: string): Id {
      return tx(() => {
        const id = newId();
        const order = Math.max(0, ...[...c.pages.values()].map((p) => (p.get("order") as number) ?? 0)) + 1;
        c.pages.set(id, toYMap({ id, title: title.trim() || "Yeni sayfa", order, createdAt: now() }));
        return id;
      });
    },

    renamePage(id: Id, title: string) {
      tx(() => c.pages.get(id)?.set("title", title));
    },

    /** Sekmeleri verilen sıraya dizer. */
    reorderPages(ids: Id[]) {
      tx(() => ids.forEach((id, i) => c.pages.get(id)?.set("order", i + 1)));
    },

    /** Sayfayı ve üzerindeki bütün adaları siler. */
    deletePage(id: Id) {
      tx(() => {
        for (const i of Object.values(ws().islands)) if (i.pageId === id) removeIslandInternal(i.id);
        c.pages.delete(id);
      });
    },

    setPageViewport(id: Id, viewport: Viewport) {
      tx(() => c.pages.get(id)?.set("viewport", viewport), VIEW);
    },

    // Adalar

    /**
     * Yeni ada. `parentId` verilirse uydu olur, ebeveyninin sayfasına konur ve konum verilmemişse
     * ebeveyninin etrafına yerleştirilir.
     */
    createIsland(input: { pageId: Id | null; parentId?: Id | null; title?: string; x?: number; y?: number; blocks?: Block[] }): Id {
      return tx(() => {
        const snapshot = ws();
        const parent = input.parentId ? snapshot.islands[input.parentId] : undefined;
        if (input.parentId && !parent) throw new Error("Ebeveyn ada bulunamadı.");
        const pos = parent && (input.x === undefined || input.y === undefined) ? satellitePosition(snapshot, parent.id) : null;
        const id = newId();
        const t = now();
        c.islands.set(
          id,
          toYMap({
            id,
            pageId: parent ? parent.pageId : input.pageId,
            parentId: parent?.id ?? null,
            title: input.title ?? "",
            x: Math.round(input.x ?? pos?.x ?? 0),
            y: Math.round(input.y ?? pos?.y ?? 0),
            createdAt: t,
            updatedAt: t,
          }),
        );
        if (input.blocks?.length) {
          const frag = new Y.XmlFragment();
          c.notes.set(id, frag);
          writeBlocks(frag, input.blocks);
        }
        return id;
      });
    },

    renameIsland(id: Id, title: string) {
      tx(() => {
        const m = island(id);
        if (!m) return;
        m.set("title", title);
        touch(m);
      });
    },

    /** Adayı taşır; `withSatellites` açıksa bütün uydu ağacı da aynı miktarda kayar. */
    moveIsland(id: Id, x: number, y: number, withSatellites = true) {
      tx(() => {
        const m = island(id);
        if (!m) return;
        const dx = Math.round(x) - ((m.get("x") as number) ?? 0);
        const dy = Math.round(y) - ((m.get("y") as number) ?? 0);
        if (!dx && !dy) return;
        const ids = withSatellites ? [id, ...descendantIds(ws(), id)] : [id];
        for (const iid of ids) {
          const n = island(iid);
          if (!n) continue;
          n.set("x", ((n.get("x") as number) ?? 0) + dx);
          n.set("y", ((n.get("y") as number) ?? 0) + dy);
        }
      });
    },

    /** Uyduyu başka bir adaya bağlar ya da `null` ile ana ada yapar. */
    setParent(id: Id, parentId: Id | null) {
      tx(() => {
        const snapshot = ws();
        const self = snapshot.islands[id];
        if (!self) return;
        if (parentId !== null) {
          const parent = snapshot.islands[parentId];
          if (!parent) throw new Error("Ebeveyn ada bulunamadı.");
          if (parentId === id || descendantIds(snapshot, id).includes(parentId)) {
            throw new Error("Bir ada kendi uydusunun uydusu olamaz.");
          }
          if (parent.pageId !== self.pageId) throw new Error("Ebeveyn ada aynı sayfada olmalı.");
        }
        const m = island(id)!;
        m.set("parentId", parentId);
        touch(m);
      });
    },

    /**
     * Adayı (ve uydu ağacını) bir sayfaya yerleştirir. Limandan haritaya almak ya da başka
     * sayfaya taşımak için. Konum ada için verilir; uydular aynı göreli düzeni korur.
     */
    placeIsland(id: Id, pageId: Id, x: number, y: number, parentId: Id | null = null) {
      tx(() => {
        const snapshot = ws();
        const self = snapshot.islands[id];
        if (!self || !c.pages.get(pageId)) return;
        if (parentId && (parentId === id || descendantIds(snapshot, id).includes(parentId))) {
          throw new Error("Bir ada kendi uydusunun uydusu olamaz.");
        }
        const dx = Math.round(x) - self.x;
        const dy = Math.round(y) - self.y;
        for (const iid of [id, ...descendantIds(snapshot, id)]) {
          const n = island(iid)!;
          n.set("pageId", pageId);
          n.set("x", ((n.get("x") as number) ?? 0) + dx);
          n.set("y", ((n.get("y") as number) ?? 0) + dy);
        }
        const m = island(id)!;
        m.set("parentId", parentId);
        touch(m);
      });
    },

    /** Adayı haritadan kaldırıp limana gönderir. Uyduları haritada kalır, onun ebeveynine bağlanır. */
    sendToHarbor(id: Id) {
      tx(() => {
        const snapshot = ws();
        const self = snapshot.islands[id];
        if (!self) return;
        for (const child of childrenOf(snapshot, id)) island(child.id)?.set("parentId", self.parentId);
        const m = island(id)!;
        m.set("pageId", null);
        m.set("parentId", null);
        touch(m);
      });
    },

    /** Adayı ve defterini siler. Uyduları silinen adanın ebeveynine bağlanır. */
    deleteIsland(id: Id) {
      tx(() => {
        const snapshot = ws();
        const self = snapshot.islands[id];
        if (!self) return;
        for (const child of childrenOf(snapshot, id)) island(child.id)?.set("parentId", self.parentId);
        removeIslandInternal(id);
      });
    },

    // Köprüler

    /** İki adayı bağlar. Aynı ada, zaten var olan köprü ya da doğrudan ebeveyn-uydu çifti için `null` döner. */
    connect(a: Id, b: Id): Id | null {
      return tx(() => {
        const snapshot = ws();
        const A = snapshot.islands[a];
        const B = snapshot.islands[b];
        if (!A || !B || a === b) return null;
        if (A.parentId === b || B.parentId === a) return null;
        const existing = bridgeBetween(snapshot, a, b);
        if (existing) return existing.id;
        const id = newId();
        c.bridges.set(id, toYMap({ id, from: a, to: b, createdAt: now() }));
        return id;
      });
    },

    disconnect(bridgeId: Id) {
      tx(() => c.bridges.delete(bridgeId));
    },

    // Defter

    /** Adanın defterini döner, yoksa oluşturur. Editör bağlanmadan önce çağrılır. */
    ensureNote(id: Id): Y.XmlFragment {
      const existing = c.notes.get(id);
      if (existing) return existing;
      return tx(() => {
        const frag = new Y.XmlFragment();
        c.notes.set(id, frag);
        return frag;
      }, VIEW);
    },

    touchIsland(id: Id) {
      tx(() => {
        const m = island(id);
        if (m) touch(m);
      }, VIEW);
    },
  };

  return actions;
}

export type Actions = ReturnType<typeof createActions>;
