"use client";

import { useActionState } from "react";
import { login } from "./actions";

export function LoginForm() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="panel login">
      <div className="panel-head">
        <span className="label">Sadece ekip için</span>
        <h1>Anket paneli</h1>
      </div>
      <div className="q">
        <label className="q-title" htmlFor="password">Şifre</label>
        <input id="password" name="password" type="password" className="input" autoComplete="current-password" required />
      </div>
      {error && <div className="alert" role="alert">{error}</div>}
      <button className="btn" disabled={pending}>{pending ? "Kontrol ediliyor…" : "Giriş yap"}</button>
    </form>
  );
}
