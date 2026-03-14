/**
 * Push workflows from local DB to production DB.
 *
 * Local DB: SQLite (file:./dev.db or path) or PostgreSQL.
 * Production DB: PostgreSQL only (DATABASE_URL_PROD).
 *
 * Usage:
 *   Set DATABASE_URL_PROD to your prod Postgres URL, then:
 *   npm run db:push-workflows
 *
 * Example (PowerShell):
 *   $env:DATABASE_URL_PROD = "postgresql://...prod..."
 *   npm run db:push-workflows
 */
import "dotenv/config";
import path from "path";
import Database from "better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const localUrl = process.env["DATABASE_URL"];
const prodUrl = process.env["DATABASE_URL_PROD"];

if (!prodUrl || !prodUrl.startsWith("postgres")) {
  console.error(
    "DATABASE_URL_PROD must be a PostgreSQL connection string (your production DB). Set it before running this script."
  );
  process.exit(1);
}

type WorkflowRow = {
  id: string;
  name: string;
  description: string;
  status: string;
  nodes: string;
  edges: string;
  createdAt: string | number;
  updatedAt: string | number;
};

function getLocalWorkflowsFromSqlite(): WorkflowRow[] {
  const dbPath = localUrl?.startsWith("file:")
    ? path.resolve(process.cwd(), localUrl.replace(/^file:\/?/, ""))
    : path.resolve(process.cwd(), "dev.db");
  const db = new Database(dbPath);
  const rows = db.prepare("SELECT * FROM Workflow ORDER BY updatedAt ASC").all() as WorkflowRow[];
  db.close();
  return rows;
}

const prodPrisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: prodUrl }),
});

function toDate(v: string | number): Date {
  if (typeof v === "number") return new Date(v);
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return new Date();
  return d;
}

async function main() {
  const workflows = localUrl?.startsWith("postgres")
    ? await (async () => {
        const prisma = new PrismaClient({
          adapter: new PrismaPg({ connectionString: localUrl! }),
        });
        const rows = await prisma.workflow.findMany({ orderBy: { updatedAt: "asc" } });
        await prisma.$disconnect();
        return rows as unknown as WorkflowRow[];
      })()
    : getLocalWorkflowsFromSqlite();

  console.log(`Found ${workflows.length} workflow(s) in local DB.`);

  if (workflows.length === 0) {
    console.log("Nothing to push.");
    return;
  }

  for (const w of workflows) {
    await prodPrisma.workflow.upsert({
      where: { id: w.id },
      update: {
        name: w.name,
        description: w.description,
        status: w.status,
        nodes: w.nodes,
        edges: w.edges,
        updatedAt: toDate(w.updatedAt),
      },
      create: {
        id: w.id,
        name: w.name,
        description: w.description,
        status: w.status,
        nodes: w.nodes,
        edges: w.edges,
        createdAt: toDate(w.createdAt),
        updatedAt: toDate(w.updatedAt),
      },
    });
  }

  console.log(`Pushed ${workflows.length} workflow(s) to production (upserted by id).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prodPrisma.$disconnect());
