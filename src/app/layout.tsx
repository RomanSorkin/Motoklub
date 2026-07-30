import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "./actions/auth";

export const metadata: Metadata = {
  title: "North Moravia Dirt Riders",
  description: "TCT Severní Morava — trasy, GPX, komentáře a hodnocení.",
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
          <div className="wrap" style={{ height: 80 }}>
            <Link
              href="/"
              className="brand"
              style={{ display: "flex", alignItems: "center", gap: 10 }}
            >
              <img
                src="/logo.png"
                alt="North Moravia Dirt Riders"
                style={{ height: 60, width: 60, objectFit: "contain" }}
              />
              <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.05 }}>
                <span style={{ fontSize: 15 }}>North Moravia Dirt Riders</span>
                <span style={{ fontSize: 11, color: "var(--dim)", fontWeight: 600, letterSpacing: ".02em" }}>
                  TCT Severní Morava
                </span>
              </span>
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
        <div className="footer">North Moravia Dirt Riders · TCT Severní Morava</div>
      </body>
    </html>
  );
}
