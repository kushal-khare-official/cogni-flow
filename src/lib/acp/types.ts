/**
 * Minimal ACP (Agentic Commerce Protocol) types for checkout endpoints.
 * See https://docs.stripe.com/agentic-commerce/protocol/specification
 */

export interface AcpItem {
  id: string;
  quantity: number;
  unit_amount?: number;
}

export interface AcpBuyer {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
}

export interface AcpAddress {
  name?: string;
  line_one?: string;
  line_two?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
}

export interface AcpPaymentData {
  token: string;
  provider: string;
  billing_address?: AcpAddress;
}

export interface AcpCreateCheckoutBody {
  items: AcpItem[];
  buyer?: AcpBuyer;
  fulfillment_address?: AcpAddress;
}

export interface AcpUpdateCheckoutBody {
  buyer?: AcpBuyer;
  items?: AcpItem[];
  fulfillment_address?: AcpAddress;
  fulfillment_option_id?: string;
}

export interface AcpCompleteCheckoutBody {
  buyer?: AcpBuyer;
  payment_data: AcpPaymentData;
}

export interface AcpLineItem {
  id: string;
  item: { id: string; quantity: number };
  base_amount: number;
  discount: number;
  total: number;
  subtotal: number;
  tax: number;
}

export interface AcpTotal {
  type: string;
  display_text: string;
  amount: number;
}

export interface AcpFulfillmentOption {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  carrier?: string;
  subtotal: number;
  tax: number;
  total: number;
}

export interface AcpCheckoutResponse {
  id: string;
  status: string;
  currency: string;
  line_items: AcpLineItem[];
  fulfillment_options: AcpFulfillmentOption[];
  fulfillment_option_id?: string;
  totals: AcpTotal[];
  messages: unknown[];
  links: unknown[];
  payment_provider?: { provider: string; supported_payment_methods: string[] };
  buyer?: AcpBuyer;
  fulfillment_address?: AcpAddress;
  order?: { order_id: string; order_number?: string; permalink_url?: string; status: string };
}
