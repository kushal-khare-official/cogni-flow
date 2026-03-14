import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";
import { BUILT_IN_INTEGRATIONS } from "../src/lib/integrations/built-in";

function createClient() {
  const dbPath = path.resolve(process.cwd(), "dev.db");
  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  return new PrismaClient({ adapter } as never);
}

const prisma = createClient();

async function main() {
  for (const integration of BUILT_IN_INTEGRATIONS) {
    await prisma.integration.upsert({
      where: { id: integration.id },
      update: { ...integration },
      create: { ...integration },
    });
  }
  console.log(`Seeded ${BUILT_IN_INTEGRATIONS.length} integrations.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
