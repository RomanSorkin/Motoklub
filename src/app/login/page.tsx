"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { loginAction } from "../actions/auth";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending} style={{ marginTop: 18 }}>
      {pending ? "Přihlašuji…" : "Přihlásit se"}
    </button>
  );
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { pending?: string };
}) {
  const [state, formAction] = useFormState(loginAction, undefined);

  return (
    <>
      <h1 className="page-title">Přihlášení</h1>
      <p className="page-sub">Přihlas se do klubového webu.</p>

      {searchParams?.pending && (
        <div className="success form">
          Registrace proběhla. Účet teď čeká na schválení adminem — po schválení se
          budeš moct přihlásit.
        </div>
      )}

      <form action={formAction} className="form card">
        {state?.error && <div className="error">{state.error}</div>}
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" required autoComplete="email" />
        <label htmlFor="password">Heslo</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" />
        <SubmitBtn />
      </form>
      <p style={{ marginTop: 16 }}>
        Nemáš účet? <Link href="/register">Zaregistruj se →</Link>
      </p>
    </>
  );
}
