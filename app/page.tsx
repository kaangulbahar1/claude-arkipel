import Link from "next/link";
import { Brand } from "@/components/Brand";
import { IslandMap } from "@/components/IslandMap";

const legend = [
  {
    tag: "Sayfa",
    title: "Her alan kendi haritası",
    body: "İş, Tez, Kişisel. Konularını ayrı sayfalara böl, tek bir dev haritada boğulma.",
  },
  {
    tag: "Ada",
    title: "Konular ada, alt notlar uydu",
    body: "Adaları istediğin yere sürükle. Hangi seviyede olurlarsa olsunlar iki adayı bir köprüyle bağla.",
  },
  {
    tag: "Defter",
    title: "Adaya gir, düz yaz",
    body: "Her ada kendi defteri. Kalın, italik, başlık. Yazarken haritayı düşünmek zorunda değilsin.",
  },
  {
    tag: "Liman",
    title: "Telefonda sade not",
    body: "Mobilde hızlıca yaz, not limana düşsün. Masaüstüne geçince haritada yerine koy.",
  },
];

export default function Home() {
  return (
    <div className="wrap">
      <header className="topbar">
        <Brand />
        <Link href="/app" className="btn btn--ghost btn--small">Uygulamayı aç</Link>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="label">Erken erişim · Tarayıcında çalışır, kayıt gerekmez</span>
            <h1>Notlarının içinde <em>kaybolma.</em></h1>
            <p>
              İç içe notlar büyüdükçe neyin nereye bağlı olduğu kayboluyor. Arkipel her konuyu bir ada,
              alt notları uydu adalar olarak tek bir haritaya koyuyor. Nerede olduğunu hep görüyorsun.
            </p>
            <div className="hero-actions">
              <Link href="/app" className="btn btn--accent">Hemen dene</Link>
              <Link href="/anket" className="btn btn--ghost">Ankete katıl</Link>
            </div>
            <span className="hero-note">Notların sadece bu cihazda, tarayıcında saklanır.</span>
          </div>
          <IslandMap />
        </section>

        <section className="legend" aria-label="Arkipel nasıl çalışır">
          {legend.map((l) => (
            <article key={l.tag} className="legend-item">
              <span className="label">{l.tag}</span>
              <h3>{l.title}</h3>
              <p>{l.body}</p>
            </article>
          ))}
        </section>

        <section className="cta">
          <div>
            <h2>Birkaç gün kullandın mı?</h2>
            <p>
              Nerede takıldığını, neyi özlediğini bilmek istiyoruz. 5 dakikalık anket bir sonraki
              sürümde neyin olacağını doğrudan belirliyor.
            </p>
          </div>
          <Link href="/anket" className="btn">Ankete katıl</Link>
        </section>
      </main>

      <footer className="footer">
        <span>Arkipel · 2026</span>
        <span>
          Anket cevapları anonim tutulur. E-posta sadece istersen alınır. <Link href="/gizlilik">Gizlilik</Link>
        </span>
      </footer>
    </div>
  );
}
