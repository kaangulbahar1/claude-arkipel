// Arkipel'in temel veri tipleri. Arayüz sadece bu tiplerle çalışır; Yjs ayrıntısı model/ klasöründe kalır.

export type Id = string;

export type Viewport = { x: number; y: number; zoom: number };

/** Bir sayfa = bir harita (takımada). Örneğin "İş", "Tez", "Kişisel". */
export type Page = {
  id: Id;
  title: string;
  /** Sekmelerin sırası. Küçükten büyüğe. */
  order: number;
  createdAt: number;
  /** Haritanın en son bırakıldığı görünüm. */
  viewport?: Viewport;
};

/**
 * Ada = bir not. `parentId` boşsa ana ada, doluysa uydu adadır; uyduların da uyduları olabilir.
 * `pageId` boşsa not henüz haritaya yerleştirilmemiştir ve limanda bekler.
 */
export type Island = {
  id: Id;
  pageId: Id | null;
  parentId: Id | null;
  title: string;
  x: number;
  y: number;
  createdAt: number;
  updatedAt: number;
};

/** İki ada arasındaki serbest bağ. Yönü yoktur; adalar farklı sayfalarda olabilir. */
export type Bridge = {
  id: Id;
  from: Id;
  to: Id;
  createdAt: number;
};

/** Arayüzün okuduğu değişmez anlık görüntü. */
export type Workspace = {
  pages: Page[];
  islands: Record<Id, Island>;
  bridges: Bridge[];
};
