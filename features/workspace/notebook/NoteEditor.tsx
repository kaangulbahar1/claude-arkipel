"use client";

// Adanın defteri. İçerik doğrudan Yjs'deki XmlFragment'a yazılır; kaydet düğmesi yok.
// Biçimlendirme bilinçli olarak basit: başlıklar, kalın, italik, listeler, alıntı.

import Collaboration from "@tiptap/extension-collaboration";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useRef } from "react";
import type * as Y from "yjs";

type Props = {
  fragment: Y.XmlFragment;
  onChange?: () => void;
  autoFocus?: boolean;
};

export function NoteEditor({ fragment, onChange, autoFocus }: Props) {
  const changeRef = useRef(onChange);
  changeRef.current = onChange;

  const editor = useEditor(
    {
      immediatelyRender: false,
      autofocus: autoFocus ? "end" : false,
      extensions: [
        StarterKit.configure({ undoRedo: false, link: false, code: false, codeBlock: false, heading: { levels: [1, 2, 3] } }),
        Collaboration.configure({ fragment }),
        Placeholder.configure({ placeholder: "Yazmaya başla…" }),
      ],
      editorProps: { attributes: { class: "ark-prose", "aria-label": "Defter" } },
      onUpdate: ({ transaction }) => {
        if (transaction.docChanged) changeRef.current?.();
      },
    },
    [fragment],
  );

  if (!editor) return <div className="ark-prose ark-prose--loading" />;
  return (
    <div className="ark-editor">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

type Editor = NonNullable<ReturnType<typeof useEditor>>;

function Toolbar({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h1: e.isActive("heading", { level: 1 }),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
    }),
  });
  const c = () => editor.chain().focus();
  const buttons: { key: keyof typeof s; label: string; title: string; run: () => void }[] = [
    { key: "h1", label: "B1", title: "Büyük başlık", run: () => c().toggleHeading({ level: 1 }).run() },
    { key: "h2", label: "B2", title: "Başlık", run: () => c().toggleHeading({ level: 2 }).run() },
    { key: "h3", label: "B3", title: "Küçük başlık", run: () => c().toggleHeading({ level: 3 }).run() },
    { key: "bold", label: "K", title: "Kalın (⌘B)", run: () => c().toggleBold().run() },
    { key: "italic", label: "İ", title: "İtalik (⌘I)", run: () => c().toggleItalic().run() },
    { key: "bullet", label: "•", title: "Madde işaretli liste", run: () => c().toggleBulletList().run() },
    { key: "ordered", label: "1.", title: "Numaralı liste", run: () => c().toggleOrderedList().run() },
    { key: "quote", label: "❝", title: "Alıntı", run: () => c().toggleBlockquote().run() },
  ];
  return (
    <div className="ark-toolbar" role="toolbar" aria-label="Biçimlendirme">
      {buttons.map((b) => (
        <button
          key={b.key}
          type="button"
          className={`ark-tool ark-tool--${b.key}`}
          aria-pressed={s[b.key]}
          title={b.title}
          aria-label={b.title}
          onMouseDown={(e) => e.preventDefault()}
          onClick={b.run}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}
