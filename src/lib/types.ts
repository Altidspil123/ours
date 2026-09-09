// Shared client/server types & static content.

export type Profile = "him" | "her";

export const INTENSITY_META: Record<
  number,
  { label: string; color: string; glow: string }
> = {
  1: { label: "Sweet", color: "#f0a7b4", glow: "rgba(240,167,180,0.35)" },
  2: { label: "Warm", color: "#e8b25c", glow: "rgba(232,178,92,0.35)" },
  3: { label: "Hot", color: "#e0577b", glow: "rgba(224,87,123,0.45)" },
};

export const EVENT_COLORS: Record<string, string> = {
  rose: "#f0738f",
  gold: "#e4b56b",
  violet: "#b48ce2",
  aqua: "#6bc7c6",
};

// ─── Default spicy deck (created on first use — images can be added later) ──
export const SEED_SPICY: {
  title: string;
  body: string;
  intensity: number;
}[] = [
  {
    title: "Sixty-Second Stare",
    body: "Look into each other's eyes for a full minute without laughing. The one who crumbles first owes the other a kiss.",
    intensity: 1,
  },
  {
    title: "Slow Dance",
    body: "Put on your song and slow dance wherever you are. Kitchen, hallway, rooftop — no talking allowed until it ends.",
    intensity: 1,
  },
  {
    title: "Three Kisses Rule",
    body: "Three slow kisses: forehead, cheek, lips. Each one longer than the last. No cheating the count.",
    intensity: 1,
  },
  {
    title: "Hands Only",
    body: "Ten minutes of nothing but hands — holding, tracing fingertips, slow touches. Yes, it will drive you mad. That's the point.",
    intensity: 1,
  },
  {
    title: "Compliment Burn",
    body: "Take turns naming five things you find irresistible about the other. No repeats, no smiling mid-sentence… try.",
    intensity: 1,
  },
  {
    title: "Blind Taste",
    body: "Blindfold your love and feed them something delicious. Wrong guess? One kiss tax per miss, collected immediately.",
    intensity: 2,
  },
  {
    title: "The Neck Tour",
    body: "Kiss every inch of their neck, slowly. Ears count. Anything else doesn't — yet.",
    intensity: 2,
  },
  {
    title: "Massage Minutes",
    body: "Set a ten-minute timer. Warm hands, slow shoulders, zero rush. Then swap roles without asking twice.",
    intensity: 2,
  },
  {
    title: "Truth or Tease",
    body: "Ask: “What's one fantasy you've never told me?” Answer honestly — or demonstrate instead.",
    intensity: 2,
  },
  {
    title: "Clothes Stay On",
    body: "Make out like teenagers. Hands may wander, but every piece of clothing stays exactly where it is. Fifteen minutes. Good luck.",
    intensity: 2,
  },
  {
    title: "The Bet",
    body: "Hold eye contact. Whoever looks away first does exactly what the winner says for the next five minutes.",
    intensity: 3,
  },
  {
    title: "Orders Only",
    body: "For fifteen minutes, one of you gives orders and the other obeys. Then swap — if either of you still can.",
    intensity: 3,
  },
  {
    title: "Ice Trail",
    body: "One ice cube, warm lips, and anywhere the imagination allows. The deck offers no further instructions.",
    intensity: 3,
  },
  {
    title: "Mirror Game",
    body: "Undress slowly in front of the mirror, together. The first one to reach out and touch loses. Or wins. Depends who you ask.",
    intensity: 3,
  },
  {
    title: "Tonight's Rule",
    body: "Each of you whispers one rule for tonight into the other's ear. Broken rules must be paid back in kind.",
    intensity: 3,
  },
];

// ─── Daily conversation sparks ───────────────────────────────────────────────
export const LOVE_PROMPTS: string[] = [
  "What tiny thing did one of us do recently that made your whole day?",
  "If we had one free month and no budget, where do we wake up tomorrow?",
  "Which of our dates would you relive exactly as it was, every detail kept?",
  "What's a song that smells like us?",
  "What did you think the very first time you saw me?",
  "Which childhood dream of yours can we make happen as adults?",
  "What's your favorite “I love you” that we've never said out loud?",
  "Where should we live for exactly one weird, wonderful month?",
  "What habit of mine do you secretly adore?",
  "What deserves a candlelit dinner celebration that we keep postponing?",
  "What's the first photo of us you ever fell in love with?",
  "If our love story was a film, what's the title and the closing scene?",
  "What's something small you want us to do every single week?",
  "What's the prettiest sound I make, in your honest opinion?",
  "Which of our inside jokes would confuse the entire world?",
  "What do you want more of from me — be brave, say it?",
  "Where would you kiss me right now if there were no rules?",
  "What future Tuesday are you most excited about?",
  "What's one thing you're learning about love because of me?",
  "Describe our perfect slow morning, hour by hour.",
  "What should we name the little traditions that are ours only?",
  "When did you first know this was different from everything before?",
  "What's a fear you'd like to hold hands with, together?",
  "Which of your senses remembers me most strongly?",
  "What's the kindest thing we've survived as a team?",
  "If you could freeze three seconds of us forever, which three?",
  "What adventure scares you a little — and should we book it?",
  "What's your favorite version of me — sleepy, silly, serious, other?",
  "What do you hope we never stop doing, even at ninety?",
  "Describe me in three words I would never use for myself.",
];

export function promptOfTheDay(date = new Date()): string {
  const start = new Date(date.getFullYear(), 0, 0);
  const day = Math.floor(
    (date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );
  return LOVE_PROMPTS[day % LOVE_PROMPTS.length];
}
