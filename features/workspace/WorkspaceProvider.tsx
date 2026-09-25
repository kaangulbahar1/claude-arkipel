"use client";

// Çalışma alanını açar ve bileşenlere iki şey sağlar:
//   useWorkspace()  -> değişmez anlık görüntü (her değişiklikte yeniden çizilir)
//   useStore()      -> aksiyonlar, geri alma, Yjs belgesi

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { openLocalWorkspace, type WorkspaceStore } from "./model/store";
import type { Workspace } from "./model/types";

const StoreContext = createContext<WorkspaceStore | null>(null);

export function WorkspaceProvider({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) {
  const [store, setStore] = useState<WorkspaceStore | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Çalışma alanı sayfa açık kaldığı sürece yaşar; bileşen yeniden bağlansa da aynı belge kullanılır.
  useEffect(() => {
    let alive = true;
    openLocalWorkspace()
      .then((s) => alive && setStore(s))
      .catch((err) => alive && setError(err instanceof Error ? err.message : String(err)));
    return () => {
      alive = false;
    };
  }, []);

  if (error) {
    return (
      <div className="ark-state" role="alert">
        <h1>Notların açılamadı</h1>
        <p>Tarayıcın yerel depolamaya izin vermiyor olabilir (gizli pencere gibi). Ayrıntı: {error}</p>
      </div>
    );
  }
  if (!store) return <>{fallback}</>;
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): WorkspaceStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore, WorkspaceProvider içinde kullanılmalı.");
  return store;
}

export function useWorkspace(): Workspace {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

export function useActions() {
  return useStore().actions;
}
