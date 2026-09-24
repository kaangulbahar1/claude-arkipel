"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { type Answers, type Question, sections, SURVEY_VERSION } from "@/lib/survey";
import { checkAll, OTHER } from "@/lib/validate";

const DRAFT_KEY = `arkipel-anket-${SURVEY_VERSION}`;
const steps = [...sections.map((s) => s.title), "Beta listesi"];

type Contact = { email: string; beta: boolean; interview: boolean; consent: boolean };
type Draft = { answers: Answers; other: Record<string, string>; contact: Contact; step: number };

const emptyContact: Contact = { email: "", beta: false, interview: false, consent: false };

function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

export function SurveyForm() {
  const params = useSearchParams();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [other, setOther] = useState<Record<string, string>>({});
  const [contact, setContact] = useState<Contact>(emptyContact);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [honeypot, setHoneypot] = useState("");
  const startedAt = useRef(Date.now());
  const panelRef = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);

  // Yarım kalan anketi bu tarayıcıda hatırla.
  useEffect(() => {
    const d = loadDraft();
    if (d) {
      setAnswers(d.answers ?? {});
      setOther(d.other ?? {});
      setContact({ ...emptyContact, ...d.contact });
      setStep(Math.min(Math.max(d.step ?? 0, 0), steps.length - 1));
    }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current || status === "done") return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ answers, other, contact, step }));
    } catch {}
  }, [answers, other, contact, step, status]);

  const isContactStep = step === sections.length;
  const section = sections[step];

  function setAnswer(id: string, value: unknown) {
    setAnswers((a) => ({ ...a, [id]: value }));
    setErrors((e) => {
      if (!e[id]) return e;
      const { [id]: _, ...rest } = e;
      return rest;
    });
  }

  function goTo(next: number) {
    setStep(next);
    setFormError(null);
    requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
      panelRef.current?.focus({ preventScroll: true });
    });
  }

  function next() {
    const errs = checkAll(answers, other, section.questions);
    setErrors(errs);
    if (Object.keys(errs).length) {
      setFormError("Devam etmeden önce işaretli soruları cevapla.");
      const first = section.questions.find((q) => errs[q.id]);
      if (first) document.getElementById(`q-${first.id}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    goTo(step + 1);
  }

  async function submit() {
    setFormError(null);
    if (contact.email && !contact.consent) {
      setFormError("E-postanı saklamamız için onay kutusunu işaretlemen gerekiyor.");
      return;
    }
    if ((contact.beta || contact.interview) && !contact.email) {
      setFormError("Sana ulaşabilmemiz için e-posta adresini yazman gerekiyor.");
      return;
    }
    const allErrors = checkAll(answers, other);
    if (Object.keys(allErrors).length) {
      const firstStep = sections.findIndex((s) => s.questions.some((q) => allErrors[q.id]));
      setErrors(allErrors);
      goTo(firstStep);
      setFormError("Bu bölümde eksik cevaplar var.");
      return;
    }

    setStatus("sending");
    try {
      const res = await fetch("/api/anket", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          version: SURVEY_VERSION,
          answers,
          other: Object.fromEntries(Object.entries(other).filter(([, v]) => v.trim())),
          contact: { ...contact, email: contact.email.trim() },
          meta: {
            durationSec: Math.round((Date.now() - startedAt.current) / 1000),
            source: params.get("kaynak")?.slice(0, 100) || undefined,
          },
          website: honeypot || undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("idle");
        setFormError(body.error ?? "Cevabın kaydedilemedi. Tekrar dener misin?");
        return;
      }
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {}
      setStatus("done");
    } catch {
      setStatus("idle");
      setFormError("Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.");
    }
  }

  if (status === "done") {
    return (
      <div className="survey">
        <div className="panel done">
          <span className="label">Kaydedildi</span>
          <h1>Teşekkürler, cevabın haritaya eklendi.</h1>
          <p>
            {contact.beta
              ? "Beta açıldığında ilk haber verdiklerimizden biri olacaksın."
              : "Cevapların ilk sürümün şeklini doğrudan belirleyecek."}{" "}
            Tanıdığın ve notlarında kaybolan biri varsa bu sayfayı onunla paylaşabilirsin.
          </p>
          <Link href="/" className="btn btn--ghost">Ana sayfaya dön</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="survey">
      <ol className="route" style={{ ["--steps" as string]: steps.length }} aria-label="Anket adımları">
        {steps.map((title, i) => (
          <li key={title} data-state={i < step ? "done" : i === step ? "current" : "todo"}
            aria-current={i === step ? "step" : undefined}>
            <span className="bar" />
            <span className="label">{title}</span>
          </li>
        ))}
      </ol>

      <div className="panel" ref={panelRef} tabIndex={-1} style={{ outline: "none" }}>
        <div className="panel-head">
          <span className="label">Adım {step + 1} / {steps.length}</span>
          <h1>{isContactStep ? "Haberdar olmak ister misin?" : section.title}</h1>
          {isContactStep ? (
            <p>Bu bölüm isteğe bağlı. Boş bırakıp doğrudan gönderebilirsin.</p>
          ) : (
            section.intro && <p>{section.intro}</p>
          )}
        </div>

        {isContactStep ? (
          <ContactStep contact={contact} setContact={setContact} />
        ) : (
          section.questions.map((q) => (
            <QuestionField key={q.id} q={q} value={answers[q.id]} otherText={other[q.id] ?? ""}
              error={errors[q.id]} onChange={(v) => setAnswer(q.id, v)}
              onOther={(t) => setOther((o) => ({ ...o, [q.id]: t }))} />
          ))
        )}

        <div className="hp" aria-hidden="true">
          <label htmlFor="website">Web sitesi</label>
          <input id="website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
        </div>

        {formError && <div className="alert" role="alert">{formError}</div>}

        <div className="nav">
          {step > 0 ? (
            <button type="button" className="btn btn--ghost" onClick={() => goTo(step - 1)}>Geri</button>
          ) : (
            <span className="nav-status">Cevapların bu tarayıcıda saklanır, yarıda bırakabilirsin.</span>
          )}
          {isContactStep ? (
            <button type="button" className="btn btn--accent" onClick={submit} disabled={status === "sending"}>
              {status === "sending" ? "Gönderiliyor…" : "Gönder"}
            </button>
          ) : (
            <button type="button" className="btn" onClick={next}>Devam</button>
          )}
        </div>
      </div>
    </div>
  );
}

function QuestionField({ q, value, otherText, error, onChange, onOther }: {
  q: Question;
  value: unknown;
  otherText: string;
  error?: string;
  onChange: (v: unknown) => void;
  onOther: (t: string) => void;
}) {
  const errId = error ? `err-${q.id}` : undefined;
  const title = (
    <>
      {q.title} {q.optional && <span className="q-optional">(isteğe bağlı)</span>}
    </>
  );

  if (q.kind === "text") {
    const text = typeof value === "string" ? value : "";
    return (
      <div className="q" id={`q-${q.id}`}>
        <label className="q-title" htmlFor={`in-${q.id}`}>{title}</label>
        {q.help && <p className="q-help">{q.help}</p>}
        <textarea id={`in-${q.id}`} className="textarea" value={text} maxLength={2000}
          placeholder={q.placeholder} aria-describedby={errId} onChange={(e) => onChange(e.target.value)} />
        <span className="counter">{text.length} / 2000</span>
        {error && <p className="q-error" id={errId}>{error}</p>}
      </div>
    );
  }

  if (q.kind === "scale") {
    return (
      <fieldset className="q scale" id={`q-${q.id}`} aria-describedby={errId}>
        <legend>{title}</legend>
        <div className="scale-options">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="choice">
              <input type="radio" name={q.id} id={`in-${q.id}-${n}`} checked={value === n} onChange={() => onChange(n)} />
              <span className="choice-label">{n}</span>
            </label>
          ))}
        </div>
        <div className="scale-ends"><span>1 · {q.low}</span><span>5 · {q.high}</span></div>
        {error && <p className="q-error" id={errId}>{error}</p>}
      </fieldset>
    );
  }

  if (q.kind === "matrix") {
    const v = (value && typeof value === "object" ? value : {}) as Record<string, string>;
    return (
      <fieldset className="q" id={`q-${q.id}`} aria-describedby={errId}>
        <legend>{title}</legend>
        <div className="matrix">
          <table>
            <thead>
              <tr>
                <th scope="col"><span className="hp">Özellik</span></th>
                {q.levels.map((l) => <th key={l.id} scope="col">{l.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {q.rows.map((r) => (
                <tr key={r.id} data-missing={Boolean(error && !v[r.id])}>
                  <th scope="row">{r.label}{r.hint && <small>{r.hint}</small>}</th>
                  {q.levels.map((l) => (
                    <td key={l.id}>
                      <label>
                        <input type="radio" name={`${q.id}-${r.id}`} id={`in-${q.id}-${r.id}-${l.id}`}
                          aria-label={`${r.label}: ${l.label}`} checked={v[r.id] === l.id}
                          onChange={() => onChange({ ...v, [r.id]: l.id })} />
                        <span className="m-lvl" aria-hidden="true">{l.label}</span>
                      </label>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {error && <p className="q-error" id={errId}>{error}</p>}
      </fieldset>
    );
  }

  // single ve multi
  const multi = q.kind === "multi";
  const selected: string[] = multi ? (Array.isArray(value) ? (value as string[]) : []) : typeof value === "string" ? [value] : [];
  const max = q.kind === "multi" ? q.max : undefined;
  const options = q.other ? [...q.options, { id: OTHER, label: "Diğer" }] : q.options;
  const hasHints = options.some((o) => o.hint);

  function toggle(id: string) {
    if (!multi) return onChange(id);
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  return (
    <fieldset className="q" id={`q-${q.id}`} aria-describedby={errId}>
      <legend>{title}</legend>
      {q.help && <p className="q-help">{q.help}</p>}
      <div className={hasHints ? "choices" : "choices choices--grid"}>
        {options.map((o) => {
          const checked = selected.includes(o.id);
          const disabled = Boolean(multi && max && !checked && selected.length >= max);
          return (
            <label key={o.id} className="choice">
              <input type={multi ? "checkbox" : "radio"} name={q.id} id={`in-${q.id}-${o.id}`}
                checked={checked} disabled={disabled} onChange={() => toggle(o.id)} />
              <span className="choice-body">
                <span className="choice-label">{o.label}</span>
                {o.hint && <span className="choice-hint">{o.hint}</span>}
              </span>
            </label>
          );
        })}
      </div>
      {selected.includes(OTHER) && (
        <input className="input" id={`in-${q.id}-diger-text`} aria-label="Diğer: açıkla" placeholder="Kısaca yaz"
          maxLength={300} value={otherText} onChange={(e) => onOther(e.target.value)} />
      )}
      {error && <p className="q-error" id={errId}>{error}</p>}
    </fieldset>
  );
}

function ContactStep({ contact, setContact }: { contact: Contact; setContact: (c: Contact) => void }) {
  const set = (patch: Partial<Contact>) => setContact({ ...contact, ...patch });
  return (
    <>
      <div className="q">
        <label className="q-title" htmlFor="in-email">E-posta adresin <span className="q-optional">(isteğe bağlı)</span></label>
        <input id="in-email" className="input" type="email" autoComplete="email" inputMode="email"
          placeholder="ornek@eposta.com" value={contact.email} onChange={(e) => set({ email: e.target.value })} />
      </div>
      <div className="q">
        <label className="check">
          <input type="checkbox" id="in-beta" checked={contact.beta} onChange={(e) => set({ beta: e.target.checked })} />
          <span>Beta açıldığında bana haber verin.</span>
        </label>
        <label className="check">
          <input type="checkbox" id="in-interview" checked={contact.interview} onChange={(e) => set({ interview: e.target.checked })} />
          <span>
            20 dakikalık bir görüşmeye katılabilirim.
            <small>Not alma alışkanlıklarını birlikte konuşmak için.</small>
          </span>
        </label>
        {contact.email && (
          <label className="check">
            <input type="checkbox" id="in-consent" checked={contact.consent} onChange={(e) => set({ consent: e.target.checked })} />
            <span>
              E-postamın sadece Arkipel ile ilgili haber ve görüşme daveti için saklanmasına onay veriyorum.
              <small>Anket cevapların e-postandan ayrı tutulur. İstediğin zaman silinmesini isteyebilirsin.</small>
            </span>
          </label>
        )}
      </div>
    </>
  );
}
