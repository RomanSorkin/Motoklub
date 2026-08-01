import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { rateAction, deleteCommentAction } from "../../actions/routes";
import RouteMap from "@/components/RouteMap";
import CommentForm from "@/components/CommentForm";
import DeleteRouteButton from "@/components/DeleteRouteButton";
import { readFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

function fileUrl(key: string, external = false) {
  return external ? key : `/api/files/${key}`;
}
function youtubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    let id = "";
    if (u.hostname.includes("youtu.be")) id = u.pathname.slice(1);
    else if (u.pathname.startsWith("/shorts/")) id = u.pathname.split("/")[2];
    else if (u.pathname.startsWith("/embed/")) id = u.pathname.split("/")[2];
    else id = u.searchParams.get("v") || "";
    id = (id || "").split(/[/?&]/)[0];
    if (!/^[a-zA-Z0-9_-]{6,15}$/.test(id)) return null;
    return `https://www.youtube-nocookie.com/embed/${id}`;
  } catch {
    return null;
  }
}

function haversine(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const r = (d: number) => (d * Math.PI) / 180;
  const dLat = r(b[0] - a[0]);
  const dLon = r(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function elevationProfile(key: string) {
  const buf = await readFile(key);
  if (!buf) return null;
  const xml = buf.toString("utf8");

  const raw: { lat: number; lon: number; ele: number }[] = [];
  const blockRe = /<(trkpt|rtept)\b([^>]*)>([\s\S]*?)<\/\1>/g;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(xml)) !== null) {
    const lat = /lat="(-?\d+(?:\.\d+)?)"/.exec(m[2]);
    const lon = /lon="(-?\d+(?:\.\d+)?)"/.exec(m[2]);
    const ele = /<ele>\s*(-?\d+(?:\.\d+)?)\s*<\/ele>/.exec(m[3]);
    if (lat && lon)
      raw.push({ lat: +lat[1], lon: +lon[1], ele: ele ? +ele[1] : NaN });
  }
  if (raw.filter((p) => !Number.isNaN(p.ele)).length < 2) return null;

  let lastE = NaN;
  for (const p of raw) {
    if (!Number.isNaN(p.ele)) lastE = p.ele;
    else p.ele = lastE;
  }
  const pts = raw.filter((p) => !Number.isNaN(p.ele));
  if (pts.length < 2) return null;

  const dist: number[] = [0];
  for (let i = 1; i < pts.length; i++)
    dist[i] =
      dist[i - 1] +
      haversine([pts[i - 1].lat, pts[i - 1].lon], [pts[i].lat, pts[i].lon]);
  const total = dist[dist.length - 1] || 1;

  let asc = 0, desc = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = pts[i].ele - pts[i - 1].ele;
    if (d > 0) asc += d;
    else desc += -d;
  }
  const eles = pts.map((p) => p.ele);
  const eMin = Math.min(...eles), eMax = Math.max(...eles);
  const eSpan = eMax - eMin || 1;

  const step = Math.ceil(pts.length / 250);
  const W = 600, H = 140, pad = 8;
  const idxs: number[] = [];
  for (let i = 0; i < pts.length; i += step) idxs.push(i);
  if (idxs[idxs.length - 1] !== pts.length - 1) idxs.push(pts.length - 1);

  const xy = idxs.map((i) => {
    const x = (dist[i] / total) * W;
    const y = pad + (H - 2 * pad) * (1 - (pts[i].ele - eMin) / eSpan);
    return { x, y };
  });
  const line = xy.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `0,${H} ${line} ${W},${H}`;

  return {
    distKm: total / 1000,
    ascent: Math.round(asc),
    descent: Math.round(desc),
    min: Math.round(eMin),
    max: Math.round(eMax),
    line,
    area,
    startY: xy[0].y,
    endY: xy[xy.length - 1].y,
  };
}
export default async function RouteDetail({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  // Detail trasy je jen pro přihlášené (schválené) členy; náhled/seznam je veřejný.
  if (!user || !user.approved) redirect("/login?detail=1");

  const route = await prisma.route.findUnique({
    where: { id: params.id },
    include: {
      author: { select: { name: true } },
      images: { orderBy: { order: "asc" } },
      ratings: true,
      comments: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { name: true } } },
      },
    },
  });

  if (!route) notFound();

  const avg =
    route.ratings.length > 0
      ? route.ratings.reduce((s, x) => s + x.value, 0) / route.ratings.length
      : null;
  const myRating =
    user && route.ratings.find((r) => r.authorId === user.id)?.value;

  const canManage =
    !!user &&
    user.approved &&
    (user.id === route.authorId || user.role === "ADMIN");

  const gpxHref = route.gpxKey
    ? fileUrl(route.gpxKey, route.gpxIsExternal)
    : null;
 const ytEmbed = route.youtubeUrl ? youtubeEmbed(route.youtubeUrl) : null;
  const profile =
    route.gpxKey && !route.gpxIsExternal
      ? await elevationProfile(route.gpxKey).catch(() => null)
      : null;

  return (
    <>
      <p style={{ marginTop: 20 }}>
        <Link href="/">← zpět na trasy</Link>
      </p>

      <div className="detail-head">
        <h1>{route.title}</h1>
        {route.difficulty && <span className="tag">{route.difficulty}</span>}
      </div>
      <div className="detail-meta">
        <span>👤 {route.author.name}</span>
        {route.distanceKm ? <span>📏 {route.distanceKm} km</span> : null}
        <span>
          ⭐ {avg ? `${avg.toFixed(1)} / 5 (${route.ratings.length})` : "zatím bez hodnocení"}
        </span>
      </div>

      {canManage && (
        <div style={{ display: "flex", gap: 10, margin: "4px 0 8px", flexWrap: "wrap" }}>
          <Link href={`/routes/${route.id}/edit`} className="btn ghost sm">
            ✏️ Upravit
          </Link>
          <DeleteRouteButton id={route.id} />
        </div>
      )}

     {gpxHref && <RouteMap gpxUrl={gpxHref} />}

      {profile && (
        <>
          <h2 className="section-h">Výškový profil</h2>
          <div className="detail-meta" style={{ marginBottom: 8 }}>
            <span>📏 {profile.distKm.toFixed(1)} km</span>
            <span>↑ {profile.ascent} m</span>
            <span>↓ {profile.descent} m</span>
            <span>⛰️ {profile.min}–{profile.max} m n. m.</span>
            <span style={{ color: "var(--dim)" }}>🟢 start → 🔴 cíl</span>
          </div>
          <div style={{ position: "relative", border: "1px solid var(--line)", borderRadius: 14, padding: 10, background: "var(--card)" }}>
            <svg viewBox="0 0 600 140" preserveAspectRatio="none" style={{ width: "100%", height: 140, display: "block" }}>
              <polygon points={profile.area} fill="rgba(255,122,26,0.15)" />
              <polyline
                points={profile.line}
                fill="none"
                stroke="#ff7a1a"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
                strokeLinejoin="round"
              />
            </svg>
            <span
              title="Start"
              style={{
                position: "absolute", left: 10, top: 10 + profile.startY,
                transform: "translate(-50%,-50%)", width: 12, height: 12,
                borderRadius: "50%", background: "#4fd18b", border: "2px solid #12161c",
              }}
            />
            <span
              title="Cíl"
              style={{
                position: "absolute", right: 10, top: 10 + profile.endY,
                transform: "translate(50%,-50%)", width: 12, height: 12,
                borderRadius: "50%", background: "#ef6a6a", border: "2px solid #12161c",
              }}
            />
          </div>
        </>
      )}

      <p style={{ whiteSpace: "pre-wrap", fontSize: 16 }}>{route.description}</p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "16px 0" }}>
        {gpxHref && (
          <a className="btn ghost" href={gpxHref} download>
            ⬇️ Stáhnout GPX
          </a>
        )}
      </div>

      {route.images.length > 0 && (
        <div className="gallery">
          {route.images.map((img) => (
            <a key={img.id} href={fileUrl(img.key)} target="_blank" rel="noreferrer">
              <img src={fileUrl(img.key)} alt="" />
            </a>
          ))}
        </div>
      )}

      {ytEmbed && (
        <>
          <h2 className="section-h">Video</h2>
          <div
            style={{
              position: "relative",
              paddingBottom: "56.25%",
              height: 0,
              overflow: "hidden",
              borderRadius: 14,
              border: "1px solid var(--line)",
            }}
          >
            <iframe
              src={ytEmbed}
              title="Video trasy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
            />
          </div>
        </>
      )}

      <h2 className="section-h">Hodnocení</h2>
      {user && user.approved ? (
        <div>
          <p className="avg" style={{ marginBottom: 8 }}>
            {myRating ? `Tvé hodnocení: ${myRating}/5. Klikni pro změnu:` : "Ohodnoť trasu:"}
          </p>
          <form action={rateAction} className="stars">
            <input type="hidden" name="routeId" value={route.id} />
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="submit"
                name="value"
                value={n}
                className={myRating && n <= myRating ? "star-on" : ""}
                title={`${n} z 5`}
              >
                ★
              </button>
            ))}
          </form>
        </div>
      ) : (
        <p className="avg">
          <Link href="/login">Přihlas se</Link>, ať můžeš hodnotit.
        </p>
      )}

      <h2 className="section-h">Komentáře ({route.comments.length})</h2>
      {user && user.approved ? (
        <CommentForm routeId={route.id} />
      ) : (
        <p className="avg">
          <Link href="/login">Přihlas se</Link>, ať můžeš komentovat.
        </p>
      )}

      {route.comments.length === 0 ? (
        <p className="empty">Zatím žádné komentáře. Buď první!</p>
      ) : (
        route.comments.map((c) => {
          const canDeleteComment =
            !!user &&
            user.approved &&
            (c.authorId === user.id ||
              route.authorId === user.id ||
              user.role === "ADMIN");
          return (
            <div className="comment" key={c.id}>
              <span className="who">{c.author.name}</span>
              <span className="when">
                {new Date(c.createdAt).toLocaleDateString("cs-CZ")}
              </span>
              {canDeleteComment && (
                <form action={deleteCommentAction} style={{ display: "inline", marginLeft: 8 }}>
                  <input type="hidden" name="commentId" value={c.id} />
                  <button
                    type="submit"
                    title="Smazat komentář"
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--red)",
                      cursor: "pointer",
                      fontSize: 12,
                      padding: 0,
                    }}
                  >
                    smazat
                  </button>
                </form>
              )}
              <p>{c.text}</p>
              {c.imageKey && (
                <a href={fileUrl(c.imageKey)} target="_blank" rel="noreferrer">
                  <img
                    src={fileUrl(c.imageKey)}
                    alt=""
                    style={{
                      marginTop: 8,
                      maxWidth: 260,
                      width: "100%",
                      borderRadius: 10,
                      border: "1px solid var(--line)",
                    }}
                  />
                </a>
              )}
            </div>
          );
        })
      )}
    </>
  );
}
