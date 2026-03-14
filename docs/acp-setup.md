# CogniFlow as ACP Seller (Stripe Agentic Commerce)

CogniFlow can act as a **seller** in Stripe's Agentic Commerce Protocol (ACP), so AI agents (e.g. ChatGPT) can create and complete checkouts and pay on behalf of users using Shared Payment Tokens (SPTs).

## Register as a seller in Stripe

1. In the **Stripe Dashboard**, go to **Agentic Commerce** (or the relevant Marketplace / ACP onboarding section).
2. Register your product (CogniFlow) and complete seller onboarding. Note any **network ID** or seller identifiers Stripe provides.
3. Ensure your Stripe account has **Agentic Commerce** and **Shared Payment Tokens** enabled (required API version: 2026-01+).

### Complete marketplace registration (Stripe SDK)

Use the Stripe SDK to register the webhook endpoint for ACP events so Stripe can send `payment_intent.succeeded`, SPT lifecycle, and (optionally) catalog import events to your app.

1. Set **STRIPE_SECRET_KEY** in `.env` or `.env.local`.
2. Set **STRIPE_WEBHOOK_URL** (full base URL, e.g. `https://your-cogniflow.com`) or **NEXT_PUBLIC_APP_URL**.
3. Run:
   ```bash
   npm run stripe:register
   ```
   This creates a webhook endpoint at `{baseUrl}/api/stripe/webhook` with events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `shared_payment.granted_token.used`, `shared_payment.granted_token.deactivated`. If the endpoint already exists for that URL, the script does nothing.
4. Copy the printed **STRIPE_WEBHOOK_SECRET** into your environment (e.g. `.env.local`). The secret is only returned when the endpoint is first created.
5. (Optional) To also receive catalog import events, set `STRIPE_MARKETPLACE_INCLUDE_CATALOG=1` and run the script again (or create a second endpoint in the Dashboard).

Implementation: [src/lib/stripe/marketplace.ts](src/lib/stripe/marketplace.ts) and [scripts/stripe-marketplace-register.ts](scripts/stripe-marketplace-register.ts).

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key (live or test). Used to create PaymentIntents and confirm with SPT. |
| `STRIPE_WEBHOOK_SECRET` | For webhooks | Signing secret for Stripe webhooks (payment_intent.succeeded, shared_payment.granted_token.*). |
| `ACP_COMPLETE_WORKFLOW_ID` | Optional | Workflow ID to run when an ACP checkout is completed. That workflow receives `sharedPaymentGrantedToken` (and optional `passportId`, `mandateId`) as trigger input so the SPT is "provisioned" into the KYA workflow. |

## ACP API base URL

Expose your CogniFlow base URL to agents (e.g. in Stripe Dashboard or agent configuration). The ACP checkout endpoints are:

- **Base path:** `https://<your-cogniflow-domain>/api/acp/checkouts`
- **Create:** `POST /api/acp/checkouts` — body: `{ "items": [{ "id", "quantity", "unit_amount?" }], "buyer?", "fulfillment_address?" }`. Optional `metadata`: `{ "workflowId", "passportId", "mandateId" }` to choose the KYA workflow and pass through to the run.
- **Get:** `GET /api/acp/checkouts/:id`
- **Update:** `PUT /api/acp/checkouts/:id` — body: `{ "items?", "buyer?", "fulfillment_address?", "fulfillment_option_id?" }`
- **Complete:** `POST /api/acp/checkouts/:id/complete` — body: `{ "payment_data": { "token": "<SPT>", "provider": "stripe" } }`. CogniFlow confirms the PaymentIntent with the SPT and, if `ACP_COMPLETE_WORKFLOW_ID` or session `workflowId` is set, starts that workflow with `sharedPaymentGrantedToken` in the trigger input.
- **Cancel:** `POST /api/acp/checkouts/:id/cancel`

## Security

- Use **HTTPS** in production.
- ACP requests may require **signature and timestamp** verification per [Stripe ACP security](https://docs.stripe.com/agentic-commerce/protocol#security). Implement request validation if your integration partner requires it.
- Store `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` securely (e.g. in environment or secrets manager).

## SPT in KYA workflow

When an agent calls **Complete** with a Shared Payment Token:

1. CogniFlow confirms the PaymentIntent with the SPT (payment is charged).
2. If a workflow is configured (`ACP_COMPLETE_WORKFLOW_ID` or `metadata.workflowId` on create), CogniFlow starts that workflow with trigger input: `sharedPaymentGrantedToken`, and optionally `passportId` and `mandateId` from the checkout session metadata.
3. The workflow’s Start node receives the SPT; downstream steps (e.g. Confirm Payment Intent, Record Spend) can use it. This is “SPT provisioned in KYA Workflow.”

To use the **Agentic Payment with KYA Guardrails** demo as the post-complete workflow: publish that workflow, copy its ID, and set `ACP_COMPLETE_WORKFLOW_ID` to that ID. When creating a checkout, you can pass `metadata: { passportId, mandateId }` so the workflow has the required KYA inputs.
