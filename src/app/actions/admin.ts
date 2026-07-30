"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");
  return user;
}

export async function approveUserAction(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("userId") || "");
  if (!userId) return;
  await prisma.user.update({ where: { id: userId }, data: { approved: true } });
  revalidatePath("/admin");
}

export async function deleteUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") || "");
  if (!userId || userId === admin.id) return; // sám sebe nesmaž
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin");
}
