/**
 * Register CogniFlow with Stripe for Agentic Commerce / marketplace by creating
 * a webhook endpoint for ACP events (payment_intent, SPT). Uses STRIPE_SECRET_KEY
 * and webhook URL from env. Run once after setting STRIPE_SECRET_KEY.
 *
 * Usage:
 *   npx tsx scripts/stripe-marketplace-register.ts
 *   # or
 *   npm run stripe:register
 *
 * Env:
 *   STRIPE_SECRET_KEY (required)
 *   STRIPE_WEBHOOK_URL or NEXT_PUBLIC_APP_URL (e.g. https://your-app.com)
 *   Optional: STRIPE_MARKETPLACE_INCLUDE_CATALOG=1 to add catalog import events
 */
import { config } from "dotenv";
import path from "path";

// Load .env and .env.local (Next.js-style)
config({ path: path.resolve(process.cwd(), ".env") });
config({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error("Missing STRIPE_SECRET_KEY. Set it in .env or .env.local.");
    process.exit(1);
  }

  const baseUrl =
    process.env.STRIPE_WEBHOOK_URL ||
    (process.env.NEXT_PUBLIC_APP_URL
      ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
      : null);
  if (!baseUrl) {
    console.error(
      "Missing STRIPE_WEBHOOK_URL or NEXT_PUBLIC_APP_URL. Set one to your app base URL (e.g. https://your-cogniflow.com).",
    );
    process.exit(1);
  }

  const webhookUrl = `${baseUrl}/api/stripe/webhook`;
  const includeCatalog = process.env.STRIPE_MARKETPLACE_INCLUDE_CATALOG === "1";

  const { ensureMarketplaceWebhook } = await import(
    "../src/lib/stripe/marketplace"
  );
  const result = await ensureMarketplaceWebhook(webhookUrl, {
    includeCatalogEvents: includeCatalog,
  });

  if (result.created) {
    console.log("Created Stripe webhook endpoint for marketplace/ACP.");
    console.log("Endpoint URL:", result.url);
    console.log("\nSet this in your environment (e.g. .env.local):");
    console.log("STRIPE_WEBHOOK_SECRET=" + result.secret);
  } else {
    console.log("Webhook endpoint already exists for this URL:", result.url);
    if (result.secret) {
      console.log("Signing secret (if you lost it, create a new endpoint in Dashboard):");
      console.log("STRIPE_WEBHOOK_SECRET=" + result.secret);
    } else {
      console.log(
        "Signing secret is only shown at creation. See Dashboard → Developers → Webhooks if you need to rotate.",
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
