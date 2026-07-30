"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser, requireApprovedUser } from "@/lib/auth";

export async function rateAction(formData: FormData) {
  let user;
  try {
    user = await requireApprovedUser();
  } catch {
    redirect("/login");
  }
  const routeId = String(formData.get("routeId") || "");
  const value = Number(formData.get("value"));
  if (!routeId || !(value >= 1 && value <= 5)) return;

  await prisma.rating.upsert({
    where: { routeId_authorId: { routeId, authorId: user!.id } },
    create: { routeId, authorId: user!.id, value },
    update: { value },
  });
  revalidatePath(`/routes/${routeId}`);
}

async function canManage(routeId: string) {
  const user = await getCurrentUser();
  if (!user || !user.approved) return null;
  const route = await prisma.route.findUnique({ where: { id: routeId } });
  if (!route) return null;
  if (route.authorId !== user.id && user.role !== "ADMIN") return null;
  return { user, route };
}

export async function updateRouteAction(formData: FormData) {
  const id = String(formData.get("id") || "");
  const ctx = await canManage(id);
  if (!ctx) redirect("/login");

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const distanceRaw = String(formData.get("distanceKm") || "").trim();
  const difficulty = String(formData.get("difficulty") || "").trim() || null;

  if (!title || !description)
    redirect(`/routes/${id}/edit?error=${encodeURIComponent("Vyplň název i popis trasy.")}`);

  const distanceKm = distanceRaw ? Number(distanceRaw.replace(",", ".")) : null;

  await prisma.route.update({
    where: { id },
    data: {
      title,
      description,
      difficulty,
      distanceKm: distanceKm !== null && !Number.isNaN(distanceKm) ? distanceKm : null,
    },
  });

  revalidatePath(`/routes/${id}`);
  redirect(`/routes/${id}`);
}

export async function deleteRouteAction(formData: FormData) {
  const id = String(formData.get("id") || "");
  const ctx = await canManage(id);
  if (!ctx) redirect("/login");

  await prisma.route.delete({ where: { id } });
  revalidatePath("/");
  redirect("/");
}
