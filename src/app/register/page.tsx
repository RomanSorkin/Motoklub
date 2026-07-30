"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { registerAction } from "../actions/auth";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending} style={{ marginTop: 18 }}>
      {pending ? "Registruji…" : "Zaregistrovat se"}
    </button>
  );
}

export default function RegisterPage() {
  const [state, formAction] = useFormState(registerAction, undefined);

  return (
    <>
      <h1 className="page-title">Registrace</h1>
      <p className="page-sub">
        Vytvoř si účet. První registrovaný se stane adminem; další účty pak
        schvaluje admin.
      </p>

      <form action={formAction} className="form card">
        {state?.error && <div className="error">{state.error}</div>}
        <label htmlFor="name">Jméno / přezdívka</label>
        <input id="name" name="name" type="text" required autoComplete="name" />
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" required autoComplete="email" />
        <label htmlFor="password">Heslo</label>
        <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        <div className="hint">Alespoň 8 znaků.</div>
        <label htmlFor="invite">Zvací kód</label>
        <input id="invite" name="invite" type="text" />
        <div className="hint">Vyplň jen pokud ti ho admin dal (jinak nech prázdné).</div>
        <SubmitBtn />
      </form>
      <p style={{ marginTop: 16 }}>
        Už máš účet? <Link href="/login">Přihlaš se →</Link>
      </p>
    </>
  );
}
