# Arkipel uygulama mimarisi

Uygulama `/app` adresinde çalışır. Kayıt gerektirmez; bütün veriler tarayıcıda (IndexedDB) durur.
Bu yapı ileride hesap ve cihazlar arası senkron eklenecek şekilde kuruldu: veri katmanı Yjs (CRDT)
üzerinde, arayüz ise Yjs'yi hiç görmüyor.

## Katmanlar

```
app/app/                      Next.js rotası; uygulamayı sadece tarayıcıda yükler
features/workspace/
  model/                      Veri modeli. React'e bağımlı değil, testleri burada.
    types.ts                  Page, Island, Bridge, Workspace
    doc.ts                    Yjs belge yapısı ve okuma yardımcıları
    actions.ts                Bütün değişiklikler ve kuralları (tek yer)
    selectors.ts              Saf sorgular: uydular, yol, liman, boş yer...
    notes.ts                  Defter içeriğini okuma/yazma (arama, örnek veri)
    store.ts                  Anlık görüntü, abonelik, geri alma, IndexedDB
    seed.ts                   İlk açılıştaki "Başlarken" ve "Örnek: Tez" içeriği
    model.test.ts             Kural testleri (npm test)
  WorkspaceProvider.tsx       useWorkspace(), useStore(), useActions()
  shell/                      Çerçeve: üst çubuk, sekmeler, seçim durumu, bildirim, komutlar
  map/                        Harita (React Flow): ada düğümü, çizgiler, sürükleme, kısayollar
  notebook/                   Defter paneli ve Tiptap editörü
  search/                     ⌘K arama paleti
  harbor/                     Liman listesi ve çekmecesi
  mobile/                     Dar ekran: ağaç listesi + tam ekran defter
```

Veri akışı tek yönlü:

```
kullanıcı → useCommands / actions → Y.Doc → store.getSnapshot() → useWorkspace() → bileşenler
```

## Veri modeli

| Kavram | Alanlar | Kural |
| --- | --- | --- |
| Sayfa | `title`, `order`, `viewport` | Her sayfa ayrı bir harita |
| Ada | `pageId`, `parentId`, `title`, `x`, `y` | `parentId` boş = ana ada. `pageId` boş = limanda. Uydu her zaman ebeveyniyle aynı sayfada. Derinlik sınırı yok |
| Köprü | `from`, `to` | Yönsüz. Farklı sayfalar arasında da olabilir. Ada kendisine ya da doğrudan uydusuna bağlanamaz |
| Defter | ada id → `Y.XmlFragment` | Tiptap doğrudan buna yazar; kaydet düğmesi yok |

- Ada silinince uyduları bir üst adaya bağlanır, köprüleri ve defteri silinir. Her şey geri alınabilir (⌘Z).
- Ana ada sürüklenince bütün uydu ağacı onunla taşınır. Alt tuşuyla sürüklenirse uydular yerinde kalır.
- Her kayıt ayrı bir `Y.Map` olduğu için iki cihazda aynı adanın başlığı ve konumu ayrı ayrı değişirse ikisi de korunur (bkz. testler).

## Sık yapılacak değişiklikler

| İstek | Nereye bak |
| --- | --- |
| Adaya yeni bir alan (renk, ikon, etiket) | `types.ts` + `doc.ts` (`readIsland`) + `actions.ts`, sonra `map/IslandNode.tsx` |
| Yeni bir kural ya da işlem | `actions.ts` + `model.test.ts`'e test; arayüzden `shell/useCommands.ts` ile çağır |
| Ada boyutları, uydu yerleşimi | `map/geometry.ts`, `selectors.ts` (`satellitePosition`) |
| Adanın görünümü | `map/IslandNode.tsx` + `app/app/app.css` (`.ark-node*`) |
| Çizgilerin görünümü | `map/SeaEdge.tsx` + `.ark-edge*` |
| Klavye kısayolları | `map/MapView.tsx` (harita), `shell/AppShell.tsx` (⌘K) |
| Editör biçimleri | `notebook/NoteEditor.tsx` (StarterKit ayarları ve araç çubuğu) |
| İlk açılış içeriği | `model/seed.ts` |
| Renkler, fontlar | `app/globals.css` (değişkenler), `app/app/app.css` (uygulama) |

## Kontroller

```bash
npm test        # model kuralları (vitest)
npm run lint    # TypeScript
npm run build
```

## Sonraki adımlar

1. **Dışa aktarma:** Bütün sayfaları Markdown dosyaları olarak indirme (klasör = sayfa, dosya = ada).
2. **Sürükleyerek bağlama:** Bir adayı başka bir adanın üzerine bırakınca uydusu olsun.
3. **Hesap ve senkron:** `store.ts`'e bir Yjs sağlayıcısı (ör. Supabase Realtime ya da y-websocket
   sunucusu) takılacak. Model ve arayüz değişmeyecek.
4. **Masaüstü ve mobil paket:** Aynı web uygulaması Tauri (masaüstü) ve Capacitor ya da PWA (mobil) ile
   paketlenecek.
5. **Sayfalar arası köprüleri haritada gösterme:** Şu an adada "↗2" rozeti ve defterde liste olarak görünüyor.
