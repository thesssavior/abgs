import { NextRequest, NextResponse } from "next/server";
import { getCharacter } from "@/lib/characters";
import { getPremiumCustomerIdFromCookies, hasPaidCharacterAccess } from "@/lib/premium";

export async function GET(req: NextRequest) {
  const characterId = req.nextUrl.searchParams.get("characterId") || "";
  const character = getCharacter(characterId);

  if (!character) {
    return NextResponse.json(
      { error: "캐릭터를 찾을 수 없어요" },
      { status: 400 }
    );
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ hasPaid: false });
  }

  try {
    const customerId = await getPremiumCustomerIdFromCookies();
    if (!customerId) {
      return NextResponse.json({ hasPaid: false });
    }

    const hasPaid = await hasPaidCharacterAccess(customerId, character.id);
    return NextResponse.json({ hasPaid });
  } catch (error) {
    console.error("Premium status error:", error);
    return NextResponse.json({ hasPaid: false });
  }
}
