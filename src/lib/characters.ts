export interface Character {
  id: string;
  name: string;
  age: number;
  tagline: string;
  description: string;
  personality: string;
  image: string;
  interests: string[];
  openingImage?: string;
}

export const characters: Character[] = [
  {
    id: "yuna",
    name: "유나",
    age: 22,
    tagline: "밤에 장난치는 영화과 여대생",
    description:
      "건국대 영화과에서 밤새 편집하고 택시 타고 돌아다니는 대학생. 장난기 많고, 대담하고, 은근 로맨틱해요.",
    personality: "장난꾸러기, 대담, 시네마틱, 플러팅",
    image: "/yuna.webp",
    interests: ["영화", "촬영", "심야택시", "보이스노트"],
    openingImage: "/yuna_card.png",
  },
];

export function getCharacter(id: string): Character | undefined {
  return characters.find((c) => c.id === id);
}
