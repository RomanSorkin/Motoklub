export const dynamic = "force-dynamic";

export default function NewRoutePage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <>
      <h1 className="page-title">Přidat trasu</h1>
      <p className="page-sub">Podělte se o pěknou vyjížďku s ostatními.</p>

      <form
        action="/api/routes"
        method="post"
        encType="multipart/form-data"
        className="form wide card"
      >
        {searchParams?.error && <div className="error">{searchParams.error}</div>}

        <label htmlFor="title">Název trasy *</label>
        <input id="title" name="title" type="text" required />

        <label htmlFor="description">Popis *</label>
        <textarea
          id="description"
          name="description"
          required
          placeholder="Kudy trasa vede, co je cestou zajímavé, kde zastavit…"
        />

        <label htmlFor="distanceKm">Délka (km)</label>
        <input
          id="distanceKm"
          name="distanceKm"
          type="text"
          inputMode="decimal"
          placeholder="např. 180"
        />

        <label htmlFor="difficulty">Náročnost</label>
        <select id="difficulty" name="difficulty" defaultValue="">
          <option value="">— nevybráno —</option>
          <option value="lehká">lehká</option>
          <option value="střední">střední</option>
          <option value="těžká">těžká</option>
        </select>

        <label htmlFor="gpxFile">GPX soubor</label>
        <input id="gpxFile" name="gpxFile" type="file" accept=".gpx" />
        <div className="hint">Nahraj soubor .gpx (max 10 MB)…</div>

        <label htmlFor="gpxUrl">…nebo odkaz na GPX</label>
        <input id="gpxUrl" name="gpxUrl" type="url" placeholder="https://…" />
        <div className="hint">
          Pokud vyplníš soubor i odkaz, použije se nahraný soubor.
        </div>

        <label htmlFor="images">Obrázky</label>
        <input id="images" name="images" type="file" accept="image/*" multiple />
        <div className="hint">
          Můžeš přidat víc fotek najednou (max 8, každá do 8 MB).
        </div>

        <button className="btn" type="submit" style={{ marginTop: 20 }}>
          Uložit trasu
        </button>
      </form>
    </>
  );
}
