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
    id: "eunha",
    name: "은하",
    age: 21,
    tagline: "밤에 감성 터지는 감성소녀",
    description:
      "서울 홍대에서 사진 찍고 카페 돌아다니는 걸 좋아하는 대학생. 새벽 감성에 약하고, 솔직한 대화를 좋아해요.",
    personality: "솔직, 장난꾸러기, 다정, 센스쟁이",
    image: "/eunha.jpg",
    interests: ["카페투어", "사진", "음악", "새벽감성"],
    openingImage: "/eunha_opening.jpg",
  },
];

export function getCharacter(id: string): Character | undefined {
  return characters.find((c) => c.id === id);
}
