import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApprovedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireApprovedUser();
  } catch {
    return NextResponse.json({ error: "Nejsi přihlášen." }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Neplatná data." }, { status: 400 });
  }

  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const difficulty = String(body.difficulty || "").trim() || null;
  const distanceRaw = String(body.distanceKm ?? "").trim();
  const gpxUrl = String(body.gpxUrl || "").trim();

  if (!title || !description)
    return NextResponse.json({ error: "Vyplň alespoň název a popis trasy." }, { status: 400 });

  const distanceKm = distanceRaw ? Number(distanceRaw.replace(",", ".")) : null;
  if (distanceKm !== null && Number.isNaN(distanceKm))
    return NextResponse.json({ error: "Délka musí být číslo (v km)." }, { status: 400 });

  const route = await prisma.route.create({
    data: {
      title,
      description,
      difficulty,
      distanceKm,
      gpxKey: gpxUrl || null,
      gpxIsExternal: gpxUrl ? true : false,
      authorId: user.id,
    },
  });

  return NextResponse.json({ id: route.id });
}
