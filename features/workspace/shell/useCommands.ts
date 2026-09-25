"use client";

// Harita, defter ve mobil görünümün ortak kullandığı komutlar.
// Aksiyonları çağırır, seçimi günceller ve gerektiğinde "Geri al" bildirimi gösterir.

import { useCallback, useMemo } from "react";
import { useStore } from "../WorkspaceProvider";
import { childrenOf, displayTitle } from "../model/selectors";
import type { Id } from "../model/types";
import { useShell } from "./ShellContext";

export function useCommands() {
  const store = useStore();
  const shell = useShell();
  const { actions } = store;

  const undoable = useCallback(
    (message: string) => shell.notify(message, { label: "Geri al", run: () => store.undo() }),
    [shell, store],
  );

  const addSatellite = useCallback(
    (parentId: Id) => {
      store.checkpoint();
      const id = actions.createIsland({ pageId: null, parentId });
      shell.select(id);
      return id;
    },
    [actions, shell, store],
  );

  const addRoot = useCallback(
    (pageId: Id, x: number, y: number) => {
      store.checkpoint();
      const id = actions.createIsland({ pageId, x, y });
      shell.select(id);
      return id;
    },
    [actions, shell, store],
  );

  const deleteIsland = useCallback(
    (id: Id) => {
      const ws = store.getSnapshot();
      const island = ws.islands[id];
      if (!island) return;
      const kids = childrenOf(ws, id).length;
      store.checkpoint();
      actions.deleteIsland(id);
      store.checkpoint();
      if (shell.selectedId === id) shell.select(island.parentId);
      undoable(
        `"${displayTitle(island)}" silindi.${kids ? ` ${kids} uydusu bir üst adaya bağlandı.` : ""}`,
      );
    },
    [actions, shell, store, undoable],
  );

  const sendToHarbor = useCallback(
    (id: Id) => {
      const island = store.getSnapshot().islands[id];
      if (!island) return;
      store.checkpoint();
      actions.sendToHarbor(id);
      store.checkpoint();
      undoable(`"${displayTitle(island)}" limana gönderildi.`);
    },
    [actions, store, undoable],
  );

  const newHarborNote = useCallback(() => {
    store.checkpoint();
    const id = actions.createIsland({ pageId: null });
    shell.select(id);
    return id;
  }, [actions, shell, store]);

  const disconnect = useCallback(
    (bridgeId: Id) => {
      store.checkpoint();
      actions.disconnect(bridgeId);
      store.checkpoint();
      undoable("Köprü kaldırıldı.");
    },
    [actions, store, undoable],
  );

  const connect = useCallback(
    (a: Id, b: Id) => {
      store.checkpoint();
      const id = actions.connect(a, b);
      if (!id) shell.notify("Bir ada kendisine ya da doğrudan uydusuna köprüyle bağlanamaz.");
      return id;
    },
    [actions, shell, store],
  );

  return useMemo(
    () => ({ addSatellite, addRoot, deleteIsland, sendToHarbor, newHarborNote, disconnect, connect }),
    [addSatellite, addRoot, deleteIsland, sendToHarbor, newHarborNote, disconnect, connect],
  );
}
