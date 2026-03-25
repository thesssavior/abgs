import { NextRequest, NextResponse } from "next/server";
import { getCharacter } from "@/lib/characters";
import {
  findCustomerIdWithCharacterAccessByEmail,
  normalizeEmail,
  setPremiumCustomerCookie,
} from "@/lib/premium";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const characterId = typeof body?.characterId === "string" ? body.characterId : "";
  const rawEmail = typeof body?.email === "string" ? body.email : "";
  const email = normalizeEmail(rawEmail);
  const character = getCharacter(characterId);

  if (!character || !email) {
    return NextResponse.json(
      { error: "복원에 필요한 정보가 부족해요" },
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
    const customerId = await findCustomerIdWithCharacterAccessByEmail(
      email,
      character.id
    );
    if (!customerId) {
      return NextResponse.json(
        { error: "이 이메일로 이 캐릭터를 결제한 내역을 찾지 못했어요" },
        { status: 404 }
      );
    }

    await setPremiumCustomerCookie(customerId);

    return NextResponse.json({ hasPaid: true });
  } catch (error) {
    console.error("Premium restore error:", error);
    return NextResponse.json(
      { error: "구매 내역을 복원하지 못했어요" },
      { status: 500 }
    );
  }
}
