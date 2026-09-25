// Çalışma alanı üzerinde saf sorgular. Hepsi anlık görüntü (Workspace) alır, hiçbiri değişiklik yapmaz.

import type { Bridge, Id, Island, Workspace } from "./types";

export const islandList = (ws: Workspace) => Object.values(ws.islands);

export const pageIslands = (ws: Workspace, pageId: Id) => islandList(ws).filter((i) => i.pageId === pageId);

/** Limanda bekleyen, henüz haritaya yerleştirilmemiş notlar. En yeni en üstte. */
export const harborIslands = (ws: Workspace) =>
  islandList(ws)
    .filter((i) => i.pageId === null)
    .sort((a, b) => b.createdAt - a.createdAt);

export const childrenOf = (ws: Workspace, id: Id) =>
  islandList(ws)
    .filter((i) => i.parentId === id)
    .sort((a, b) => a.createdAt - b.createdAt);

export const rootsOf = (ws: Workspace, pageId: Id) =>
  pageIslands(ws, pageId)
    .filter((i) => i.parentId === null)
    .sort((a, b) => a.createdAt - b.createdAt);

export function descendantIds(ws: Workspace, id: Id): Id[] {
  const out: Id[] = [];
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const child of childrenOf(ws, cur)) {
      out.push(child.id);
      stack.push(child.id);
    }
  }
  return out;
}

/** Kökten adanın kendisine kadar olan yol. "Tez › Bölüm 2 › Kaynaklar" için. */
export function ancestry(ws: Workspace, id: Id): Island[] {
  const path: Island[] = [];
  const seen = new Set<Id>();
  let cur: Island | undefined = ws.islands[id];
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    path.unshift(cur);
    cur = cur.parentId ? ws.islands[cur.parentId] : undefined;
  }
  return path;
}

export const depthOf = (ws: Workspace, id: Id) => ancestry(ws, id).length - 1;

export const bridgesOf = (ws: Workspace, id: Id): Bridge[] => ws.bridges.filter((b) => b.from === id || b.to === id);

export const otherEnd = (b: Bridge, id: Id) => (b.from === id ? b.to : b.from);

export function bridgeBetween(ws: Workspace, a: Id, b: Id): Bridge | undefined {
  return ws.bridges.find((x) => (x.from === a && x.to === b) || (x.from === b && x.to === a));
}

export const pageTitle = (ws: Workspace, pageId: Id | null) =>
  pageId ? ws.pages.find((p) => p.id === pageId)?.title ?? "" : "Liman";

export const displayTitle = (island: Pick<Island, "title"> | undefined) => island?.title.trim() || "Adsız ada";

/** Yeni bir uydunun ebeveyninin etrafında nereye konacağı. Altın açı ile üst üste binmez. */
export function satellitePosition(ws: Workspace, parentId: Id): { x: number; y: number } {
  const parent = ws.islands[parentId];
  if (!parent) return { x: 0, y: 0 };
  const k = childrenOf(ws, parentId).length;
  const radius = (parent.parentId === null ? 190 : 130) + Math.floor(k / 6) * 60;
  const angle = -Math.PI / 2 + k * ((137.5 * Math.PI) / 180);
  return { x: Math.round(parent.x + Math.cos(angle) * radius), y: Math.round(parent.y + Math.sin(angle) * radius) };
}

/** Sayfada yeni bir ana ada için mevcut adaların sağında boş bir yer. */
export function freeSpot(ws: Workspace, pageId: Id): { x: number; y: number } {
  const roots = pageIslands(ws, pageId);
  if (!roots.length) return { x: 0, y: 0 };
  const maxX = Math.max(...roots.map((i) => i.x));
  const avgY = roots.reduce((s, i) => s + i.y, 0) / roots.length;
  return { x: Math.round(maxX + 320), y: Math.round(avgY) };
}
