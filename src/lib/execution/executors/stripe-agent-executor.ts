import Stripe from "stripe";
import { createStripeClient } from "@/lib/stripe/toolkit";

export interface StripeAgentParams {
  apiKey: string;
  operationId: string;
  resolvedInputs: Record<string, unknown>;
}

/**
 * Execute a single Stripe API action by operationId.
 * Used by the stripe_agent integration template (agentic payment workflows).
 */
export async function executeStripeAgent(
  params: StripeAgentParams,
): Promise<Record<string, unknown>> {
  const { apiKey, operationId, resolvedInputs } = params;
  const stripe = createStripeClient(apiKey);

  switch (operationId) {
    case "createPaymentIntent": {
      const intent = await stripe.paymentIntents.create({
        amount: Number(resolvedInputs.amount ?? 0),
        currency: String(resolvedInputs.currency ?? "usd"),
        ...(resolvedInputs.description != null && resolvedInputs.description !== ""
          ? { description: String(resolvedInputs.description) }
          : {}),
      });
      return { id: intent.id, status: intent.status, client_secret: intent.client_secret };
    }

    case "retrievePaymentIntent": {
      const id = String(resolvedInputs.paymentIntentId ?? resolvedInputs.id ?? "");
      const intent = await stripe.paymentIntents.retrieve(id);
      return { id: intent.id, status: intent.status, amount: intent.amount };
    }

    case "confirmPaymentIntent": {
      const intentId = String(
        resolvedInputs.paymentIntentId ?? resolvedInputs.id ?? "",
      );
      const spt = String(
        resolvedInputs.sharedPaymentGrantedToken ??
          resolvedInputs.shared_payment_granted_token ??
          "",
      );
      if (!spt) {
        throw new Error(
          "confirmPaymentIntent requires sharedPaymentGrantedToken (SPT from Stripe ACP)",
        );
      }
      const intent = await stripe.paymentIntents.confirm(intentId, {
        payment_method_options: {
          card: {
            shared_payment_granted_token: spt,
          } as Record<string, unknown>,
        },
      });
      return {
        id: intent.id,
        status: intent.status,
        amount: intent.amount,
        client_secret: intent.client_secret ?? undefined,
      };
    }

    case "listCustomers": {
      const list = await stripe.customers.list({
        limit: Number(resolvedInputs.limit ?? 10),
      });
      return { data: list.data, has_more: list.has_more };
    }

    case "createRefund": {
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: String(resolvedInputs.payment_intent ?? resolvedInputs.paymentIntentId ?? ""),
      };
      if (resolvedInputs.amount != null) refundParams.amount = Number(resolvedInputs.amount);
      if (resolvedInputs.reason != null && resolvedInputs.reason !== "")
        refundParams.reason = String(resolvedInputs.reason) as Stripe.RefundCreateParams.Reason;
      const refund = await stripe.refunds.create(refundParams);
      return { id: refund.id, status: refund.status, amount: refund.amount };
    }

    case "createPaymentLink": {
      const amount = Number(resolvedInputs.amount ?? 0);
      const currency = String(resolvedInputs.currency ?? "usd");
      const productData: Stripe.PaymentLinkCreateParams.LineItem.PriceData.ProductData = {
        name: String(resolvedInputs.name ?? "Product"),
      };
      if (resolvedInputs.description != null && resolvedInputs.description !== "")
        productData.description = String(resolvedInputs.description);
      const lineItems: Stripe.PaymentLinkCreateParams.LineItem[] = [
        {
          price_data: {
            currency,
            unit_amount: amount,
            product_data: productData,
          },
          quantity: 1,
        },
      ];
      const linkParams: Stripe.PaymentLinkCreateParams = { line_items: lineItems };
      if (resolvedInputs.metadata != null && typeof resolvedInputs.metadata === "object")
        linkParams.metadata = resolvedInputs.metadata as Record<string, string>;
      const link = await stripe.paymentLinks.create(linkParams);
      return { id: link.id, url: link.url };
    }

    case "createProduct": {
      const productParams: Stripe.ProductCreateParams = {
        name: String(resolvedInputs.name ?? "Product"),
      };
      if (resolvedInputs.description != null && resolvedInputs.description !== "")
        productParams.description = String(resolvedInputs.description);
      if (resolvedInputs.metadata != null && typeof resolvedInputs.metadata === "object")
        productParams.metadata = resolvedInputs.metadata as Record<string, string>;
      const product = await stripe.products.create(productParams);
      return { id: product.id, name: product.name };
    }

    case "createPrice": {
      const price = await stripe.prices.create({
        product: String(resolvedInputs.product ?? resolvedInputs.productId ?? ""),
        unit_amount: Number(resolvedInputs.unit_amount ?? resolvedInputs.unitAmount ?? 0),
        currency: String(resolvedInputs.currency ?? "usd"),
      });
      return { id: price.id, unit_amount: price.unit_amount, currency: price.currency };
    }

    case "listPrices": {
      const listParams: Stripe.PriceListParams = {
        limit: Number(resolvedInputs.limit ?? 10),
      };
      if (resolvedInputs.product != null && resolvedInputs.product !== "")
        listParams.product = String(resolvedInputs.product);
      const list = await stripe.prices.list(listParams);
      return { data: list.data, has_more: list.has_more };
    }

    default:
      throw new Error(`Unknown stripe_agent operation: ${operationId}`);
  }
}
