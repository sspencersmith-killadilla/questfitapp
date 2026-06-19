export type Genre = "fantasy" | "scifi" | "mystery" | "slice_of_life";

export const GENRES: Array<{
  id: Genre;
  name: string;
  tagline: string;
  description: string;
  emoji: string;
  promptStyle: string;
}> = [
  {
    id: "fantasy",
    name: "Epic Fantasy Quest",
    tagline: "Your steps are footfalls across a realm in peril.",
    emoji: "⚔️",
    description: "Wield swords, climb mountains, and grow in power as you log real workouts.",
    promptStyle:
      "high fantasy with dragons, ancient kingdoms, sworn oaths; treat the protagonist as a chosen hero whose physical strength mirrors the user's real activity.",
  },
  {
    id: "scifi",
    name: "Sci-Fi Survival",
    tagline: "Stranded on a hostile planet. Stay active or perish.",
    emoji: "🛰️",
    description: "Activity powers your base; missed days mean encroaching threats.",
    promptStyle:
      "hard sci-fi survival on an alien world; the protagonist's stamina powers a fragile colony, and inactivity allows hostile lifeforms or system decay to creep in.",
  },
  {
    id: "mystery",
    name: "Mystery Serial",
    tagline: "Every workout unlocks a clue. Solve the case.",
    emoji: "🔎",
    description: "A noir investigation that reveals itself one chapter at a time.",
    promptStyle:
      "noir detective mystery; each workout uncovers a clue, witness, or memory, and consistency is what cracks the case open.",
  },
  {
    id: "slice_of_life",
    name: "Slice of Life",
    tagline: "A quiet, hopeful story about becoming who you want to be.",
    emoji: "🌿",
    description: "Grounded, character-driven; small moments of growth and connection.",
    promptStyle:
      "warm literary slice-of-life; a grounded protagonist building a meaningful life one small habit at a time, with rich inner monologue.",
  },
];

export const genreById = (id: Genre) => GENRES.find((g) => g.id === id)!;
