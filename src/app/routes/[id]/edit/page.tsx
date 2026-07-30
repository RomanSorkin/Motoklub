import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { updateRouteAction } from "../../../actions/routes";

export const dynamic = "force-dynamic";

export default async function EditRoutePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const route = await prisma.route.findUnique({ where: { id: params.id } });
  if (!route) notFound();
  if (route.authorId !== user.id && user.role !== "ADMIN")
    redirect(`/routes/${route.id}`);

  return (
    <>
      <p style={{ marginTop: 20 }}>
        <Link href={`/routes/${route.id}`}>← zpět na trasu</Link>
      </p>
      <h1 className="page-title">Upravit trasu</h1>
      <p className="page-sub">Uprav údaje a ulož změny.</p>

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

        <button className="btn" type="submit" style={{ marginTop: 20 }}>
          Uložit změny
        </button>
      </form>
    </>
  );
}
