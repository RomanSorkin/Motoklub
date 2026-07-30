import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "./actions/auth";

export const metadata: Metadata = {
  title: "Moto klub — trasy a komunita",
  description: "Web motorkářské skupiny: trasy, GPX, komentáře a hodnocení.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html lang="cs">
      <body>
        <nav className="nav">
          <div className="wrap">
            <Link href="/" className="brand">
              🏍️ Moto<span>Klub</span>
            </Link>
            <div className="spacer" />
            {user ? (
              <>
                <Link href="/routes/new" className="link">
                  + Přidat trasu
                </Link>
                {user.role === "ADMIN" && (
                  <Link href="/admin" className="link">
                    Správa
                  </Link>
                )}
                <span className="link">{user.name}</span>
                <form action={logoutAction}>
                  <button className="btn ghost sm" type="submit">
                    Odhlásit
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" className="link">
                  Přihlásit
                </Link>
                <Link href="/register" className="btn sm">
                  Registrace
                </Link>
              </>
            )}
          </div>
        </nav>
        <main className="wrap">{children}</main>
        <div className="footer">🏍️ MotoKlub · web motorkářské skupiny</div>
      </body>
    </html>
  );
}
