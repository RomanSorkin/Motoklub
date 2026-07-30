"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MediaUploader({ routeId }: { routeId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function upload(kind: string, file: File) {
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: {
        "x-route-id": routeId,
        "x-kind": kind,
        "x-filename": encodeURIComponent(file.name),
        "Content-Type": "application/octet-stream",
      },
      body: file,
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error || "Nahrání se nezdařilo.");
    }
  }

  async function onAddPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;
    setError(null);
    setBusy(true);
    try {
      for (const f of files.slice(0, 8)) await upload("image", f);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Nahrání fotek selhalo.");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  async function onGpx(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      if (!file.name.toLowerCase().endsWith(".gpx"))
        throw new Error("Soubor musí mít příponu .gpx");
      await upload("gpx", file);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Nahrání GPX selhalo.");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h3 style={{ marginTop: 0 }}>Přidat / vyměnit soubory</h3>
      {error && <div className="error">{error}</div>}

      <label htmlFor="addPhotos">Přidat fotky</label>
      <input id="addPhotos" type="file" accept="image/*" multiple onChange={onAddPhotos} disabled={busy} />
      <div className="hint">Nahraje se hned po výběru (max 8 najednou).</div>

      <label htmlFor="addGpx" style={{ marginTop: 12 }}>Nahrát / vyměnit GPX</label>
      <input id="addGpx" type="file" accept=".gpx" onChange={onGpx} disabled={busy} />
      <div className="hint">Nahraje nový GPX; případný starý nahraný soubor nahradí.</div>

      {busy && <p className="hint">Nahrávám… nezavírej stránku.</p>}
    </div>
  );
}
