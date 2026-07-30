"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
} from "@/lib/auth";

export type ActionState = { error?: string } | undefined;

export async function registerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const invite = String(formData.get("invite") || "");

  if (!name || !email || !password)
    return { error: "Vyplň jméno, e-mail i heslo." };
  if (password.length < 8)
    return { error: "Heslo musí mít alespoň 8 znaků." };

  const requiredInvite = process.env.INVITE_CODE || "";
  if (requiredInvite && invite !== requiredInvite)
    return { error: "Neplatný zvací kód." };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Tento e-mail už je registrovaný." };

  // Úplně první uživatel se stane adminem a je rovnou schválený.
  const count = await prisma.user.count();
  const isFirst = count === 0;

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      role: isFirst ? "ADMIN" : "MEMBER",
      approved: isFirst, // ostatní čekají na schválení
    },
  });

  if (user.approved) {
    await createSession(user.id);
    redirect("/");
  }
  redirect("/login?pending=1");
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash)))
    return { error: "Nesprávný e-mail nebo heslo." };
  if (!user.approved)
    return { error: "Účet ještě nebyl schválen adminem." };

  await createSession(user.id);
  redirect("/");
}

export async function logoutAction() {
  destroySession();
  redirect("/login");
}
