import Link from "next/link";

export default function NotFound() {
  return (
    <div className="empty">
      <h1 style={{ fontSize: 28 }}>Nenalezeno</h1>
      <p>Tahle stránka nebo trasa neexistuje.</p>
      <Link href="/" className="btn">
        ← Zpět na trasy
      </Link>
    </div>
  );
}
