"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CommentForm({ routeId }: { routeId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const form = e.currentTarget;
      const fd = new FormData(form);
      const text = String(fd.get("text") || "").trim();
      if (!text) throw new Error("Napiš nějaký text.");

      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeId, text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Nepodařilo se přidat komentář.");
      const commentId = data.id as string;

      const imgInput = form.querySelector<HTMLInputElement>('input[name="image"]');
      const file = imgInput?.files?.[0];
      if (file) {
        const up = await fetch("/api/upload", {
          method: "POST",
          headers: {
            "x-comment-id": commentId,
            "x-kind": "comment",
            "x-filename": encodeURIComponent(file.name),
            "Content-Type": "application/octet-stream",
          },
          body: file,
        });
        if (!up.ok) {
          const d = await up.json().catch(() => ({}));
          throw new Error(d.error || "Nepodařilo se nahrát fotku ke komentáři.");
        }
      }

      form.reset();
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Něco se pokazilo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ marginBottom: 16 }}>
      {error && <div className="error">{error}</div>}
      <textarea name="text" required placeholder="Napiš komentář…" />
      <label htmlFor="cimg">Fotka ke komentáři (nepovinné)</label>
      <input id="cimg" name="image" type="file" accept="image/*" />
      <div className="hint">Jedna fotka, do 12 MB.</div>
      <button className="btn" type="submit" disabled={saving} style={{ marginTop: 12 }}>
        {saving ? "Odesílám…" : "Přidat komentář"}
      </button>
    </form>
  );
}
