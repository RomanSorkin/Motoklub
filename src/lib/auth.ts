import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

const COOKIE = "moto_session";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-secret-zmen-me"
);

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "MEMBER";
  approved: boolean;
};

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

// Vytvoří přihlašovací token a uloží ho do httpOnly cookie
export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

  cookies().set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function destroySession() {
  cookies().set(COOKIE, "", { path: "/", maxAge: 0 });
}

// Načte aktuálně přihlášeného uživatele z cookie (nebo null)
export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.sub as string;
    if (!userId) return null;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, approved: true },
    });
    return user;
  } catch {
    return null;
  }
}

// Pomocník: vyžaduje schváleného přihlášeného uživatele
export async function requireApprovedUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  if (!user.approved) throw new Error("NOT_APPROVED");
  return user;
}
