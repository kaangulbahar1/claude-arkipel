// Yjs belge yapısı. Bütün çalışma alanı tek bir Y.Doc içinde durur:
//
//   pages:   Y.Map<Y.Map>          id -> sayfa alanları
//   islands: Y.Map<Y.Map>          id -> ada alanları
//   bridges: Y.Map<Y.Map>          id -> köprü alanları
//   notes:   Y.Map<Y.XmlFragment>  ada id -> defter içeriği (Tiptap/ProseMirror)
//   meta:    Y.Map                 şema sürümü vb.
//
// Her kayıt ayrı bir Y.Map olduğu için iki cihazda aynı adanın farklı alanları
// (biri başlığı, diğeri konumu) değiştirildiğinde ikisi de korunur.

import * as Y from "yjs";
import type { Bridge, Island, Page } from "./types";

export const SCHEMA_VERSION = 1;

/** Kullanıcının yaptığı değişiklikler bu kaynakla işaretlenir; geri alma sadece bunları izler. */
export const LOCAL = Symbol("arkipel-local");

export type Collections = {
  doc: Y.Doc;
  pages: Y.Map<Y.Map<unknown>>;
  islands: Y.Map<Y.Map<unknown>>;
  bridges: Y.Map<Y.Map<unknown>>;
  notes: Y.Map<Y.XmlFragment>;
  meta: Y.Map<unknown>;
};

export function collections(doc: Y.Doc): Collections {
  return {
    doc,
    pages: doc.getMap("pages"),
    islands: doc.getMap("islands"),
    bridges: doc.getMap("bridges"),
    notes: doc.getMap("notes"),
    meta: doc.getMap("meta"),
  };
}

export function toYMap(record: Record<string, unknown>): Y.Map<unknown> {
  const m = new Y.Map<unknown>();
  for (const [k, v] of Object.entries(record)) if (v !== undefined) m.set(k, v);
  return m;
}

export function readPage(m: Y.Map<unknown>): Page {
  return {
    id: m.get("id") as string,
    title: (m.get("title") as string) ?? "",
    order: (m.get("order") as number) ?? 0,
    createdAt: (m.get("createdAt") as number) ?? 0,
    viewport: m.get("viewport") as Page["viewport"],
  };
}

export function readIsland(m: Y.Map<unknown>): Island {
  return {
    id: m.get("id") as string,
    pageId: (m.get("pageId") as string | null) ?? null,
    parentId: (m.get("parentId") as string | null) ?? null,
    title: (m.get("title") as string) ?? "",
    x: (m.get("x") as number) ?? 0,
    y: (m.get("y") as number) ?? 0,
    createdAt: (m.get("createdAt") as number) ?? 0,
    updatedAt: (m.get("updatedAt") as number) ?? 0,
  };
}

export function readBridge(m: Y.Map<unknown>): Bridge {
  return {
    id: m.get("id") as string,
    from: m.get("from") as string,
    to: m.get("to") as string,
    createdAt: (m.get("createdAt") as number) ?? 0,
  };
}
