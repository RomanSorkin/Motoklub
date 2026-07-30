import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApprovedUser } from "@/lib/auth";
import { saveFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireApprovedUser();
  } catch {
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }

  const back = (msg: string) =>
    NextResponse.redirect(
      new URL(`/routes/new?error=${encodeURIComponent(msg)}`, req.url),
      303
    );

  try {
    const formData = await req.formData();

    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const distanceRaw = String(formData.get("distanceKm") || "").trim();
    const difficulty = String(formData.get("difficulty") || "").trim() || null;
    const gpxUrl = String(formData.get("gpxUrl") || "").trim();

    if (!title || !description)
      return back("Vyplň alespoň název a popis trasy.");

    const distanceKm = distanceRaw
      ? Number(distanceRaw.replace(",", "."))
      : null;
    if (distanceKm !== null && Number.isNaN(distanceKm))
      return back("Délka musí být číslo (v km).");

    let gpxKey: string | null = null;
    let gpxIsExternal = false;
    const gpxFile = formData.get("gpxFile");
    if (gpxFile instanceof File && gpxFile.size > 0) {
      if (!gpxFile.name.toLowerCase().endsWith(".gpx"))
        return back("Nahraný soubor musí mít příponu .gpx");
      if (gpxFile.size > 10 * 1024 * 1024)
        return back("GPX soubor je příliš velký (max 10 MB).");
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
        authorId: user.id,
      },
    });

    const images = formData
      .getAll("images")
      .filter((f): f is File => f instanceof File && f.size > 0);
    let order = 0;
    for (const img of images.slice(0, 8)) {
      if (img.size > 8 * 1024 * 1024) continue;
      if (!img.type.startsWith("image/")) continue;
      const key = await saveFile(img, "images");
      await prisma.routeImage.create({
        data: { key, order: order++, routeId: route.id },
      });
    }

    return NextResponse.redirect(new URL(`/routes/${route.id}`, req.url), 303);
  } catch (e: any) {
    return back("Trasu se nepodařilo uložit: " + (e?.message || "neznámá chyba"));
  }
}
