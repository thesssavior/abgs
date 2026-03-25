import { Suspense } from "react";
import { characters, getCharacter } from "@/lib/characters";
import { notFound } from "next/navigation";
import ChatClient from "./ChatClient";

export function generateStaticParams() {
  return characters.map((c) => ({ id: c.id }));
}

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const character = getCharacter(id);
  if (!character) notFound();

  return (
    <Suspense>
      <ChatClient character={character} />
    </Suspense>
  );
}
