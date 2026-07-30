"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireApprovedUser } from "@/lib/auth";
import { saveFile } from "@/lib/storage";

export type ActionState = { error?: string } | undefined;

export async function createRouteAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  let user;
  try {
    user = await requireApprovedUser();
  } catch {
    redirect("/login");
  }

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const distanceRaw = String(formData.get("distanceKm") || "").trim();
  const difficulty = String(formData.get("difficulty") || "").trim() || null;
  const gpxUrl = String(formData.get("gpxUrl") || "").trim();

  if (!title || !description)
    return { error: "Vyplň alespoň název a popis trasy." };

  const distanceKm = distanceRaw ? Number(distanceRaw.replace(",", ".")) : null;
  if (distanceKm !== null && Number.isNaN(distanceKm))
    return { error: "Délka musí být číslo (v km)." };

  // GPX: buď nahraný soubor, nebo externí odkaz
  let gpxKey: string | null = null;
  let gpxIsExternal = false;

  const gpxFile = formData.get("gpxFile");
  if (gpxFile instanceof File && gpxFile.size > 0) {
    if (!gpxFile.name.toLowerCase().endsWith(".gpx"))
      return { error: "Nahraný soubor musí mít příponu .gpx" };
    if (gpxFile.size > 10 * 1024 * 1024)
      return { error: "GPX soubor je příliš velký (max 10 MB)." };
    gpxKey = await saveFile(gpxFile, "gpx");
  } else if (gpxUrl) {
    gpxKey = gpxUrl;
    gpxIsExternal = true;
  }

  const route = await prisma.route.create({
    data: {
      title,
      description,
      distanceKm,
      difficulty,
      gpxKey,
      gpxIsExternal,
      authorId: user!.id,
    },
  });

  // Obrázky (může jich být víc)
  const images = formData.getAll("images").filter(
    (f): f is File => f instanceof File && f.size > 0
  );
  let order = 0;
  for (const img of images.slice(0, 8)) {
    if (img.size > 8 * 1024 * 1024) continue; // přeskoč příliš velké
    if (!img.type.startsWith("image/")) continue;
    const key = await saveFile(img, "images");
    await prisma.routeImage.create({
      data: { key, order: order++, routeId: route.id },
    });
  }

  revalidatePath("/");
  redirect(`/routes/${route.id}`);
}

export async function addCommentAction(formData: FormData) {
  let user;
  try {
    user = await requireApprovedUser();
  } catch {
    redirect("/login");
  }
  const routeId = String(formData.get("routeId") || "");
  const text = String(formData.get("text") || "").trim();
  if (!routeId || !text) return;

  await prisma.comment.create({
    data: { text: text.slice(0, 2000), routeId, authorId: user!.id },
  });
  revalidatePath(`/routes/${routeId}`);
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

  // upsert = jeden uživatel má jedno hodnocení dané trasy
  await prisma.rating.upsert({
    where: { routeId_authorId: { routeId, authorId: user!.id } },
    create: { routeId, authorId: user!.id, value },
    update: { value },
  });
  revalidatePath(`/routes/${routeId}`);
}
