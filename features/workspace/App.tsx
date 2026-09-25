"use client";

import { AppShell } from "./shell/AppShell";
import { WorkspaceProvider } from "./WorkspaceProvider";

export function App({ fallback }: { fallback: React.ReactNode }) {
  return (
    <WorkspaceProvider fallback={fallback}>
      <AppShell />
    </WorkspaceProvider>
  );
}
