import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { rateAction, deleteCommentAction } from "../../actions/routes";
import RouteMap from "@/components/RouteMap";
import CommentForm from "@/components/CommentForm";
import DeleteRouteButton from "@/components/DeleteRouteButton";

export const dynamic = "force-dynamic";

function fileUrl(key: string, external = false) {
  return external ? key : `/api/files/${key}`;
}

export default async function RouteDetail({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();

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

  const gpxHref = route.gpxKey ? fileUrl(route.gpxKey, route.gpxIsExternal) : null;

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
