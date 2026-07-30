/**
 * Ruční vytvoření / povýšení admina.
 * Spuštění:  npm run create:admin -- <email> <heslo> [jmeno]
 * Když uživatel s daným e-mailem existuje, jen ho povýší na schváleného admina.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const [email, password, name] = process.argv.slice(2);
  if (!email || !password) {
    console.error("Použití: npm run create:admin -- <email> <heslo> [jmeno]");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { role: "ADMIN", approved: true, passwordHash },
    create: {
      email: email.toLowerCase(),
      name: name || "Admin",
      passwordHash,
      role: "ADMIN",
      approved: true,
    },
  });
  console.log(`✅ Admin připraven: ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
