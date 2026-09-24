# Anket sürümleri

Anketi değiştirdiğinde buraya bir satır ekle. Analiz ve panel cevapları sürüme göre ayırabiliyor
(`npm run analiz -- --surum=...`, panelde "Sürüm" seçimi).

## Değiştirme kuralları

1. **Soru ID'lerini (`id`) asla değiştirme.** Bir sorunun ID'si aynı kalırsa eski ve yeni cevaplar
   birlikte analiz edilir.
2. **Sorunun anlamı değişiyorsa yeni bir ID ver.** Örneğin kaybolma sorusunu 1–5 yerine 1–10 yapacaksan
   `kaybolma` yerine `kaybolma-10` gibi yeni bir soru ekle. Eskisini silebilirsin, eski cevaplar veritabanında kalır.
3. **Seçenek eklemek güvenli**, seçenek ID'sini değiştirmek değil. Kaldırılan bir seçenek eski cevaplarda
   ID'siyle görünmeye devam eder.
4. **Her anlamlı değişiklikte `SURVEY_VERSION`'ı artır** (`lib/survey.ts`). Anketi açık tutan biri eski
   sürümle göndermeye çalışırsa sayfayı yenilemesi istenir. Tarayıcıdaki yarım taslakta hâlâ geçerli olan
   cevaplar yeni sürüme taşınır.
5. **Hipotez eşiklerini değiştirirsen** hem `lib/analysis.ts` hem `docs/arastirma-plani.md` güncellenmeli.

## Günlük

| Sürüm | Tarih | Değişiklik | Neden |
| --- | --- | --- | --- |
| 2026-09-v1 | 2026-09-24 | İlk sürüm: 4 bölüm, 17 soru, 6 senaryo, 9 özellik | Başlangıç |
