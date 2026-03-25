import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";

const PREMIUM_COOKIE = "abgs_premium_customer";
const PREMIUM_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function cookieSecret() {
  return process.env.PREMIUM_COOKIE_SECRET || process.env.STRIPE_SECRET_KEY || null;
}

function signCookieValue(value: string) {
  const secret = cookieSecret();
  if (!secret) return null;

  return createHmac("sha256", secret).update(value).digest("hex");
}

export function encodePremiumCookie(customerId: string) {
  const payload = Buffer.from(customerId, "utf8").toString("base64url");
  const signature = signCookieValue(payload);
  if (!signature) return null;
  return `${payload}.${signature}`;
}

export function decodePremiumCookie(cookieValue: string | undefined) {
  if (!cookieValue) return null;

  const [payload, signature] = cookieValue.split(".");
  if (!payload || !signature) return null;

  const expectedSignature = signCookieValue(payload);
  if (!expectedSignature || signature.length !== expectedSignature.length) {
    return null;
  }

  const isValid = timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );

  if (!isValid) return null;

  try {
    return Buffer.from(payload, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

export async function getPremiumCustomerIdFromCookies() {
  const cookieStore = await cookies();
  return decodePremiumCookie(cookieStore.get(PREMIUM_COOKIE)?.value);
}

export async function setPremiumCustomerCookie(customerId: string) {
  const cookieValue = encodePremiumCookie(customerId);
  if (!cookieValue) {
    throw new Error("Premium cookie secret is not configured");
  }

  const cookieStore = await cookies();
  cookieStore.set(PREMIUM_COOKIE, cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PREMIUM_COOKIE_MAX_AGE,
  });
}

export async function clearPremiumCustomerCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(PREMIUM_COOKIE);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function checkoutCustomerId(session: Stripe.Checkout.Session) {
  if (typeof session.customer === "string") {
    return session.customer;
  }

  return session.customer?.id || null;
}

async function listCheckoutSessions(customerId: string) {
  const sessions: Stripe.Checkout.Session[] = [];
  let startingAfter: string | undefined;

  while (true) {
    const page = await stripe().checkout.sessions.list({
      customer: customerId,
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    sessions.push(...page.data);

    if (!page.has_more || page.data.length === 0) {
      return sessions;
    }

    startingAfter = page.data[page.data.length - 1]?.id;
    if (!startingAfter) {
      return sessions;
    }
  }
}

function isPaidCharacterSession(
  session: Stripe.Checkout.Session,
  characterId: string
) {
  const sessionCharacterId = session.metadata?.characterId || null;

  return (
    session.status === "complete" &&
    session.payment_status === "paid" &&
    (sessionCharacterId === characterId ||
      (!sessionCharacterId && characterId === "eunha"))
  );
}

export async function hasPaidCharacterAccess(
  customerId: string,
  characterId: string
) {
  const sessions = await listCheckoutSessions(customerId);
  return sessions.some((session) => isPaidCharacterSession(session, characterId));
}

export async function findCustomerIdWithCharacterAccessByEmail(
  email: string,
  characterId: string
) {
  const normalizedEmail = normalizeEmail(email);
  const customers = await stripe().customers.list({
    email: normalizedEmail,
    limit: 100,
  });

  for (const customer of customers.data) {
    if ("deleted" in customer) continue;
    if (normalizeEmail(customer.email || "") !== normalizedEmail) continue;

    const hasPaid = await hasPaidCharacterAccess(customer.id, characterId);
    if (hasPaid) {
      return customer.id;
    }
  }

  return null;
}

export async function claimPaidCharacterSession(
  sessionId: string,
  characterId: string
) {
  const session = await stripe().checkout.sessions.retrieve(sessionId);
  const customerId = checkoutCustomerId(session);

  if (!customerId || !isPaidCharacterSession(session, characterId)) {
    return null;
  }

  return customerId;
}
