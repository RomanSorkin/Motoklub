import { PrismaClient } from "@prisma/client";

// Jedna instance Prisma klienta na celý běh (v dev módu se jinak vytváří znovu při hot-reloadu)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
