# Arkipel

İç içe notlarda kaybolmayı çözen, ada metaforuna dayalı bir not uygulaması.

- `/app`: **uygulama.** Sayfalar, haritada adalar ve uydular, köprüler, her ada için defter, ⌘K arama,
  liman (hızlı notlar). Telefonda sade not uygulaması olarak açılır. Veriler tarayıcıda saklanır.
  Mimari ve "neyi nereden değiştiririm": [docs/mimari.md](docs/mimari.md)
- `/`: tanıtım sayfası
- `/anket`: 5 adımlı anket (sonunda isteğe bağlı beta listesi ve görüşme daveti)
- `/api/anket`: cevapları doğrulayıp Supabase'e yazan uç nokta
- `/panel`: şifreli sonuç paneli (hipotezler, özellik öncelikleri, segmentler, son açık uçlu cevaplar)
- `/gizlilik`: KVKK aydınlatma metni

Araştırmanın amacı, hipotezleri ve dağıtım planı: [docs/arastirma-plani.md](docs/arastirma-plani.md)

## Yerelde çalıştırma

```bash
npm install
npm run dev          # http://localhost:3000/app
npm test             # veri modeli testleri
```

Supabase ayarlı değilse geliştirme modunda cevaplar `data/responses.jsonl` dosyasına yazılır.

## Yayına alma (Supabase + Vercel)

1. [supabase.com](https://supabase.com)'da proje aç. SQL Editor'da `supabase/migrations/` altındaki dosyaları sırayla çalıştır.
2. Repoyu Vercel'e bağla. Ortam değişkenlerini ekle (bkz. `.env.example`):

   | Değişken | Ne için |
   | --- | --- |
   | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Cevapları kaydetmek ve okumak (sadece sunucuda; tablolarda RLS açık, genel erişim yok) |
   | `IP_HASH_SALT` | Gönderim sınırı: aynı IP'den saatte en fazla 5 cevap. IP'nin kendisi saklanmaz |
   | `PANEL_PASSWORD` | `/panel` şifresi. Tanımlı değilse panel canlıda kapalı olur |
   | `NEXT_PUBLIC_SITE_URL` | Paylaşım görseli ve bağlantılar için sitenin adresi |
   | `NEXT_PUBLIC_DATA_CONTROLLER`, `NEXT_PUBLIC_CONTACT_EMAIL` | Gizlilik sayfasındaki veri sorumlusu ve başvuru adresi. **Yayından önce doldur** |

3. Paylaşırken linke kaynak ekle, analizde hangi kanalın işe yaradığını görürsün:
   `https://alanadin.com/anket?kaynak=linkedin`

## Anketi değiştirmek

Bütün sorular `lib/survey.ts` dosyasında. Form, sunucu doğrulaması, analiz ve panel buradan beslenir.
Değiştirmeden önce [docs/anket-surumleri.md](docs/anket-surumleri.md) dosyasındaki kuralları oku ve
değişikliği oradaki günlüğe yaz.

## Analiz

```bash
npm run analiz                    # Supabase'den çeker (ortamda SUPABASE_* varsa)
npm run analiz -- dosya.jsonl     # ya da bir dosyadan okur
npm run analiz -- --surum=2026-09-v1   # sadece bir sürümün cevapları
```

`rapor/` klasörüne üç dosya yazar (e-postalar hiçbirine girmez):

- `rapor.md`: segmentler, senaryo ve rol kırılımları, özellik öncelik sıralaması, soru bazında dağılımlar
- `acik-uclu.md`: açık uçlu cevaplar, senaryoya göre gruplu (nitel kodlama için)
- `cevaplar.csv`: her satır bir katılımcı (Excel, Sheets vb. için)

Scripti gerçek veri gelmeden denemek için sahte veri üret:
`npx tsx scripts/sample-data.ts 80 && npm run analiz -- data/ornek.jsonl`
