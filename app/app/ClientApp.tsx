"use client";

import dynamic from "next/dynamic";

// Uygulama tamamen tarayıcıda çalışır (IndexedDB, harita); sunucuda çizilmez.
const App = dynamic(() => import("@/features/workspace/App").then((m) => m.App), {
  ssr: false,
  loading: () => <Loading />,
});

function Loading() {
  return (
    <div className="ark-state" aria-busy="true">
      <p className="label">Harita açılıyor…</p>
    </div>
  );
}

export function ClientApp() {
  return <App fallback={<Loading />} />;
}
