import { NextRequest, NextResponse } from "next/server";
import { getCharacter } from "@/lib/characters";
import {
  claimPaidCharacterSession,
  setPremiumCustomerCookie,
} from "@/lib/premium";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
  const characterId = typeof body?.characterId === "string" ? body.characterId : "";
  const character = getCharacter(characterId);

  if (!sessionId || !character) {
    return NextResponse.json(
      { error: "결제 확인에 필요한 정보가 부족해요" },
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
    const customerId = await claimPaidCharacterSession(sessionId, character.id);
    if (!customerId) {
      return NextResponse.json(
        { error: "결제 완료가 확인되지 않았어요" },
        { status: 400 }
      );
    }

    await setPremiumCustomerCookie(customerId);

    return NextResponse.json({ hasPaid: true });
  } catch (error) {
    console.error("Stripe claim error:", error);
    return NextResponse.json(
      { error: "결제 내역을 확인하지 못했어요" },
      { status: 500 }
    );
  }
}
