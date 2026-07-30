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

  const routeId = String(body.routeId || "");
  const text = String(body.text || "").trim();
  if (!routeId || !text)
    return NextResponse.json({ error: "Napiš text komentáře." }, { status: 400 });

  const route = await prisma.route.findUnique({ where: { id: routeId } });
  if (!route)
    return NextResponse.json({ error: "Trasa nenalezena." }, { status: 404 });

  const comment = await prisma.comment.create({
    data: { text: text.slice(0, 2000), routeId, authorId: user.id },
  });

  return NextResponse.json({ id: comment.id });
}
