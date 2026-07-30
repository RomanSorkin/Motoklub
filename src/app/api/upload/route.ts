import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { requireApprovedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireApprovedUser();
  } catch {
    return NextResponse.json({ error: "Nejsi přihlášen." }, { status: 401 });
  }

  const kind = req.headers.get("x-kind") || "";
  const filename = decodeURIComponent(req.headers.get("x-filename") || "soubor");

  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length === 0)
    return NextResponse.json({ error: "Prázdný soubor." }, { status: 400 });
  if (buf.length > 12 * 1024 * 1024)
    return NextResponse.json(
      { error: `Soubor ${filename} je příliš velký (max 12 MB).` },
      { status: 400 }
    );

  const safeExt = (path.extname(filename) || "").replace(/[^a-zA-Z0-9.]/g, "");

  const store = async (subdir: string) => {
    const key = `${subdir}/${crypto.randomUUID()}${safeExt}`;
    const full = path.join(UPLOAD_DIR, key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, buf);
    return key;
  };

  // Fotka ke komentáři
  if (kind === "comment") {
    const commentId = req.headers.get("x-comment-id") || "";
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment || comment.authorId !== user.id)
      return NextResponse.json({ error: "Komentář nenalezen." }, { status: 404 });
    const key = await store("comments");
    await prisma.comment.update({
      where: { id: comment.id },
      data: { imageKey: key },
    });
    return NextResponse.json({ ok: true, key });
  }

  // GPX nebo obrázek k trase
  const routeId = req.headers.get("x-route-id") || "";
  const route = await prisma.route.findUnique({ where: { id: routeId } });
  if (!route || (route.authorId !== user.id && user.role !== "ADMIN"))
    return NextResponse.json({ error: "Trasa nenalezena." }, { status: 404 });

  if (kind === "gpx") {
    const key = await store("gpx");
    await prisma.route.update({
      where: { id: route.id },
      data: { gpxKey: key, gpxIsExternal: false },
    });
    return NextResponse.json({ ok: true, key });
  }

  const key = await store("images");
  const count = await prisma.routeImage.count({ where: { routeId: route.id } });
  await prisma.routeImage.create({
    data: { key, order: count, routeId: route.id },
  });
  return NextResponse.json({ ok: true, key });
}
