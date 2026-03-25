import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

let _stripe: Stripe;
function stripe() {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  return _stripe;
}

export async function POST(req: NextRequest) {
  const { origin } = new URL(req.url);

  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "krw",
            product: "prod_UCBLp0x6wfoWPw",
            unit_amount: 4900,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/chat/eunha?success=1`,
      cancel_url: `${origin}/chat/eunha?canceled=1`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json(
      { error: "결제 세션을 만들 수 없어요" },
      { status: 500 }
    );
  }
}

