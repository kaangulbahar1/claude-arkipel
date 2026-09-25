"use client";

// Uygulamanın dış çerçevesi. Geniş ekranda harita + defter, dar ekranda mobil not görünümü.

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { useStore, useWorkspace } from "../WorkspaceProvider";
import { HarborDrawer } from "../harbor/Harbor";
import { MapView } from "../map/MapView";
import { MobileApp } from "../mobile/MobileApp";
import { harborIslands } from "../model/selectors";
import { Notebook } from "../notebook/Notebook";
import { CommandPalette } from "../search/CommandPalette";
import { isMac } from "./keys";
import { PageTabs } from "./PageTabs";
import { ShellProvider, useShell } from "./ShellContext";

const MOBILE_QUERY = "(max-width: 760px)";

function useIsMobile() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(MOBILE_QUERY);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false,
  );
}

export function AppShell() {
  return (
    <ShellProvider>
      <Frame />
    </ShellProvider>
  );
}

function Frame() {
  const shell = useShell();
  const mobile = useIsMobile();

  // ⌘K / Ctrl+K her yerde aramayı açar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        shell.setSearchOpen(!shell.searchOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shell]);

  return (
    <div className="ark-app">
      {mobile ? <MobileApp /> : <Desktop />}
      <CommandPalette />
      <ToastView />
    </div>
  );
}

function Desktop() {
  const shell = useShell();
  const store = useStore();
  const ws = useWorkspace();
  const harborCount = harborIslands(ws).length;
  const selected = shell.selectedId ? ws.islands[shell.selectedId] : undefined;

  return (
    <>
      <header className="ark-top">
        <Link href="/" className="brand ark-brand" aria-label="Arkipel ana sayfa">
          <svg width="24" height="24" viewBox="0 0 28 28" aria-hidden="true">
            <ellipse cx="11" cy="15" rx="8" ry="6.5" fill="var(--land)" stroke="var(--land-edge)" strokeWidth="1.5" />
            <ellipse cx="22" cy="7" rx="4" ry="3.2" fill="var(--land)" stroke="var(--land-edge)" strokeWidth="1.5" />
            <ellipse cx="22" cy="22" rx="3" ry="2.5" fill="var(--land)" stroke="var(--land-edge)" strokeWidth="1.5" />
            <circle cx="11" cy="15" r="2.4" fill="var(--accent)" />
          </svg>
        </Link>
        <PageTabs />
        <div className="ark-top-actions">
          <button type="button" className="ark-top-btn" onClick={() => shell.setSearchOpen(true)}>
            Ara <kbd>{isMac() ? "⌘K" : "Ctrl K"}</kbd>
          </button>
          <button type="button" className="ark-top-btn" aria-pressed={shell.harborOpen} onClick={() => shell.setHarborOpen(!shell.harborOpen)}>
            ⚓ Liman{harborCount > 0 && <span className="ark-badge">{harborCount}</span>}
          </button>
          <button type="button" className="ark-icon-btn" onClick={() => store.undo()} aria-label="Geri al" title="Geri al">↶</button>
          <button type="button" className="ark-icon-btn" onClick={() => store.redo()} aria-label="Yinele" title="Yinele">↷</button>
        </div>
      </header>

      <div className="ark-body">
        <HarborDrawer />
        <main className="ark-main">
          <MapView />
        </main>
        {selected && (
          <aside className="ark-side">
            <Notebook islandId={selected.id} onClose={() => shell.select(null)} />
          </aside>
        )}
      </div>
    </>
  );
}

function ToastView() {
  const { toast, dismissToast } = useShell();
  if (!toast) return null;
  return (
    <div className="ark-toast" role="status" aria-live="polite">
      <span>{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          className="ark-toast-action"
          onClick={() => {
            toast.action!.run();
            dismissToast();
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button type="button" className="ark-icon-btn" onClick={dismissToast} aria-label="Bildirimi kapat">✕</button>
    </div>
  );
}
