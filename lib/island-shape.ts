// Deterministik, yumuşak kenarlı ada şekli. Aynı tohum her zaman aynı adayı çizer.

function rand(seed: number) {
  let s = (Math.abs(seed) % 233280) * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/** Metinden (ör. ada id'si) sayısal tohum. */
export function seedFrom(text: string) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * (cx, cy) merkezli, yaklaşık rx × ry yarıçaplı kapalı bir SVG yolu.
 * Catmull-Rom noktalarından kübik Bezier eğrileri üretir.
 */
export function islandPath(cx: number, cy: number, rx: number, ry: number, seed: number, scale = 1) {
  const rnd = rand(seed);
  const n = 9;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const k = scale * (0.8 + rnd() * 0.3);
    return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k];
  });
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + "Z";
}
