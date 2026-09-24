import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/Brand";
import { buildReport, type FeatureStat, type HypothesisStatus, openAnswers, type Report, type Row } from "@/lib/analysis";
import { panelAccess } from "@/lib/panel-auth";
import { loadResponses } from "@/lib/store";
import { scenarios } from "@/lib/survey";
import { logout } from "./actions";
import { LoginForm } from "./LoginForm";
import "./panel.css";

export const metadata: Metadata = { title: "Panel · Arkipel", robots: { index: false, follow: false } };

const pct = (x: number) => (Number.isNaN(x) ? "–" : `%${Math.round(x * 100)}`);
const f2 = (x: number) => (Number.isNaN(x) ? "–" : x.toFixed(2));
const dayLabel = (iso: string) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("tr-TR", { day: "numeric", month: "short", timeZone: "UTC" });
const timeLabel = (iso: string) =>
  new Date(iso).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });

const statusText: Record<HypothesisStatus, string> = { tutuyor: "✓ Tutuyor", tutmuyor: "✕ Tutmuyor", "veri-az": "… Veri az" };

export default async function PanelPage({ searchParams }: { searchParams: Promise<{ surum?: string }> }) {
  const access = await panelAccess();
  if (access !== "ok") {
    return (
      <div className="wrap">
        <header className="topbar"><Brand /></header>
        <main>
          {access === "login" ? (
            <LoginForm />
          ) : (
            <div className="panel login">
              <h1>Panel kapalı</h1>
              <p>Paneli açmak için sunucuda <code>PANEL_PASSWORD</code> ortam değişkenini tanımla.</p>
            </div>
          )}
        </main>
      </div>
    );
  }

  const { surum } = await searchParams;
  let all: Row[] = [];
  let loadError: string | null = null;
  try {
    all = await loadResponses();
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }
  const versions = [...new Set(all.map((r) => r.version))];
  const rows = surum ? all.filter((r) => r.version === surum) : all;
  const report = buildReport(rows);
  const quotes = openAnswers(rows).slice(0, 30);

  return (
    <div className="wrap">
      <header className="topbar">
        <Brand />
        <form action={logout}><button className="btn btn--ghost btn--small">Çıkış</button></form>
      </header>

      <main className="dash">
        <div className="dash-head">
          <div>
            <span className="label">Anket paneli · şu anki sürüm {report.currentVersion}</span>
            <h1>{report.n} cevap</h1>
          </div>
          <form className="dash-tools" method="get">
            <label htmlFor="surum" className="label">Sürüm</label>
            <select id="surum" name="surum" defaultValue={surum ?? ""}>
              <option value="">Hepsi</option>
              {versions.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
            <button className="btn btn--ghost btn--small">Uygula</button>
          </form>
        </div>

        {loadError && <div className="alert" role="alert">Cevaplar okunamadı: {loadError}</div>}
        {report.n > 0 && report.n < 30 && (
          <p className="card-sub" style={{ margin: 0 }}>
            {report.n} cevap az. Oranları yön gösterici oku; hipotezler 30 cevaptan sonra değerlendirilir.
          </p>
        )}

        <section className="tiles" aria-label="Özet">
          <Tile label="Son cevap" value={report.lastAt ? timeLabel(report.lastAt) : "–"} note={`Medyan süre ${Number.isNaN(report.medianMinutes) ? "–" : Math.round(report.medianMinutes)} dk`} />
          <Tile label="Çekirdek kitle" value={pct(report.core.share)} note={`${report.core.n} kişi · derin notlar ve sık kaybolma`} />
          <Tile label="Kaybolma" value={f2(report.kaybolma.mean)} note="1–5 arası ortalama" />
          <Tile label="İlk izlenim" value={f2(report.izlenim.mean)} note="1–5 arası ortalama" />
        </section>

        <div className="grid-2">
          <section className="card">
            <h2>Hipotezler</h2>
            <p className="card-sub">Eşikler docs/arastirma-plani.md dosyasındaki planla aynı.</p>
            <div className="hyp">
              {report.hypotheses.map((h) => (
                <div key={h.id} className="hyp-row">
                  <span className="hyp-id">{h.id}</span>
                  <div>
                    <div className="hyp-claim">{h.claim}</div>
                    <div className="hyp-meta">{h.measure}: <strong>{h.value}</strong> · hedef {h.target}</div>
                  </div>
                  <span className="pill" data-s={h.status}>{statusText[h.status]}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <h2>Günlük cevaplar</h2>
            <p className="card-sub">Son 30 gün</p>
            <DailyChart report={report} />
          </section>
        </div>

        <section className="card">
          <h2>Özellik öncelikleri</h2>
          <p className="card-sub">&quot;Olmazsa olmaz&quot; diyenlerin oranı. Sıralama tüm katılımcıların skoruna göre (0–2).</p>
          <div className="legend-row">
            <span className="key">Tüm katılımcılar</span>
            <span className="key" data-series="core">Çekirdek kitle</span>
          </div>
          <FeatureBars all={report.features.all} core={report.features.core} />
        </section>

        <section className="card">
          <h2>Senaryolar</h2>
          <SegmentTable segments={report.segments.scenarios} />
        </section>

        <div className="grid-2">
          <section className="card">
            <h2>Roller</h2>
            <SegmentTable segments={report.segments.roles} />
          </section>
          <section className="card">
            <h2>Kaynaklar</h2>
            <Bars rows={report.sources.map((s) => ({ label: s.label, n: s.n, share: s.n / Math.max(report.n, 1) }))} />
          </section>
        </div>

        <section className="card">
          <h2>Son açık uçlu cevaplar</h2>
          <p className="card-sub">En yeni 30 cevap. Tamamı için <code>npm run analiz</code> ile rapor/acik-uclu.md dosyasını üret.</p>
          {quotes.length ? (
            <div className="quotes">
              {quotes.map((q) => (
                <article key={q.id} className="quote">
                  <div className="quote-meta">
                    <span>{timeLabel(q.created_at)}</span>
                    <span>{q.tag}</span>
                    {q.scenarios.length > 0 && <span>{q.scenarios.map((s) => scenarios.find((x) => x.id === s)?.label ?? s).join(", ")}</span>}
                    {q.core && <span className="quote-core">Çekirdek</span>}
                  </div>
                  {q.texts.map((t, i) => (
                    <div key={i}>
                      <div className="quote-title">{t.title}</div>
                      <blockquote>{t.text}</blockquote>
                    </div>
                  ))}
                </article>
              ))}
            </div>
          ) : (
            <p className="empty">Henüz açık uçlu cevap yok.</p>
          )}
        </section>

        <section className="grid-2">
          {report.distributions.map((d) => (
            <div key={d.id} className="card">
              <h2>{d.title}</h2>
              <Bars rows={d.rows} />
            </div>
          ))}
        </section>

        <p className="card-sub" style={{ margin: 0 }}>
          <Link href="/">Ana sayfa</Link> · <Link href="/anket">Anket</Link>
        </p>
      </main>
    </div>
  );
}

function Tile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="tile">
      <span className="label">{label}</span>
      <span className="tile-value">{value}</span>
      <span className="tile-note">{note}</span>
    </div>
  );
}

function DailyChart({ report }: { report: Report }) {
  const days = report.daily.slice(-30);
  if (!days.length) return <p className="empty">Henüz cevap yok.</p>;
  const max = Math.max(...days.map((d) => d.n), 1);
  const top = max <= 4 ? max : Math.ceil(max / 2) * 2;
  return (
    <div className="cols">
      <div className="cols-axis" aria-hidden="true"><span>{top}</span><span>{top / 2}</span><span>0</span></div>
      <div className="cols-plot" role="img" aria-label={`Günlük cevap sayıları, ${dayLabel(days[0].date)} ile ${dayLabel(days[days.length - 1].date)} arası`}>
        {days.map((d) => (
          <div key={d.date} className="col" tabIndex={0} data-zero={d.n === 0} data-tip={`${dayLabel(d.date)}: ${d.n} cevap`}>
            <div className="col-bar" style={{ height: `${(d.n / top) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="cols-x" aria-hidden="true">
        <span>{dayLabel(days[0].date)}</span>
        {days.length > 1 && <span>{dayLabel(days[days.length - 1].date)}</span>}
      </div>
    </div>
  );
}

function Bars({ rows }: { rows: { label: string; n: number; share: number }[] }) {
  if (!rows.length) return <p className="empty">Veri yok.</p>;
  const max = Math.max(...rows.map((r) => r.share), 0.0001);
  return (
    <div className="bars">
      {rows.map((r) => (
        <div key={r.label} className="bar" tabIndex={0} data-tip={`${r.label}: ${r.n} kişi, ${pct(r.share)}`}>
          <span className="bar-label">{r.label}</span>
          <span className="bar-track">
            <span className="bar-fill" style={{ width: `${(r.share / max) * 80}%` }} />
            <span className="bar-value">{r.n} · {pct(r.share)}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function FeatureBars({ all, core }: { all: FeatureStat[]; core: FeatureStat[] }) {
  const coreById = Object.fromEntries(core.map((c) => [c.id, c]));
  return (
    <div className="bars">
      {all.map((f) => {
        const c = coreById[f.id];
        return (
          <div key={f.id} className="bar" tabIndex={0}
            data-tip={`${f.label}: tümü ${pct(f.sart)} (skor ${f2(f.score)}), çekirdek ${pct(c?.sart ?? NaN)} (skor ${f2(c?.score ?? NaN)})`}>
            <span className="bar-label">{f.label}</span>
            <span className="bar-pair">
              <span className="bar-track">
                <span className="bar-fill" style={{ width: `${(Number.isNaN(f.sart) ? 0 : f.sart) * 80}%` }} />
                <span className="bar-value">{pct(f.sart)}</span>
              </span>
              <span className="bar-track">
                <span className="bar-fill" data-series="core" style={{ width: `${(Number.isNaN(c?.sart ?? NaN) ? 0 : c.sart) * 80}%` }} />
                <span className="bar-value">{pct(c?.sart ?? NaN)}</span>
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SegmentTable({ segments }: { segments: Report["segments"]["scenarios"] }) {
  return (
    <div className="tbl">
      <table>
        <thead>
          <tr><th>Segment</th><th>Kişi</th><th>Kaybolma</th><th>İzlenim</th><th>4 $+ öder</th><th>Telefon</th></tr>
        </thead>
        <tbody>
          {segments.map((s) => (
            <tr key={s.name}>
              <td>{s.name}</td>
              <td>{s.n} <span style={{ color: "var(--muted)" }}>{pct(s.share)}</span></td>
              <td>{f2(s.kaybolma)}</td>
              <td>{f2(s.izlenim)}</td>
              <td>{pct(s.odeme4plus)}</td>
              <td>{pct(s.telefon)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
