// İlk açılışta gelen içerik: nasıl kullanılacağını anlatan bir sayfa ve dolu bir örnek.

import type { Actions } from "./actions";

export function seedWorkspace(a: Actions) {
  // Başlarken
  const start = a.createPage("Başlarken");
  const hello = a.createIsland({
    pageId: start,
    title: "Burası bir ada",
    x: 0,
    y: 0,
    blocks: [
      { type: "heading", level: 1, text: "Arkipel'e hoş geldin" },
      { type: "paragraph", text: "Her konu bir ada. Bir adaya tıklayınca defteri açılır, buraya düz yazı yazarsın." },
      {
        type: "bullets",
        items: [
          "Haritada boş bir yere çift tıkla: yeni ana ada.",
          "Bir ada seçiliyken Tab: yeni uydu ada.",
          "Adayı sürükle: uydularıyla birlikte taşınır.",
          "Bir adanın kenarındaki noktadan başka bir adaya sürükle: köprü kurulur.",
          "⌘K ya da Ctrl+K: bütün adalarda ara ve oraya uç.",
        ],
      },
    ],
  });
  a.createIsland({
    pageId: start,
    parentId: hello,
    title: "Ben bir uyduyum",
    blocks: [{ type: "paragraph", text: "Uydular ana adanın altındaki notlar. Onların da uyduları olabilir." }],
  });
  const sayfa = a.createIsland({
    pageId: start,
    parentId: hello,
    title: "Sayfalar",
    blocks: [{ type: "paragraph", text: "Üstteki sekmeler sayfalar. Her sayfa ayrı bir harita: İş, Tez, Kişisel gibi." }],
  });
  const liman = a.createIsland({
    pageId: start,
    parentId: hello,
    title: "Liman",
    blocks: [
      {
        type: "paragraph",
        text: "Telefondan ya da aceleyle aldığın notlar limana düşer. Sonra limandan alıp haritada istediğin yere koyarsın.",
      },
    ],
  });
  a.connect(sayfa, liman);

  // Örnek: Tez
  const thesis = a.createPage("Örnek: Tez");
  const tez = a.createIsland({
    pageId: thesis,
    title: "Tez",
    x: 0,
    y: 0,
    blocks: [
      { type: "heading", level: 1, text: "Kentsel ısı adaları" },
      { type: "paragraph", text: "Ana soru: Yeşil çatılar mahalle ölçeğinde yaz sıcaklığını ne kadar düşürüyor?" },
    ],
  });
  const kaynak = a.createIsland({ pageId: thesis, parentId: tez, title: "Kaynaklar" });
  a.createIsland({
    pageId: thesis,
    parentId: kaynak,
    title: "Oke 1982",
    blocks: [{ type: "paragraph", text: "Isı adası etkisinin temel tanımı. Bölüm 1'de alıntılanacak." }],
  });
  a.createIsland({ pageId: thesis, parentId: tez, title: "Bölüm 1: Giriş" });
  const b2 = a.createIsland({ pageId: thesis, parentId: tez, title: "Bölüm 2: Yöntem" });
  a.createIsland({ pageId: thesis, parentId: b2, title: "Ölçüm noktaları" });
  const ideas = a.createIsland({ pageId: thesis, title: "Makale fikirleri", x: 520, y: -60 });
  a.createIsland({ pageId: thesis, parentId: ideas, title: "Kısa rapor taslağı" });
  a.connect(kaynak, ideas);

  // Limanda bekleyen bir not
  a.createIsland({
    pageId: null,
    title: "Danışmana sorulacaklar",
    blocks: [{ type: "bullets", items: ["Veri seti izni", "Bölüm 2 teslim tarihi"] }],
  });
}
