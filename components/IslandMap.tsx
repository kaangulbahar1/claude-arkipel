import { islandPath } from "@/lib/island-shape";

// Landing sayfasındaki örnek harita: bir "Tez" sayfası, ana ada, uydular ve bir köprü.

type Island = { id: string; x: number; y: number; r: number; seed: number; name: string; main?: boolean };

const islands: Island[] = [
  { id: "tez", x: 250, y: 205, r: 62, seed: 3, name: "Tez", main: true },
  { id: "kaynak", x: 105, y: 110, r: 30, seed: 7, name: "Kaynaklar" },
  { id: "b1", x: 115, y: 305, r: 27, seed: 11, name: "Bölüm 1" },
  { id: "b2", x: 390, y: 320, r: 32, seed: 5, name: "Bölüm 2" },
  { id: "yontem", x: 300, y: 70, r: 24, seed: 13, name: "Yöntem" },
  { id: "makale", x: 520, y: 150, r: 46, seed: 2, name: "Makale fikirleri", main: true },
  { id: "m1", x: 585, y: 280, r: 22, seed: 17, name: "Taslak" },
];

// Ana adadan uydularına giden bağlar ve bir serbest köprü.
const parentLinks: [string, string][] = [
  ["tez", "kaynak"],
  ["tez", "b1"],
  ["tez", "b2"],
  ["tez", "yontem"],
  ["makale", "m1"],
];
const bridges: [string, string][] = [["kaynak", "makale"]];

// Tanıtım görselindeki eski yuvarlak oranı koru: rx = r * 1.12, ry = r * 0.88.
const blob = (cx: number, cy: number, r: number, seed: number, scale = 1) =>
  islandPath(cx, cy, r * 1.12 * 1.04, r * 0.88 * 1.04, seed, scale);

const byId = Object.fromEntries(islands.map((i) => [i.id, i]));

export function IslandMap() {
  const here = byId.b2;
  return (
    <figure className="chart" style={{ margin: 0 }}>
      <div className="chart-tabs" aria-label="Sayfalar">
        <span className="chart-tab">İş</span>
        <span className="chart-tab" aria-current="true">Tez</span>
        <span className="chart-tab">Kişisel</span>
      </div>
      <svg viewBox="0 0 660 400" role="img" aria-label="Tez sayfasının haritası: ana ada Tez, etrafında Kaynaklar, Bölüm 1, Bölüm 2 ve Yöntem uyduları. Kaynaklar, Makale fikirleri adasına bir köprüyle bağlı. Buradasın işareti Bölüm 2 üzerinde.">
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M60 0H0V60" fill="none" stroke="var(--contour)" strokeWidth="0.6" opacity="0.6" />
          </pattern>
        </defs>
        <rect width="660" height="400" fill="url(#grid)" />

        {islands.map((i) => (
          <g key={`c-${i.id}`} fill="none" stroke="var(--contour)" strokeWidth="1">
            <path d={blob(i.x, i.y, i.r, i.seed, 1.55)} />
            <path d={blob(i.x, i.y, i.r, i.seed, 1.28)} />
          </g>
        ))}

        {parentLinks.map(([a, b]) => (
          <line key={`${a}-${b}`} x1={byId[a].x} y1={byId[a].y} x2={byId[b].x} y2={byId[b].y}
            stroke="var(--ink-2)" strokeWidth="1.5" opacity="0.55" />
        ))}
        {bridges.map(([a, b]) => (
          <path key={`${a}-${b}`}
            d={`M${byId[a].x},${byId[a].y} Q${(byId[a].x + byId[b].x) / 2},${Math.min(byId[a].y, byId[b].y) - 70} ${byId[b].x},${byId[b].y}`}
            fill="none" stroke="var(--ink)" strokeWidth="1.5" strokeDasharray="5 5" />
        ))}

        {islands.map((i) => (
          <g key={i.id}>
            <path d={blob(i.x, i.y, i.r, i.seed)} fill="var(--land)" stroke="var(--land-edge)" strokeWidth="1.5" />
            <text x={i.x} y={i.y + 5} textAnchor="middle" fill="var(--ink)"
              style={{ font: `${i.main ? 700 : 600} ${i.main ? 16 : 12}px var(--font-body)` }}>
              {i.name}
            </text>
          </g>
        ))}

        <g transform={`translate(${here.x + 46} ${here.y - 52})`}>
          <path d="M0 0c-9 0-16 7-16 16 0 12 16 26 16 26s16-14 16-26C16 7 9 0 0 0z" fill="var(--accent)" />
          <circle cx="0" cy="16" r="5.5" fill="var(--paper)" />
          <text x="22" y="14" fill="var(--accent)" style={{ font: "600 12px var(--font-mono)", letterSpacing: "0.06em" }}>BURADASIN</text>
        </g>

        <g transform="translate(610 360)" stroke="var(--ink-2)" fill="none" strokeWidth="1.2">
          <circle r="16" />
          <path d="M0 -22V22M-22 0H22" />
          <path d="M0 -16L4 0L0 16L-4 0Z" fill="var(--ink-2)" />
        </g>
      </svg>
      <figcaption className="chart-foot">
        <span className="label">Tez › Bölüm 2</span>
        <span className="label">— — köprü: Kaynaklar ↔ Makale fikirleri</span>
      </figcaption>
    </figure>
  );
}
