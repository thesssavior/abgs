import Link from "next/link";
import Image from "next/image";
import { characters } from "@/lib/characters";

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <header className="relative overflow-hidden py-16 px-4 text-center">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-background to-purple-900/20" />
        <div className="relative z-10 max-w-4xl mx-auto">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-accent to-accent-light bg-clip-text text-transparent">
            ABGS
          </h1>
          <p className="text-xl text-gray-400 mb-2">
            AI 여자친구가 기다리고 있어요
          </p>
          <p className="text-sm text-gray-500">
            대화하고 싶은 상대를 골라보세요
          </p>
        </div>
      </header>

      {/* Character Grid */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {characters.map((char) => (
            <Link
              key={char.id}
              href={`/chat/${char.id}`}
              className="group block"
            >
              <div className="relative rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 hover:-translate-y-1 aspect-[3/4]">
                {/* Full background image */}
                <Image
                  src={char.image}
                  alt={char.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {/* Gradient overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                {/* Floating text content */}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-2xl font-bold text-white drop-shadow-lg">
                      {char.name}
                    </h2>
                    <span className="text-xs text-gray-300 bg-black/40 px-2 py-0.5 rounded-full">
                      {char.age}세
                    </span>
                  </div>
                  <p className="text-accent-light text-sm mb-2 drop-shadow">
                    {char.tagline}
                  </p>
                  <p className="text-gray-300 text-xs line-clamp-2 mb-3 drop-shadow">
                    {char.description}
                  </p>

                  {/* Interests */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {char.interests.map((interest) => (
                      <span
                        key={interest}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-sm text-gray-200 border border-white/10"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="text-center">
                    <span className="inline-block px-6 py-2 rounded-full bg-accent/80 backdrop-blur-sm text-white text-sm font-medium group-hover:bg-accent transition-all duration-300 shadow-lg">
                      대화하기
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
