// Anketin tek kaynağı. Form, sunucu doğrulaması ve analiz scripti
// soruları buradan okur; bir soruyu değiştirmek için sadece burayı düzenle.

export type Option = { id: string; label: string; hint?: string };

type Base = { id: string; title: string; help?: string; optional?: boolean };

export type Question =
  | (Base & { kind: "single"; options: Option[]; other?: boolean })
  | (Base & { kind: "multi"; options: Option[]; max?: number; other?: boolean })
  | (Base & { kind: "scale"; min: 1; max: 5; low: string; high: string })
  | (Base & { kind: "text"; placeholder?: string; long?: boolean })
  | (Base & { kind: "matrix"; rows: Option[]; levels: Option[] });

export type Section = { id: string; title: string; intro?: string; questions: Question[] };

export const SURVEY_VERSION = "2026-09-v1";

export const scenarios: Option[] = [
  {
    id: "arastirma",
    label: "Tez ya da araştırma",
    hint: "Kaynaklar, bölümler, alıntılar ve fikirler birbirine bağlı. Bir kaynağın hangi bölüme ait olduğunu hatırlamak zor.",
  },
  {
    id: "kurgu",
    label: "Roman, senaryo ya da oyun dünyası",
    hint: "Karakterler, mekânlar, sahneler ve olay örgüsü. Bir karakter birden çok sahnede geçiyor.",
  },
  {
    id: "proje",
    label: "Ürün ya da proje yönetimi",
    hint: "Özellikler, kararlar, toplantı notları. Bir karar hangi toplantıdan çıktı, hangi özelliği etkiliyor?",
  },
  {
    id: "ders",
    label: "Ders çalışma",
    hint: "Dersler › üniteler › konular. Sınavdan önce bütün resmi görmek istiyorsun.",
  },
  {
    id: "ikinci-beyin",
    label: "Kişisel bilgi bahçesi",
    hint: "Okuduklarım, izlediklerim, fikirlerim. Yıllar içinde büyüyen ve kendi kendine bağlanan notlar.",
  },
  {
    id: "yakalama",
    label: "Hızlı yakalama",
    hint: "Aklıma geleni hemen telefona yazıyorum, düzenlemeye nadiren fırsat buluyorum.",
  },
];

export const features: Option[] = [
  { id: "sayfalar", label: "Sayfalar", hint: "İş, Tez, Kişisel gibi ayrı haritalar" },
  { id: "harita", label: "Harita görünümü", hint: "Adaları sürükleyip istediğin yere koymak" },
  { id: "baglar", label: "Serbest bağlar", hint: "Herhangi iki adayı birbirine bağlamak" },
  { id: "defter", label: "Her ada bir defter", hint: "Adaya girince düz yazı yazmak" },
  { id: "liman", label: "Mobilde hızlı not", hint: "Telefondan yazılanlar limana düşer, sonra yerleştirilir" },
  { id: "cevrimdisi", label: "Çevrimdışı çalışma", hint: "İnternet yokken de yazabilmek" },
  { id: "senkron", label: "Cihazlar arası senkron", hint: "Web, masaüstü ve telefonda aynı notlar" },
  { id: "arama", label: "Ara ve adaya uç", hint: "Arayıp sonuca haritada kamerayla gitmek" },
  { id: "disa-aktarma", label: "Dışa aktarma", hint: "Notlarını Markdown olarak alabilmek" },
];

export const featureLevels: Option[] = [
  { id: "sart", label: "Olmazsa olmaz" },
  { id: "iyi", label: "Güzel olur" },
  { id: "gereksiz", label: "Gerek yok" },
];

export const sections: Section[] = [
  {
    id: "sen",
    title: "Seni tanıyalım",
    intro: "Birkaç kısa soru. Toplam 5 dakika sürer.",
    questions: [
      {
        id: "rol",
        kind: "single",
        title: "En çok hangisi seni tanımlıyor?",
        other: true,
        options: [
          { id: "ogrenci", label: "Öğrenci" },
          { id: "akademisyen", label: "Akademisyen ya da araştırmacı" },
          { id: "yazar", label: "Yazar, senarist, içerik üreticisi" },
          { id: "yazilimci", label: "Yazılımcı" },
          { id: "urun", label: "Ürün ya da proje yöneticisi" },
          { id: "tasarimci", label: "Tasarımcı" },
          { id: "girisimci", label: "Girişimci ya da serbest çalışan" },
        ],
      },
      {
        id: "araclar",
        kind: "multi",
        title: "Şu an not almak için neler kullanıyorsun?",
        help: "Birden fazla seçebilirsin.",
        other: true,
        options: [
          { id: "notion", label: "Notion" },
          { id: "obsidian", label: "Obsidian" },
          { id: "apple-notes", label: "Apple Notlar" },
          { id: "google-keep", label: "Google Keep" },
          { id: "onenote", label: "OneNote" },
          { id: "evernote", label: "Evernote" },
          { id: "logseq", label: "Logseq" },
          { id: "heptabase", label: "Heptabase" },
          { id: "kagit", label: "Kâğıt defter" },
        ],
      },
      {
        id: "siklik",
        kind: "single",
        title: "Ne sıklıkla not alıyorsun?",
        options: [
          { id: "gunde-cok", label: "Günde birkaç kez" },
          { id: "her-gun", label: "Her gün bir kez civarı" },
          { id: "haftada", label: "Haftada birkaç kez" },
          { id: "nadiren", label: "Daha seyrek" },
        ],
      },
    ],
  },
  {
    id: "notlar",
    title: "Notların nasıl?",
    questions: [
      {
        id: "amac",
        kind: "multi",
        title: "Notlarını çoğunlukla ne için alıyorsun?",
        help: "En fazla 3 tane seç.",
        max: 3,
        options: [
          { id: "ogrenme", label: "Ders ve öğrenme" },
          { id: "arastirma", label: "Araştırma ya da tez" },
          { id: "proje", label: "Proje takibi" },
          { id: "yazi", label: "Yazı, kitap, senaryo" },
          { id: "fikir", label: "Fikir ve beyin fırtınası" },
          { id: "toplanti", label: "Toplantı notları" },
          { id: "kisisel", label: "Kişisel, günlük" },
          { id: "bilgi-bankasi", label: "İş için bilgi bankası" },
        ],
      },
      {
        id: "derinlik",
        kind: "single",
        title: "Notların en fazla kaç seviye iç içe gidiyor?",
        help: "Örneğin Tez › Bölüm 2 › Kaynaklar › Makale notu = 4 seviye.",
        options: [
          { id: "1", label: "Hepsi düz, iç içe değil" },
          { id: "2", label: "2 seviye" },
          { id: "3-4", label: "3–4 seviye" },
          { id: "5+", label: "5 ya da daha fazla" },
        ],
      },
      {
        id: "kaybolma",
        kind: "scale",
        title: "Notlarımın içinde neyin nerede olduğunu kaybediyorum.",
        min: 1,
        max: 5,
        low: "Hiç olmuyor",
        high: "Sürekli oluyor",
      },
      {
        id: "kaybolma-ani",
        kind: "text",
        long: true,
        optional: true,
        title: "Notlarında en son ne zaman kayboldun? Ne arıyordun, ne oldu?",
        placeholder: "Örneğin: Geçen hafta bir makaleden aldığım alıntıyı aradım, hangi bölümün altına koyduğumu hatırlamadım…",
      },
    ],
  },
  {
    id: "senaryo",
    title: "Hangisi sana benziyor?",
    intro: "Aşağıdaki durumlardan sana en yakın olanları seç.",
    questions: [
      {
        id: "senaryolar",
        kind: "multi",
        title: "En fazla 2 senaryo seç.",
        max: 2,
        options: scenarios,
      },
      {
        id: "kendi-senaryo",
        kind: "text",
        long: true,
        optional: true,
        title: "Kendi durumunu bir iki cümleyle anlatır mısın?",
        placeholder: "Neyi, neden not alıyorsun? Notların nasıl büyüyor?",
      },
    ],
  },
  {
    id: "fikir",
    title: "Arkipel fikri",
    intro:
      "Arkipel'de her konu bir ada. Alt notlar etrafında duran uydu adalar. İstediğin iki adayı birbirine bağlayabilirsin. Adaya girdiğinde düz bir defter açılıyor. Konuları İş, Tez, Kişisel gibi ayrı sayfalara, yani ayrı haritalara bölebiliyorsun. Telefonda ise sade bir not uygulaması olarak çalışıyor.",
    questions: [
      {
        id: "ilk-izlenim",
        kind: "scale",
        title: "İlk izlenimin ne?",
        min: 1,
        max: 5,
        low: "Bana göre değil",
        high: "Hemen denemek isterim",
      },
      {
        id: "ozellikler",
        kind: "matrix",
        title: "Bu özellikler senin için ne kadar önemli?",
        rows: features,
        levels: featureLevels,
      },
      {
        id: "cihazlar",
        kind: "multi",
        title: "Not alırken en çok hangi cihazları kullanıyorsun?",
        options: [
          { id: "telefon", label: "Telefon" },
          { id: "tarayici", label: "Bilgisayarda tarayıcı" },
          { id: "masaustu", label: "Masaüstü uygulaması" },
          { id: "tablet", label: "Tablet" },
        ],
      },
      {
        id: "odeme",
        kind: "single",
        title: "Sorununu çözüyorsa böyle bir uygulamaya ayda ne öderdin?",
        options: [
          { id: "0", label: "Ücretsiz olmalı" },
          { id: "1-3", label: "1–3 $" },
          { id: "4-7", label: "4–7 $" },
          { id: "8+", label: "8 $ ve üstü" },
        ],
      },
      {
        id: "endise",
        kind: "text",
        long: true,
        optional: true,
        title: "Bu fikirde seni rahatsız eden ya da eksik bulduğun bir şey var mı?",
      },
    ],
  },
];

export const allQuestions: Question[] = sections.flatMap((s) => s.questions);

export type Answers = Record<string, unknown>;
