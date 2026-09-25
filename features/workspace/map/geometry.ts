// Haritadaki adaların boyutları ve çizgilerin ada kenarından başlaması için geometri.
// Modelde (x, y) adanın merkezidir; React Flow ise sol üst köşeyle çalışır.

export type Size = { w: number; h: number };

export function islandSize(depth: number): Size {
  if (depth <= 0) return { w: 176, h: 124 };
  if (depth === 1) return { w: 128, h: 90 };
  return { w: 100, h: 70 };
}

export const topLeft = (x: number, y: number, s: Size) => ({ x: x - s.w / 2, y: y - s.h / 2 });

/** Merkezden `toward` yönünde, elips biçimli adanın kenarındaki nokta. */
export function edgePoint(center: { x: number; y: number }, size: Size, toward: { x: number; y: number }) {
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  if (!dx && !dy) return center;
  const a = (size.w / 2) * 0.82;
  const b = (size.h / 2) * 0.82;
  const t = 1 / Math.sqrt((dx / a) ** 2 + (dy / b) ** 2);
  return { x: center.x + dx * t, y: center.y + dy * t };
}
