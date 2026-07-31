import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { readFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

function fileUrl(key: string, external = false) {
  return external ? key : `/api/files/${key}`;
}

async function gpxPreviewPoints(key: string): Promise<string | null> {
  const buf = await readFile(key);
  if (!buf) return null;
  const xml = buf.toString("utf8");

  const pts: [number, number][] = [];
  const tagRe = /<(?:trkpt|rtept|wpt)\b[^>]*>/g;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(xml)) !== null) {
    const lat = /lat="(-?\d+(?:\.\d+)?)"/.exec(m[0]);
    const lon = /lon="(-?\d+(?:\.\d+)?)"/.exec(m[0]);
    if (lat && lon) pts.push([parseFloat(lat[1]), parseFloat(lon[1])]);
  }
  if (pts.length < 2) return null;

  const step = Math.ceil(pts.length / 300);
  const sample = pts.filter((_, i) => i % step === 0);

  const rad = Math.PI / 180;
  const lats = sample.map((p) => p[0]);
  const cosLat = Math.cos(((Math.min(...lats) + Math.max(...lats)) / 2) * rad);
  const xs = sample.map((p) => p[1] * cosLat);
  const ys = sample.map((p) => p[0]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = maxX - minX || 1e-6, spanY = maxY - minY || 1e-6;

  const W = 200, H = 120, P = 14;
  const scale = Math.min((W - 2 * P) / spanX, (H - 2 * P) / spanY);
  const drawW = spanX * scale, drawH = spanY * scale;
  const offX = (W - drawW) / 2, offY = (H - drawH) / 2;

  return sample
    .map((p) => {
      const x = offX + (p[1] * cosLat - minX) * scale;
      const y = offY + (maxY - p[0]) * scale;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export default async function HomePage() {
  const user = await getCurrentUser();

  const routes = await prisma.route.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { name: true } },
      images: { orderBy: { order: "asc" }, take: 1 },
      ratings: { select: { value: true } },
    },
  });

  const mapPreviews = await Promise.all(
    routes.map((r) =>
      r.previewType === "map" && r.gpxKey && !r.gpxIsExternal
        ? gpxPreviewPoints(r.gpxKey).catch(() => null)
        : Promise.resolve<string | null>(null)
    )
  );

  return (
    <>
      <h1 className="page-title">Trasy</h1>
      <p className="page-sub">
        Sdílené vyjížďky naší skupiny.{" "}
        {user
          ? "Přidej vlastní trasu tlačítkem nahoře."
          : "Přihlas se, ať můžeš otevírat trasy, přidávat je, komentovat a hodnotit."}
      </p>

      {routes.length === 0 ? (
        <div className="card empty">
          Zatím tu nejsou žádné trasy.{" "}
          {user ? (
            <Link href="/routes/new">Přidej první →</Link>
          ) : (
            <Link href="/register">Zaregistruj se a začni →</Link>
          )}
        </div>
      ) : (
        <div className="routes">
          {routes.map((r, i) => {
            const avg =
              r.ratings.length > 0
                ? r.ratings.reduce((s, x) => s + x.value, 0) / r.ratings.length
                : null;
            const mapPts = mapPreviews[i];
            return (
              <Link href={`/routes/${r.id}`} key={r.id} className="rcard">
                <div className="thumb">
                  {mapPts ? (
                    <svg
                      viewBox="0 0 200 120"
                      preserveAspectRatio="xMidYMid meet"
                      style={{ width: "100%", height: "100%" }}
                    >
                      <polyline
                        points={mapPts}
                        fill="none"
                        stroke="#ff7a1a"
                        strokeWidth={3}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : r.images[0] ? (
                    <img src={fileUrl(r.images[0].key)} alt={r.title} />
                  ) : (
                    "🗺️"
                  )}
                </div>
                <div className="body">
                  <h3>{r.title}</h3>
                  <p className="desc">{r.description}</p>
                  <div className="meta">
                    {r.distanceKm ? <span>📏 {r.distanceKm} km</span> : null}
                    {r.difficulty ? <span className="tag">{r.difficulty}</span> : null}
                    {avg ? <span>⭐ {avg.toFixed(1)} ({r.ratings.length})</span> : null}
                    <span style={{ marginLeft: "auto" }}>{r.author.name}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
