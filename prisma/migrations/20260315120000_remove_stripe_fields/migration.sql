-- Remove Stripe-related fields and the AgenticCheckoutSession table

-- Drop stripeObjectId from AgentAuditLog
ALTER TABLE "AgentAuditLog" DROP COLUMN IF EXISTS "stripeObjectId";

-- Drop stripeKeyScope from AgentPassport
ALTER TABLE "AgentPassport" DROP COLUMN IF EXISTS "stripeKeyScope";

-- Drop the AgenticCheckoutSession table
DROP TABLE IF EXISTS "AgenticCheckoutSession";
