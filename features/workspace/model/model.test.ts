import * as Y from "yjs";
import { describe, expect, it } from "vitest";
import { fragmentText } from "./notes";
import { ancestry, childrenOf, harborIslands } from "./selectors";
import { createWorkspaceStore } from "./store";

function setup() {
  let n = 0;
  let t = 1000;
  const store = createWorkspaceStore(new Y.Doc(), { newId: () => `id${++n}`, now: () => ++t });
  return { store, a: store.actions, ws: () => store.getSnapshot() };
}

describe("adalar", () => {
  it("uydu ebeveyninin sayfasına ve etrafına yerleşir", () => {
    const { a, ws } = setup();
    const page = a.createPage("Tez");
    const root = a.createIsland({ pageId: page, title: "Tez", x: 100, y: 100 });
    const sat = a.createIsland({ pageId: null, parentId: root, title: "Bölüm 1" });
    const s = ws().islands[sat];
    expect(s.pageId).toBe(page);
    expect(s.parentId).toBe(root);
    expect(Math.hypot(s.x - 100, s.y - 100)).toBeGreaterThan(100);
  });

  it("ana ada taşınınca bütün uydu ağacı aynı miktarda kayar", () => {
    const { a, ws } = setup();
    const page = a.createPage("P");
    const root = a.createIsland({ pageId: page, x: 0, y: 0 });
    const sat = a.createIsland({ pageId: page, parentId: root, x: 50, y: 0 });
    const deep = a.createIsland({ pageId: page, parentId: sat, x: 80, y: 20 });
    a.moveIsland(root, 10, -5);
    expect(ws().islands[sat]).toMatchObject({ x: 60, y: -5 });
    expect(ws().islands[deep]).toMatchObject({ x: 90, y: 15 });
    a.moveIsland(sat, 0, 0, false);
    expect(ws().islands[deep]).toMatchObject({ x: 90, y: 15 });
  });

  it("silinen adanın uyduları onun ebeveynine bağlanır, köprüleri ve defteri gider", () => {
    const { a, ws, store } = setup();
    const page = a.createPage("P");
    const root = a.createIsland({ pageId: page });
    const mid = a.createIsland({ pageId: page, parentId: root, blocks: [{ type: "paragraph", text: "x" }] });
    const leaf = a.createIsland({ pageId: page, parentId: mid });
    const other = a.createIsland({ pageId: page });
    a.connect(mid, other);
    a.deleteIsland(mid);
    expect(ws().islands[mid]).toBeUndefined();
    expect(ws().islands[leaf].parentId).toBe(root);
    expect(ws().bridges).toHaveLength(0);
    expect(store.collections.notes.has(mid)).toBe(false);
  });

  it("döngü oluşturan ebeveyn atamasını reddeder", () => {
    const { a } = setup();
    const page = a.createPage("P");
    const root = a.createIsland({ pageId: page });
    const sat = a.createIsland({ pageId: page, parentId: root });
    expect(() => a.setParent(root, sat)).toThrow();
    expect(() => a.setParent(root, root)).toThrow();
  });

  it("farklı sayfadaki adaya uydu olarak bağlanamaz", () => {
    const { a } = setup();
    const p1 = a.createPage("1");
    const p2 = a.createPage("2");
    const x = a.createIsland({ pageId: p1 });
    const y = a.createIsland({ pageId: p2 });
    expect(() => a.setParent(x, y)).toThrow();
  });

  it("ancestry kökten adaya yolu verir", () => {
    const { a, ws } = setup();
    const page = a.createPage("P");
    const r = a.createIsland({ pageId: page, title: "Tez" });
    const b = a.createIsland({ pageId: page, parentId: r, title: "Bölüm 2" });
    const k = a.createIsland({ pageId: page, parentId: b, title: "Kaynaklar" });
    expect(ancestry(ws(), k).map((i) => i.title)).toEqual(["Tez", "Bölüm 2", "Kaynaklar"]);
  });
});

describe("liman", () => {
  it("limandan haritaya yerleştirilen ada uydularıyla birlikte gelir", () => {
    const { a, ws } = setup();
    const page = a.createPage("P");
    const note = a.createIsland({ pageId: null, title: "Hızlı not" });
    expect(harborIslands(ws()).map((i) => i.id)).toEqual([note]);
    a.placeIsland(note, page, 300, 200);
    expect(ws().islands[note]).toMatchObject({ pageId: page, x: 300, y: 200, parentId: null });
    expect(harborIslands(ws())).toHaveLength(0);
  });

  it("limana gönderilen adanın uyduları haritada kalır", () => {
    const { a, ws } = setup();
    const page = a.createPage("P");
    const root = a.createIsland({ pageId: page });
    const mid = a.createIsland({ pageId: page, parentId: root });
    const leaf = a.createIsland({ pageId: page, parentId: mid });
    a.sendToHarbor(mid);
    expect(ws().islands[mid]).toMatchObject({ pageId: null, parentId: null });
    expect(ws().islands[leaf]).toMatchObject({ pageId: page, parentId: root });
    expect(childrenOf(ws(), root).map((i) => i.id)).toEqual([leaf]);
  });
});

describe("köprüler", () => {
  it("aynı çifti iki kez bağlamaz, kendine ve doğrudan ebeveynine bağlamaz", () => {
    const { a, ws } = setup();
    const page = a.createPage("P");
    const x = a.createIsland({ pageId: page });
    const y = a.createIsland({ pageId: page });
    const sat = a.createIsland({ pageId: page, parentId: x });
    const b1 = a.connect(x, y);
    expect(a.connect(y, x)).toBe(b1);
    expect(a.connect(x, x)).toBeNull();
    expect(a.connect(x, sat)).toBeNull();
    expect(ws().bridges).toHaveLength(1);
  });

  it("farklı sayfalardaki adaları bağlayabilir", () => {
    const { a, ws } = setup();
    const x = a.createIsland({ pageId: a.createPage("1") });
    const y = a.createIsland({ pageId: a.createPage("2") });
    expect(a.connect(x, y)).not.toBeNull();
    expect(ws().bridges).toHaveLength(1);
  });
});

describe("sayfalar", () => {
  it("sayfa silinince üzerindeki adalar ve köprüleri de silinir, diğer sayfalar etkilenmez", () => {
    const { a, ws } = setup();
    const p1 = a.createPage("1");
    const p2 = a.createPage("2");
    const x = a.createIsland({ pageId: p1 });
    const y = a.createIsland({ pageId: p2 });
    a.connect(x, y);
    a.deletePage(p1);
    expect(ws().pages.map((p) => p.id)).toEqual([p2]);
    expect(Object.keys(ws().islands)).toEqual([y]);
    expect(ws().bridges).toHaveLength(0);
  });

  it("sekmeleri yeniden sıralar", () => {
    const { a, ws } = setup();
    const p1 = a.createPage("1");
    const p2 = a.createPage("2");
    a.reorderPages([p2, p1]);
    expect(ws().pages.map((p) => p.title)).toEqual(["2", "1"]);
  });
});

describe("geri alma ve örnek içerik", () => {
  it("silmeyi geri alınca ada, defteri ve köprüsü geri gelir", () => {
    const { a, ws, store } = setup();
    const page = a.createPage("P");
    const x = a.createIsland({ pageId: page, blocks: [{ type: "paragraph", text: "önemli not" }] });
    const y = a.createIsland({ pageId: page });
    a.connect(x, y);
    store.checkpoint();
    a.deleteIsland(x);
    store.undo();
    expect(ws().islands[x]).toBeDefined();
    expect(ws().bridges).toHaveLength(1);
    expect(fragmentText(store.collections.notes.get(x))).toBe("önemli not");
  });

  it("örnek içerik bir kez yazılır ve geri alma geçmişine girmez", () => {
    const { store, ws } = setup();
    expect(store.seedIfEmpty()).toBe(true);
    expect(store.seedIfEmpty()).toBe(false);
    expect(ws().pages.length).toBe(2);
    expect(harborIslands(ws())).toHaveLength(1);
    expect(store.canUndo()).toBe(false);
  });

  it("defter metni başlık, paragraf ve listeleri satırlara ayırır", () => {
    const { a, store } = setup();
    const id = a.createIsland({
      pageId: null,
      blocks: [
        { type: "heading", level: 1, text: "Başlık" },
        { type: "paragraph", text: "Paragraf" },
        { type: "bullets", items: ["bir", "iki"] },
      ],
    });
    expect(fragmentText(store.collections.notes.get(id))).toBe("Başlık\nParagraf\nbir\niki");
  });
});

describe("yerleşim", () => {
  it("boş yer mevcut adaların sağında olur", async () => {
    const { freeSpot } = await import("./selectors");
    const { a, ws } = setup();
    const page = a.createPage("P");
    expect(freeSpot(ws(), page)).toEqual({ x: 0, y: 0 });
    a.createIsland({ pageId: page, x: 100, y: 50 });
    a.createIsland({ pageId: page, x: 400, y: 150 });
    expect(freeSpot(ws(), page)).toEqual({ x: 720, y: 100 });
  });
});

describe("eş zamanlı ilk açılış", () => {
  it("iki kopya aynı anda örnek içerik yazıp birleşse de sayfalar çoğalmaz", () => {
    const a = createWorkspaceStore(new Y.Doc());
    const b = createWorkspaceStore(new Y.Doc());
    a.seedIfEmpty();
    b.seedIfEmpty();
    Y.applyUpdate(a.doc, Y.encodeStateAsUpdate(b.doc));
    Y.applyUpdate(b.doc, Y.encodeStateAsUpdate(a.doc));
    expect(a.getSnapshot().pages).toHaveLength(2);
    expect(a.getSnapshot().pages.map((p) => p.id)).toEqual(b.getSnapshot().pages.map((p) => p.id));
    expect(Object.keys(a.getSnapshot().islands).length).toBe(Object.keys(b.getSnapshot().islands).length);
  });

  it("iki cihazda aynı adanın farklı alanları değişince ikisi de korunur", () => {
    const a = createWorkspaceStore(new Y.Doc());
    const id = a.actions.createIsland({ pageId: a.actions.createPage("P"), title: "Eski", x: 0, y: 0 });
    const b = createWorkspaceStore(new Y.Doc());
    Y.applyUpdate(b.doc, Y.encodeStateAsUpdate(a.doc));
    a.actions.renameIsland(id, "Yeni ad");
    b.actions.moveIsland(id, 200, 100);
    Y.applyUpdate(a.doc, Y.encodeStateAsUpdate(b.doc));
    Y.applyUpdate(b.doc, Y.encodeStateAsUpdate(a.doc));
    for (const s of [a, b]) expect(s.getSnapshot().islands[id]).toMatchObject({ title: "Yeni ad", x: 200, y: 100 });
  });
});
