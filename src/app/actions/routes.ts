"use server";

import { promises as fs } from "fs";
import path from "path";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser, requireApprovedUser } from "@/lib/auth";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

async function tryDeleteFile(key: string | null) {
  try {
    if (!key || key.startsWith("http")) return;
    await fs.unlink(path.join(UPLOAD_DIR, key));
  } catch {}
}

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
  const youtubeUrl = String(formData.get("youtubeUrl") || "").trim() || null;
  const previewType =
    String(formData.get("previewType") || "photo") === "map" ? "map" : "photo";
  
  if (!title || !description)
    redirect(`/routes/${id}/edit?error=${encodeURIComponent("Vyplň název i popis trasy.")}`);

  const distanceKm = distanceRaw ? Number(distanceRaw.replace(",", ".")) : null;

  await prisma.route.update({
    where: { id },
    data: {
      title,
      description,
      difficulty,
      youtubeUrl,
      previewType,
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

export async function deleteImageAction(formData: FormData) {
  const imageId = String(formData.get("imageId") || "");
  const image = await prisma.routeImage.findUnique({ where: { id: imageId } });
  if (!image) return;
  const ctx = await canManage(image.routeId);
  if (!ctx) redirect("/login");

  await prisma.routeImage.delete({ where: { id: imageId } });
  await tryDeleteFile(image.key);
  revalidatePath(`/routes/${image.routeId}/edit`);
  revalidatePath(`/routes/${image.routeId}`);
}

export async function removeGpxAction(formData: FormData) {
  const id = String(formData.get("id") || "");
  const ctx = await canManage(id);
  if (!ctx) redirect("/login");

  const oldKey = ctx.route.gpxKey;
  const wasExternal = ctx.route.gpxIsExternal;
  await prisma.route.update({
    where: { id },
    data: { gpxKey: null, gpxIsExternal: false },
  });
  if (!wasExternal) await tryDeleteFile(oldKey);
  revalidatePath(`/routes/${id}/edit`);
  revalidatePath(`/routes/${id}`);
}

export async function deleteCommentAction(formData: FormData) {
  const commentId = String(formData.get("commentId") || "");
  const user = await getCurrentUser();
  if (!user || !user.approved) redirect("/login");

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { route: { select: { authorId: true } } },
  });
  if (!comment) return;

  const allowed =
    comment.authorId === user.id ||
    comment.route.authorId === user.id ||
    user.role === "ADMIN";
  if (!allowed) redirect(`/routes/${comment.routeId}`);

  await prisma.comment.delete({ where: { id: commentId } });
  if (comment.imageKey) await tryDeleteFile(comment.imageKey);
  revalidatePath(`/routes/${comment.routeId}`);
}
