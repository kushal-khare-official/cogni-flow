/**
 * Delete agent passports (and cascaded mandates + audit logs) from the production DB.
 *
 * Usage:
 *   Set DATABASE_URL_PROD to your prod Postgres URL, then:
 *
 *   # Delete specific agents by ID:
 *   npm run db:delete-agents -- --ids clxyz1,clxyz2
 *
 *   # Delete agents by fingerprint:
 *   npm run db:delete-agents -- --fingerprints fp_abc,fp_def
 *
 *   # Delete ALL agents (requires --confirm-all):
 *   npm run db:delete-agents -- --all --confirm-all
 *
 *   # Dry run (preview what would be deleted):
 *   npm run db:delete-agents -- --all --dry-run
 *
 * Example (PowerShell):
 *   $env:DATABASE_URL_PROD = "postgresql://...prod..."
 *   npm run db:delete-agents -- --ids clxyz1,clxyz2
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const prodUrl = process.env["DATABASE_URL_PROD"];

if (!prodUrl || !prodUrl.startsWith("postgres")) {
  console.error(
    "DATABASE_URL_PROD must be a PostgreSQL connection string. Set it before running this script."
  );
  process.exit(1);
}

const prodPrisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: prodUrl }),
});

function parseArgs() {
  const args = process.argv.slice(2);
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--all") {
      flags.all = true;
    } else if (arg === "--confirm-all") {
      flags.confirmAll = true;
    } else if (arg === "--dry-run") {
      flags.dryRun = true;
    } else if (arg === "--ids" && args[i + 1]) {
      flags.ids = args[++i];
    } else if (arg === "--fingerprints" && args[i + 1]) {
      flags.fingerprints = args[++i];
    }
  }

  return flags;
}

async function main() {
  const flags = parseArgs();
  const dryRun = !!flags.dryRun;

  if (dryRun) {
    console.log("=== DRY RUN — no data will be deleted ===\n");
  }

  let agents: { id: string; name: string; fingerprint: string; status: string }[];

  if (flags.ids) {
    const ids = (flags.ids as string).split(",").map((s) => s.trim());
    agents = await prodPrisma.agentPassport.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, fingerprint: true, status: true },
    });

    const found = new Set(agents.map((a) => a.id));
    const missing = ids.filter((id) => !found.has(id));
    if (missing.length) {
      console.warn(`Warning: agents not found for IDs: ${missing.join(", ")}`);
    }
  } else if (flags.fingerprints) {
    const fps = (flags.fingerprints as string).split(",").map((s) => s.trim());
    agents = await prodPrisma.agentPassport.findMany({
      where: { fingerprint: { in: fps } },
      select: { id: true, name: true, fingerprint: true, status: true },
    });

    const found = new Set(agents.map((a) => a.fingerprint));
    const missing = fps.filter((fp) => !found.has(fp));
    if (missing.length) {
      console.warn(`Warning: agents not found for fingerprints: ${missing.join(", ")}`);
    }
  } else if (flags.all) {
    if (!flags.confirmAll && !dryRun) {
      console.error(
        "Refusing to delete ALL agents without --confirm-all flag. " +
          "Use --dry-run to preview, or add --confirm-all to proceed."
      );
      process.exit(1);
    }
    agents = await prodPrisma.agentPassport.findMany({
      select: { id: true, name: true, fingerprint: true, status: true },
    });
  } else {
    console.error(
      "No target specified. Use one of:\n" +
        "  --ids <id1,id2,...>\n" +
        "  --fingerprints <fp1,fp2,...>\n" +
        "  --all --confirm-all"
    );
    process.exit(1);
  }

  if (agents.length === 0) {
    console.log("No matching agents found. Nothing to delete.");
    return;
  }

  console.log(`Found ${agents.length} agent(s) to delete:\n`);
  for (const a of agents) {
    const mandateCount = await prodPrisma.agentMandate.count({
      where: { agentPassportId: a.id },
    });
    const auditLogCount = await prodPrisma.agentAuditLog.count({
      where: { agentPassportId: a.id },
    });
    console.log(
      `  • ${a.name} (id=${a.id}, fingerprint=${a.fingerprint}, status=${a.status})` +
        `\n    → ${mandateCount} mandate(s), ${auditLogCount} audit log(s) will cascade-delete`
    );
  }

  if (dryRun) {
    console.log("\n=== DRY RUN complete — no data was deleted ===");
    return;
  }

  console.log("\nDeleting...");

  const result = await prodPrisma.agentPassport.deleteMany({
    where: { id: { in: agents.map((a) => a.id) } },
  });

  console.log(
    `\nDone. Deleted ${result.count} agent passport(s) and their cascaded mandates + audit logs.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prodPrisma.$disconnect());
