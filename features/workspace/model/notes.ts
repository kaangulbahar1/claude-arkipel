// Defter içerikleri Y.XmlFragment olarak tutulur; Tiptap bunlara doğrudan bağlanır.
// Bu dosya editör olmadan içerik okumak (arama, önizleme) ve yazmak (örnek veri) için.

import * as Y from "yjs";

export type Block =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullets"; items: string[] };

function textNode(text: string) {
  const t = new Y.XmlText();
  t.insert(0, text);
  return t;
}

/** Düz blokları ProseMirror (StarterKit) şemasına uygun XML düğümlerine çevirir. */
export function writeBlocks(fragment: Y.XmlFragment, blocks: Block[]) {
  const nodes: Y.XmlElement[] = blocks.map((b) => {
    if (b.type === "bullets") {
      const list = new Y.XmlElement("bulletList");
      list.insert(
        0,
        b.items.map((item) => {
          const li = new Y.XmlElement("listItem");
          const p = new Y.XmlElement("paragraph");
          p.insert(0, [textNode(item)]);
          li.insert(0, [p]);
          return li;
        }),
      );
      return list;
    }
    const el = new Y.XmlElement(b.type);
    if (b.type === "heading") el.setAttribute("level", b.level as unknown as string);
    el.insert(0, [textNode(b.text)]);
    return el;
  });
  fragment.insert(fragment.length, nodes);
}

const BLOCK_NODES = new Set(["paragraph", "heading", "listItem", "blockquote", "codeBlock"]);

/** Bir defterin düz metni: bloklar arasında satır sonu. Arama ve önizleme için. */
export function fragmentText(fragment: Y.XmlFragment | Y.XmlElement | undefined): string {
  if (!fragment) return "";
  const parts: string[] = [];
  const walk = (node: Y.XmlFragment | Y.XmlElement | Y.XmlText) => {
    if (node instanceof Y.XmlText) {
      for (const op of node.toDelta() as { insert: unknown }[]) {
        if (typeof op.insert === "string") parts.push(op.insert);
      }
      return;
    }
    const children = node.toArray() as (Y.XmlElement | Y.XmlText)[];
    for (const child of children) {
      walk(child);
      if (child instanceof Y.XmlElement && BLOCK_NODES.has(child.nodeName)) parts.push("\n");
    }
  };
  walk(fragment);
  return parts.join("").replace(/\n{2,}/g, "\n").trim();
}
