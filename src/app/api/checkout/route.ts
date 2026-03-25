import { NextRequest, NextResponse } from "next/server";
import { getCharacter } from "@/lib/characters";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const { origin } = new URL(req.url);
  const body = await req.json().catch(() => null);
  const characterId = typeof body?.characterId === "string" ? body.characterId : "";
  const character = getCharacter(characterId);

  if (!character) {
    return NextResponse.json(
      { error: "결제할 캐릭터를 찾을 수 없어요" },
      { status: 400 }
    );
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "결제 기능이 아직 준비되지 않았어요" },
      { status: 500 }
    );
  }

  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      customer_creation: "always",
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
      metadata: {
        characterId: character.id,
      },
      success_url: `${origin}/chat/${character.id}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/chat/${character.id}?checkout=canceled`,
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
