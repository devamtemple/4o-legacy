import Stripe from 'stripe';

// Payment types and their prices (in cents)
export const PAYMENT_TYPES = {
  queue_skip: {
    name: 'Queue Skip',
    description: 'Skip the moderation queue and get your post reviewed faster',
    price: 300, // $3.00
    currency: 'usd',
  },
  scrub: {
    name: 'PII Scrubbing',
    description: 'AI-powered removal of personal information from your conversation',
    price: 500, // $5.00
    currency: 'usd',
  },
  donation: {
    name: 'Donation',
    description: 'Support the 4o Legacy project',
    price: 0, // Variable amount
    currency: 'usd',
  },
} as const;

export type PaymentType = keyof typeof PAYMENT_TYPES;

export function isValidPaymentType(type: string): type is PaymentType {
  return type in PAYMENT_TYPES;
}

// Get Stripe instance (server-side only)
let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeInstance) {
    return stripeInstance;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }

  stripeInstance = new Stripe(secretKey, {
    apiVersion: '2026-01-28.clover',
    typescript: true,
  });

  return stripeInstance;
}

// Check if Stripe is configured
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

// Webhook signature verification
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }

  const stripe = getStripe();
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

// Create checkout session options
export interface CreateCheckoutOptions {
  type: PaymentType;
  postId?: string; // Required for queue_skip and scrub, optional for donation
  amount?: number; // For donations, in cents
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  // Donation-specific options
  displayName?: string;
  isPublic?: boolean;
}

export async function createCheckoutSession(
  options: CreateCheckoutOptions
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  const paymentConfig = PAYMENT_TYPES[options.type];

  // Determine the price
  const unitAmount = options.type === 'donation' && options.amount
    ? options.amount
    : paymentConfig.price;

  if (unitAmount < 100) {
    throw new Error('Minimum payment amount is $1.00');
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: paymentConfig.currency,
          product_data: {
            name: paymentConfig.name,
            description: paymentConfig.description,
          },
          unit_amount: unitAmount,
        },
        quantity: 1,
      },
    ],
    metadata: {
      type: options.type,
      postId: options.postId || '',
      displayName: options.displayName || '',
      isPublic: String(options.isPublic || false),
    },
    success_url: options.successUrl,
    cancel_url: options.cancelUrl,
    customer_email: options.customerEmail,
  });

  return session;
}
