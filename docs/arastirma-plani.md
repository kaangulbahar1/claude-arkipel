# Arkipel kullanıcı araştırması

## Amaç

Uygulamayı yazmadan önce şu soruya cevap aramak: **İç içe notlarda kaybolma sorunu kimde,
ne kadar güçlü yaşanıyor ve ada haritası bu insanlara çekici geliyor mu?**

## Ürün kararları (araştırmanın girdisi)

- **Sayfa › Ana ada › Uydu ada.** Her sayfa ayrı bir harita.
- Her ada kendi defteri. Defter sırası sorunu bu sayede ortadan kalkıyor.
- Adalar arasında serbest köprüler. Açık soru: farklı sayfalar arasında köprü olacak mı?
- Mobilde harita değil, sade not uygulaması. Hızlı notlar "limana" düşer, masaüstünde haritaya yerleştirilir.

## Hipotezler ve bunları ölçen sorular

| Hipotez | Ölçüm | Doğrulanmış sayılır eğer |
| --- | --- | --- |
| H1: Derin not yapısı olanlar sık kayboluyor | `derinlik` × `kaybolma` | 3+ seviyedekilerin kaybolma ortalaması, 1–2 seviyedekilerden belirgin yüksek |
| H2: Yeterince büyük bir çekirdek kitle var | Çekirdek segment (3+ seviye ve kaybolma 4–5) | Katılımcıların en az %25'i |
| H3: Çekirdek kitle harita fikrini seviyor | Çekirdekte `ilk-izlenim` | Ortalama ≥ 3.8 ve diğerlerinden yüksek |
| H4: En güçlü senaryo belli | Senaryolara göre kaybolma ve ilk izlenim | Bir ya da iki senaryo açıkça öne çıkıyor |
| H5: İlk sürümün kapsamı | Özellik skoru (çekirdek segmentte) | "Olmazsa olmaz" oranı ≥ %50 olanlar MVP'ye girer |
| H6: Mobil ikincil | `cihazlar`, "Mobilde hızlı not" skoru | Telefon ağırlıklıysa liman MVP'ye taşınır |
| H7: Ödeme isteği var | Çekirdekte `odeme` | En az %30'u 4 $ ve üstü |

## Senaryolar

Katılımcılar en fazla iki senaryo seçiyor. Senaryolar hem segment tanımı hem de ilk sürümün
örnek şablonları için kullanılacak:

1. **Tez ya da araştırma:** kaynaklar, bölümler, alıntılar
2. **Roman, senaryo ya da oyun dünyası:** karakterler, mekânlar, sahneler
3. **Ürün ya da proje yönetimi:** özellikler, kararlar, toplantılar
4. **Ders çalışma:** dersler › üniteler › konular
5. **Kişisel bilgi bahçesi:** okunanlar, fikirler, yıllar içinde büyüyen notlar
6. **Hızlı yakalama:** telefonda anlık notlar

## Dağıtım

Hedef: ilk 2 haftada **en az 100 cevap**. Her kanal için ayrı `?kaynak=` etiketi kullan:

- Obsidian, Notion ve Logseq toplulukları (Türkçe Discord/Telegram grupları, r/ObsidianMD vb.)
- Üniversite grupları, tez yazan yüksek lisans ve doktora öğrencileri
- Yazar ve senarist toplulukları
- LinkedIn ve X paylaşımları

## Haftalık döngü

Anket herkese açık ve gelen cevaplarla şekillenecek. Her hafta:

1. **Panele bak** (`/panel`): Kaç cevap geldi, hangi kaynaktan? Hipotezlerin durumu değişti mi?
2. **Son açık uçlu cevapları oku.** Tekrar eden bir şikâyet ya da beklenmedik bir kullanım var mı?
3. **Anketi güncelle** (gerekirse): Anlaşılmayan soruyu netleştir, sık çıkan "Diğer" cevaplarını seçeneğe
   çevir, yeni bir hipotezi test edecek soruyu ekle. Kurallar ve günlük: [anket-surumleri.md](anket-surumleri.md).
4. **Ürün kararlarını güncelle:** Bu dosyadaki "Ürün kararları" bölümüne, veriden çıkan kararı ve
   dayandığı sayıyı yaz.
5. **Dağıtımı ayarla:** Çekirdek kitleyi en çok getiren kanala ağırlık ver.

## Veriyle sonra ne yapacağız

1. **İlk 30 cevaptan sonra:** `npm run analiz` ile ara rapor çıkar. Anlaşılmayan ya da herkesin
   aynı cevabı verdiği soruları düzelt, `SURVEY_VERSION`'ı artır.
2. **Açık uçlu cevapları kodla:** `rapor/acik-uclu.md`'yi tema bazında etiketle ("aynı notu
   birden çok yerde tutmak", "arama işe yaramıyor", "bağlamı unutmak" gibi). Bu iş Claude ile yapılabilir.
3. **Persona çıkar:** Çekirdek segmentteki en güçlü 2–3 senaryodan birer persona yaz.
4. **Görüşmeler:** Görüşmeye onay veren çekirdek kişilerden 5–8 kişiyle 20 dakikalık görüşme yap
   (aşağıdaki akış).
5. **MVP kapsamı:** H5 tablosundan özellik listesini çıkar. Personaların senaryolarından
   hazır sayfa şablonları üret.
6. **Beta listesi:** Prototip hazır olunca önce görüşmeye katılanlara, sonra beta listesine aç.

## Görüşme akışı (20 dk)

1. Bana en son not aldığın şeyi gösterir misin? Nasıl düzenlemiştin? (5 dk)
2. En son ne zaman bir notu bulamadın? O an ne yaptın? (5 dk)
3. Tanıtım sayfasındaki haritayı göster: Burada ne görüyorsun? Nereye tıklardın? (5 dk)
4. Bu uygulama yarın çıksa, şu an kullandığın aracı bırakmanı ne engellerdi? (5 dk)

Fikri anlatıp "beğendin mi" diye sorma. Geçmişteki gerçek davranışı sor.

## Kişisel veri

- Anket cevapları anonim. E-posta sadece katılımcı isterse ve açık onay verirse alınır.
- E-postalar ayrı bir tabloda (`survey_contacts`) tutulur, analiz çıktılarına girmez.
- Silme talebinde `survey_contacts` satırı silinir; cevap anonim olarak kalabilir.
