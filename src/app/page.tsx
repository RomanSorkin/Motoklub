import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function fileUrl(key: string, external = false) {
  return external ? key : `/api/files/${key}`;
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

  return (
    <>
      <h1 className="page-title">Trasy</h1>
      <p className="page-sub">
        Sdílené vyjížďky naší skupiny. {user ? "Přidej vlastní trasu tlačítkem nahoře." : "Přihlas se, ať můžeš přidávat trasy, komentovat a hodnotit."}
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
          {routes.map((r) => {
            const avg =
              r.ratings.length > 0
                ? r.ratings.reduce((s, x) => s + x.value, 0) / r.ratings.length
                : null;
            return (
              <Link href={`/routes/${r.id}`} key={r.id} className="rcard">
                <div className="thumb">
                  {r.images[0] ? (
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
