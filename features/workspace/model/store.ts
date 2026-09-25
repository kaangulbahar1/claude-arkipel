// Y.Doc'u React'e bağlayan depo: değişmez anlık görüntü, abonelik, geri alma ve kalıcılık.
// Senkron (hesap, cihazlar arası) eklendiğinde buraya bir Yjs sağlayıcısı (provider) takılacak;
// arayüzün geri kalanı değişmeyecek.

import * as Y from "yjs";
import { createActions, readWorkspace, type ActionDeps } from "./actions";
import { collections, type Collections, LOCAL, SCHEMA_VERSION } from "./doc";
import { seedWorkspace } from "./seed";
import type { Workspace } from "./types";

export type WorkspaceStore = ReturnType<typeof createWorkspaceStore>;

export function createWorkspaceStore(doc = new Y.Doc(), deps: ActionDeps = {}) {
  const c: Collections = collections(doc);
  const actions = createActions(c, deps);
  const undoManager = new Y.UndoManager([c.pages, c.islands, c.bridges, c.notes], {
    trackedOrigins: new Set([LOCAL]),
    captureTimeout: 400,
  });

  let snapshot: Workspace = readWorkspace(c);
  let dirty = false;
  const listeners = new Set<() => void>();

  const onUpdate = () => {
    dirty = true;
    listeners.forEach((l) => l());
  };
  doc.on("update", onUpdate);
  undoManager.on("stack-item-added", onUpdate);
  undoManager.on("stack-item-popped", onUpdate);

  return {
    doc,
    collections: c,
    actions,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot(): Workspace {
      if (dirty) {
        snapshot = readWorkspace(c);
        dirty = false;
      }
      return snapshot;
    },
    undo: () => undoManager.undo(),
    redo: () => undoManager.redo(),
    canUndo: () => undoManager.canUndo(),
    canRedo: () => undoManager.canRedo(),
    /** Sonraki değişiklik öncekilerle birleşmesin, ayrı bir geri alma adımı olsun. */
    checkpoint: () => undoManager.stopCapturing(),
    /** Boş bir çalışma alanına başlangıç içeriğini yazar. Geri alma geçmişine girmez. */
    seedIfEmpty() {
      if (c.meta.get("schema")) return false;
      // Sabit id'ler: iki sekme (ya da iki cihaz) aynı anda ilk kez açılırsa örnek içerik
      // çoğalmaz, birleşince aynı kayıtların üzerine yazılır.
      let n = 0;
      const seedActions = createActions(c, { ...deps, newId: () => `ornek-${++n}` });
      doc.transact(() => {
        c.meta.set("schema", SCHEMA_VERSION);
        seedWorkspace(seedActions);
      }, "seed");
      undoManager.clear();
      return true;
    },
    destroy() {
      doc.off("update", onUpdate);
      undoManager.destroy();
      listeners.clear();
    },
  };
}

const opened = new Map<string, Promise<WorkspaceStore>>();

/**
 * Tarayıcıda IndexedDB ile kalıcı bir çalışma alanı açar. Aynı ad için sayfa başına tek bir
 * belge açılır; React'in geliştirme modunda efektleri iki kez çalıştırması ikinci bir kopya yaratmaz.
 */
export function openLocalWorkspace(name = "arkipel-varsayilan"): Promise<WorkspaceStore> {
  let p = opened.get(name);
  if (!p) {
    p = (async () => {
      const { IndexeddbPersistence } = await import("y-indexeddb");
      const doc = new Y.Doc();
      const persistence = new IndexeddbPersistence(name, doc);
      await persistence.whenSynced;
      const store = createWorkspaceStore(doc);
      store.seedIfEmpty();
      return store;
    })();
    p.catch(() => opened.delete(name));
    opened.set(name, p);
  }
  return p;
}
