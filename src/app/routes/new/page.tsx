"use client";

import { useState } from "react";

export default function NewRoutePage() {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function uploadFile(routeId: string, kind: string, file: File) {
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
      throw new Error(d.error || `Nepodařilo se nahrát soubor ${file.name}.`);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const form = e.currentTarget;
      const fd = new FormData(form);

      const res = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: fd.get("title"),
          description: fd.get("description"),
          distanceKm: fd.get("distanceKm"),
          difficulty: fd.get("difficulty"),
          gpxUrl: fd.get("gpxUrl"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Nepodařilo se uložit trasu.");
      const routeId = data.id as string;

      const gpxInput = form.querySelector<HTMLInputElement>('input[name="gpxFile"]');
      const gpxFile = gpxInput?.files?.[0];
      if (gpxFile) {
        if (!gpxFile.name.toLowerCase().endsWith(".gpx"))
          throw new Error("Nahraný GPX soubor musí mít příponu .gpx");
        await uploadFile(routeId, "gpx", gpxFile);
      }

      const imgInput = form.querySelector<HTMLInputElement>('input[name="images"]');
      const files = imgInput?.files ? Array.from(imgInput.files) : [];
      for (const f of files.slice(0, 8)) {
        await uploadFile(routeId, "image", f);
      }

      window.location.href = `/routes/${routeId}`;
    } catch (err: any) {
      setError(err?.message || "Něco se pokazilo.");
      setSaving(false);
    }
  }

  return (
    <>
      <h1 className="page-title">Přidat trasu</h1>
      <p className="page-sub">Podělte se o pěknou vyjížďku s ostatními.</p>

      <form onSubmit={onSubmit} className="form wide card">
        {error && <div className="error">{error}</div>}

        <label htmlFor="title">Název trasy *</label>
        <input id="title" name="title" type="text" required />

        <label htmlFor="description">Popis *</label>
        <textarea id="description" name="description" required placeholder="Kudy trasa vede, co je cestou zajímavé, kde zastavit…" />

        <label htmlFor="distanceKm">Délka (km)</label>
        <input id="distanceKm" name="distanceKm" type="text" inputMode="decimal" placeholder="např. 180" />

        <label htmlFor="difficulty">Náročnost</label>
        <select id="difficulty" name="difficulty" defaultValue="">
          <option value="">— nevybráno —</option>
          <option value="lehká">lehká</option>
          <option value="střední">střední</option>
          <option value="těžká">těžká</option>
        </select>

        <label htmlFor="gpxFile">GPX soubor</label>
        <input id="gpxFile" name="gpxFile" type="file" accept=".gpx" />
        <div className="hint">Nahraj soubor .gpx (max 12 MB)…</div>

        <label htmlFor="gpxUrl">…nebo odkaz na GPX</label>
        <input id="gpxUrl" name="gpxUrl" type="url" placeholder="https://…" />
        <div className="hint">Pokud vyplníš soubor i odkaz, použije se nahraný soubor.</div>

        <label htmlFor="images">Obrázky</label>
        <input id="images" name="images" type="file" accept="image/*" multiple />
        <div className="hint">Můžeš přidat víc fotek najednou (max 8, každá do 12 MB).</div>

        <button className="btn" type="submit" disabled={saving} style={{ marginTop: 20 }}>
          {saving ? "Ukládám…" : "Uložit trasu"}
        </button>
      </form>
    </>
  );
}
