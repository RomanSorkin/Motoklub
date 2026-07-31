import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  updateRouteAction,
  deleteImageAction,
  removeGpxAction,
} from "../../../actions/routes";
import MediaUploader from "@/components/MediaUploader";

export const dynamic = "force-dynamic";

function fileUrl(key: string, external = false) {
  return external ? key : `/api/files/${key}`;
}

export default async function EditRoutePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const route = await prisma.route.findUnique({
    where: { id: params.id },
    include: { images: { orderBy: { order: "asc" } } },
  });
  if (!route) notFound();
  if (route.authorId !== user.id && user.role !== "ADMIN")
    redirect(`/routes/${route.id}`);

  return (
    <>
      <p style={{ marginTop: 20 }}>
        <Link href={`/routes/${route.id}`}>← zpět na trasu</Link>
      </p>
      <h1 className="page-title">Upravit trasu</h1>
      <p className="page-sub">Uprav údaje, spravuj fotky a GPX.</p>

      <form action={updateRouteAction} className="form wide card">
        {searchParams?.error && <div className="error">{searchParams.error}</div>}
        <input type="hidden" name="id" value={route.id} />

        <label htmlFor="title">Název trasy *</label>
        <input id="title" name="title" type="text" required defaultValue={route.title} />

        <label htmlFor="description">Popis *</label>
        <textarea id="description" name="description" required defaultValue={route.description} />

        <label htmlFor="distanceKm">Délka (km)</label>
        <input id="distanceKm" name="distanceKm" type="text" inputMode="decimal" defaultValue={route.distanceKm ?? ""} />

        <label htmlFor="difficulty">Náročnost</label>
        <select id="difficulty" name="difficulty" defaultValue={route.difficulty ?? ""}>
          <option value="">— nevybráno —</option>
          <option value="lehká">lehká</option>
          <option value="střední">střední</option>
          <option value="těžká">těžká</option>
        </select>

        <label htmlFor="youtubeUrl">Odkaz na YouTube video</label>
        <input
          id="youtubeUrl"
          name="youtubeUrl"
          type="url"
          defaultValue={route.youtubeUrl ?? ""}
          placeholder="https://www.youtube.com/watch?v=..."
        />
        <div className="hint">Na detailu trasy se z odkazu zobrazí přehrávač. Nech prázdné pro odebrání videa.</div>

        <button className="btn" type="submit" style={{ marginTop: 20 }}>
          Uložit změny
        </button>
      </form>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Fotky ({route.images.length})</h3>
        {route.images.length === 0 ? (
          <p className="hint">Zatím žádné fotky.</p>
        ) : (
          <div className="gallery">
            {route.images.map((img) => (
              <div key={img.id}>
                <img src={fileUrl(img.key)} alt="" />
                <form action={deleteImageAction}>
                  <input type="hidden" name="imageId" value={img.id} />
                  <button className="btn sm danger" type="submit" style={{ marginTop: 6, width: "100%" }}>
                    Smazat
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>GPX</h3>
        {route.gpxKey ? (
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <a className="btn ghost sm" href={fileUrl(route.gpxKey, route.gpxIsExternal)} target="_blank" rel="noreferrer">
              {route.gpxIsExternal ? "otevřít odkaz" : "stáhnout GPX"}
            </a>
            <form action={removeGpxAction}>
              <input type="hidden" name="id" value={route.id} />
              <button className="btn sm danger" type="submit">Odebrat GPX</button>
            </form>
          </div>
        ) : (
          <p className="hint">Trasa zatím nemá GPX.</p>
        )}
      </div>

      <MediaUploader routeId={route.id} />
    </>
  );
}
