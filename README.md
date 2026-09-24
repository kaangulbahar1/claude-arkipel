# Arkipel

İç içe notlarda kaybolmayı çözen, ada metaforuna dayalı bir not uygulaması. Bu repo şu an
**kullanıcı araştırması** aşamasında: tanıtım sayfası, anket ve beta listesi.

- `/`: ürün fikrini anlatan tanıtım sayfası
- `/anket`: 5 adımlı anket (sonunda isteğe bağlı beta listesi ve görüşme daveti)
- `/api/anket`: cevapları doğrulayıp Supabase'e yazan uç nokta

Araştırmanın amacı, hipotezleri ve dağıtım planı: [docs/arastirma-plani.md](docs/arastirma-plani.md)

## Yerelde çalıştırma

```bash
npm install
npm run dev          # http://localhost:3000
```

Supabase ayarlı değilse geliştirme modunda cevaplar `data/responses.jsonl` dosyasına yazılır.

## Yayına alma (Supabase + Vercel)

1. [supabase.com](https://supabase.com)'da proje aç. SQL Editor'da `supabase/migrations/0001_anket.sql` dosyasını çalıştır.
2. Repoyu Vercel'e bağla. Ortam değişkenlerini ekle (bkz. `.env.example`):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (sadece sunucuda kullanılır; tablolarda RLS açık ve genel erişim yok)
3. Paylaşırken linke kaynak ekle, analizde hangi kanalın işe yaradığını görürsün:
   `https://alanadin.com/anket?kaynak=linkedin`

## Anketi değiştirmek

Bütün sorular `lib/survey.ts` dosyasında. Form, sunucu doğrulaması ve analiz buradan beslenir.
Soruları anlamlı biçimde değiştirirsen `SURVEY_VERSION` değerini de artır, cevaplar karışmasın.

## Analiz

```bash
npm run analiz                    # Supabase'den çeker (ortamda SUPABASE_* varsa)
npm run analiz -- dosya.jsonl     # ya da bir dosyadan okur
```

`rapor/` klasörüne üç dosya yazar (e-postalar hiçbirine girmez):

- `rapor.md`: segmentler, senaryo ve rol kırılımları, özellik öncelik sıralaması, soru bazında dağılımlar
- `acik-uclu.md`: açık uçlu cevaplar, senaryoya göre gruplu (nitel kodlama için)
- `cevaplar.csv`: her satır bir katılımcı (Excel, Sheets vb. için)

Scripti gerçek veri gelmeden denemek için sahte veri üret:
`npx tsx scripts/sample-data.ts 80 && npm run analiz -- data/ornek.jsonl`
