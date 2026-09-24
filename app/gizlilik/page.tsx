import type { Metadata } from "next";
import { Brand } from "@/components/Brand";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Gizlilik · Arkipel" };

const missing = <em>(henüz belirtilmedi)</em>;

export default function PrivacyPage() {
  return (
    <div className="wrap">
      <header className="topbar"><Brand /></header>
      <main className="survey">
        <article className="panel prose">
          <div className="panel-head">
            <span className="label">KVKK aydınlatma metni</span>
            <h1>Anket verilerini nasıl kullanıyoruz?</h1>
            <p>Son güncelleme: 24 Eylül 2026</p>
          </div>

          <section>
            <h2>Veri sorumlusu</h2>
            <p>
              6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında veri sorumlusu{" "}
              <strong>{site.controller || missing}</strong>. Başvuruların için:{" "}
              <strong>{site.contactEmail || missing}</strong>
            </p>
          </section>

          <section>
            <h2>Hangi verileri topluyoruz?</h2>
            <ul>
              <li><strong>Anket cevapların:</strong> rolün, kullandığın not araçları, not alma alışkanlıkların ve yazdığın açık uçlu cevaplar. Adını sormuyoruz. Açık uçlu alanlara kimliğini belli eden bilgi yazmamanı öneririz.</li>
              <li><strong>E-posta adresin:</strong> sadece yazarsan ve onay kutusunu işaretlersen. Anket cevaplarından ayrı bir tabloda tutulur.</li>
              <li><strong>Teknik bilgi:</strong> anketi ne kadar sürede doldurduğun, hangi bağlantıdan geldiğin (örneğin <code>?kaynak=linkedin</code>) ve IP adresinden tek yönlü olarak üretilen bir kod. IP adresinin kendisini saklamıyoruz; bu kod sadece aynı yerden art arda gönderimi sınırlamak için kullanılır.</li>
            </ul>
          </section>

          <section>
            <h2>Ne amaçla kullanıyoruz?</h2>
            <ul>
              <li>Anket cevaplarını, Arkipel&apos;in kimin için ve hangi özelliklerle geliştirileceğine karar vermek için toplu olarak analiz ediyoruz.</li>
              <li>E-posta adresini sadece senin seçtiğin amaçla kullanıyoruz: beta açıldığında haber vermek ve/veya görüşmeye davet etmek. Reklam göndermiyor, kimseyle paylaşmıyor ya da satmıyoruz.</li>
            </ul>
          </section>

          <section>
            <h2>Hukuki sebep</h2>
            <p>
              Anket cevaplarını, ürün geliştirmeye yönelik meşru menfaatimiz kapsamında (KVKK md. 5/2-f) işliyoruz.
              E-posta adresini ve verilerin yurt dışındaki sunuculara aktarılmasını açık rızana dayanarak (KVKK md. 5/1 ve md. 9) işliyoruz.
              Rızanı istediğin zaman geri alabilirsin.
            </p>
          </section>

          <section>
            <h2>Veriler nerede saklanıyor?</h2>
            <p>
              Site Vercel üzerinde çalışıyor, veriler Supabase veritabanında saklanıyor. Bu hizmetlerin sunucuları yurt dışında
              olabilir. Veriler bu hizmet sağlayıcılar dışında kimseye aktarılmaz.
            </p>
          </section>

          <section>
            <h2>Ne kadar süre saklıyoruz?</h2>
            <ul>
              <li>E-posta adresini beta sürecinin sonuna kadar, en fazla 12 ay saklıyoruz. Sonra siliyoruz.</li>
              <li>Anket cevaplarını araştırma süresince saklıyoruz. Araştırma bittiğinde, kimliğini belli edebilecek açık uçlu cevapları siliyor ya da anonimleştiriyoruz.</li>
            </ul>
          </section>

          <section>
            <h2>Hakların</h2>
            <p>
              KVKK md. 11 kapsamında verilerinin işlenip işlenmediğini öğrenme, düzeltilmesini ya da silinmesini isteme ve
              işlemeye itiraz etme hakkın var. Bunun için yukarıdaki adrese e-posta atman yeterli. Talebini en geç 30 gün
              içinde sonuçlandırırız.
            </p>
          </section>
        </article>
      </main>
    </div>
  );
}
