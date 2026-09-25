"use client";

// Kaydedilmeyen arayüz durumu: hangi sayfa açık, hangi ada seçili, hangi paneller açık.
// Harita, "adaya uç" isteğini buraya kaydettiği bir fonksiyonla karşılar.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useWorkspace } from "../WorkspaceProvider";
import type { Id } from "../model/types";

type FlyHandler = (islandId: Id) => void;
export type Toast = { id: number; message: string; action?: { label: string; run: () => void } };

type Shell = {
  pageId: Id | null;
  setPageId: (id: Id) => void;
  selectedId: Id | null;
  select: (id: Id | null) => void;
  /** Adayı seçer, gerekiyorsa sayfasını açar ve haritayı ona götürür. */
  goTo: (id: Id) => void;
  harborOpen: boolean;
  setHarborOpen: (open: boolean) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  registerFly: (fn: FlyHandler | null) => void;
  /** Sayfa değiştikten sonra uçulması gereken ada; harita yeni sayfayı çizince bir kez okur. */
  takePendingFly: () => Id | null;
  toast: Toast | null;
  /** Kısa bildirim; isteğe bağlı bir eylemle (ör. "Geri al"). */
  notify: (message: string, action?: Toast["action"]) => void;
  dismissToast: () => void;
};

const ShellContext = createContext<Shell | null>(null);
const LAST_PAGE_KEY = "arkipel-son-sayfa";

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const ws = useWorkspace();
  const [pageId, setPageIdState] = useState<Id | null>(null);
  const [selectedId, setSelectedId] = useState<Id | null>(null);
  const [harborOpen, setHarborOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const fly = useRef<FlyHandler | null>(null);
  const pendingFly = useRef<Id | null>(null);

  // Açık sayfa silinirse ya da ilk açılışta: son açılan sayfaya, o da yoksa ilk sayfaya dön.
  useEffect(() => {
    if (pageId && ws.pages.some((p) => p.id === pageId)) return;
    let remembered: string | null = null;
    try {
      remembered = localStorage.getItem(LAST_PAGE_KEY);
    } catch {}
    const next = ws.pages.find((p) => p.id === remembered) ?? ws.pages[0];
    setPageIdState(next?.id ?? null);
  }, [ws.pages, pageId]);

  // Seçili ada silinirse seçimi bırak.
  useEffect(() => {
    if (selectedId && !ws.islands[selectedId]) setSelectedId(null);
  }, [ws.islands, selectedId]);

  const setPageId = useCallback((id: Id) => {
    setPageIdState(id);
    try {
      localStorage.setItem(LAST_PAGE_KEY, id);
    } catch {}
  }, []);

  const goTo = useCallback(
    (id: Id) => {
      const island = ws.islands[id];
      if (!island) return;
      setSelectedId(id);
      if (island.pageId && island.pageId !== pageId) {
        setPageId(island.pageId);
        pendingFly.current = id; // yeni sayfanın haritası hazır olunca uçulacak
      } else if (island.pageId) {
        fly.current?.(id);
      }
    },
    [ws.islands, pageId, setPageId],
  );

  const registerFly = useCallback((fn: FlyHandler | null) => {
    fly.current = fn;
  }, []);

  const takePendingFly = useCallback(() => {
    const id = pendingFly.current;
    pendingFly.current = null;
    return id;
  }, []);

  const notify = useCallback((message: string, action?: Toast["action"]) => {
    setToast({ id: Date.now(), message, action });
  }, []);
  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast((cur) => (cur?.id === toast.id ? null : cur)), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  const value = useMemo<Shell>(
    () => ({
      pageId,
      setPageId,
      selectedId,
      select: setSelectedId,
      goTo,
      harborOpen,
      setHarborOpen,
      searchOpen,
      setSearchOpen,
      registerFly,
      takePendingFly,
      toast,
      notify,
      dismissToast,
    }),
    [pageId, setPageId, selectedId, goTo, harborOpen, searchOpen, registerFly, takePendingFly, toast, notify, dismissToast],
  );

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell(): Shell {
  const s = useContext(ShellContext);
  if (!s) throw new Error("useShell, ShellProvider içinde kullanılmalı.");
  return s;
}
