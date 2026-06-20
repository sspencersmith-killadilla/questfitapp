export type NarratorVoice = {
  id: string;
  name: string;
  tagline: string;
  bestFor: string;
};

export const NARRATOR_VOICES: NarratorVoice[] = [
  {
    id: "JBFqnCBsd6RMkjVDRZzb",
    name: "George",
    tagline: "Grave, weathered baritone.",
    bestFor: "Epic fantasy, historical, mythic.",
  },
  {
    id: "EXAVITQu4vr4xnSDxMaL",
    name: "Sarah",
    tagline: "Warm, contemporary, intimate.",
    bestFor: "Literary, romance, slice-of-life.",
  },
  {
    id: "nPczCjzI2devNBz1zQrb",
    name: "Brian",
    tagline: "Gritty, low, deliberate.",
    bestFor: "Noir, thriller, dystopian.",
  },
  {
    id: "pFZP5JQG7iQjIQuC4Bku",
    name: "Lily",
    tagline: "Bright, agile, expressive.",
    bestFor: "YA, adventure, magical realism.",
  },
];

export const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";

export function voiceById(id: string | null | undefined): NarratorVoice {
  return NARRATOR_VOICES.find((v) => v.id === id) ?? NARRATOR_VOICES[0];
}
