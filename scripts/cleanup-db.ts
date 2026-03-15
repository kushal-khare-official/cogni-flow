/**
 * Clean up the database:
 * - Delete all workflows except the two PayU ones
 * - Delete Stripe integration records
 * - Delete AgenticCheckoutSession records (if table still exists)
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npm run db:cleanup
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const KEEP_WORKFLOW_IDS = [
  "cmmrj5kmi000004l891tp3vhy",
  "cmmrs95cv00028olngwk35neu",
];

const DELETE_INTEGRATION_IDS = [
  "tpl-stripe",
  "tpl-stripe-issuing",
  "tpl-stripe-billing",
  "tpl-stripe-agent-toolkit",
];

const url = process.env["DATABASE_URL"];
if (!url?.startsWith("postgres")) {
  console.error("DATABASE_URL must be a PostgreSQL connection string.");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

async function main() {
  const deletedWorkflows = await prisma.workflow.deleteMany({
    where: {
      id: { notIn: KEEP_WORKFLOW_IDS },
    },
  });
  console.log(`Deleted ${deletedWorkflows.count} workflow(s) (kept ${KEEP_WORKFLOW_IDS.join(", ")})`);

  const deletedIntegrations = await prisma.integration.deleteMany({
    where: {
      id: { in: DELETE_INTEGRATION_IDS },
    },
  });
  console.log(`Deleted ${deletedIntegrations.count} Stripe integration(s)`);

  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "AgenticCheckoutSession"`);
    console.log("Cleared AgenticCheckoutSession table");
  } catch {
    console.log("AgenticCheckoutSession table not found or already removed (OK)");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
