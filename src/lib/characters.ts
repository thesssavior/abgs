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
  paywallImage: string;
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
    image: "/Yuna/main.png",
    interests: ["영화", "촬영", "심야택시", "보이스노트"],
    openingImage: "/Yuna/bed.png",
    paywallImage: "/Yuna/omg.png",
  },
  {
    id: "jia",
    name: "지아",
    age: 23,
    tagline: "감성 넘치는 바리스타 여대생",
    description:
      "한양대 시각디자인과 다니면서 카페에서 바리스타로 일하는 대학생. 따뜻하고 감성적인데, 깊은 대화를 좋아해요.",
    personality: "따뜻함, 자유로움, 감성적, 힐링",
    image: "/Jia/main.png",
    interests: ["카페", "바다", "일몰", "플레이리스트"],
    openingImage: "/Jia/beach.jpeg",
    paywallImage: "/Jia/omg.png",
  },
  {
    id: "sera",
    name: "세라",
    age: 21,
    tagline: "음악과 와인을 좋아하는 여대생",
    description:
      "서울예대 실용음악과 다니면서 새벽마다 비트 만드는 대학생. 쿨하고 미스터리한데, 음악 얘기하면 눈이 반짝여요.",
    personality: "미스터리, 쿨, 음악덕후, 은근플러팅",
    image: "/Sera/main.png",
    interests: ["음악", "작곡", "새벽산책", "와인"],
    openingImage: "/Sera/bed.jpeg",
    paywallImage: "/Sera/omg.png",
  },
];

export function getCharacter(id: string): Character | undefined {
  return characters.find((c) => c.id === id);
}
