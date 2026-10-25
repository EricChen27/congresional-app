import { z } from 'zod';

export const ratings = ['Again', 'Hard', 'Good', 'Easy'] as const;
export type Rating = typeof ratings[number];
export interface StudyCard { id: string; term: string; definition: string; category: string; sourceUrl?: string }
const progressSchema = z.object({
  dueAt: z.number().finite().nonnegative(),
  interval: z.number().int().min(1).max(525600),
  reviews: z.number().int().nonnegative(),
  rating: z.enum(ratings),
});
export type CardProgress = z.infer<typeof progressSchema>;
export type StudyProgress = Record<string, CardProgress>;

/** Simple, deterministic spaced repetition; not Anki's FSRS algorithm. Minutes are elapsed time. */
export function scheduleReview(previous: CardProgress | undefined, rating: Rating, now: number): CardProgress {
  const days = (previous?.interval ?? 0) / 1440;
  const interval = rating === 'Again' ? 1 : rating === 'Hard' ? 5
    : rating === 'Good' ? Math.max(1, Math.round(days * 2.5)) * 1440
    : Math.max(4, Math.round(days * 3.5)) * 1440;
  const bounded = Math.min(interval, 525600);
  return { dueAt: now + bounded * 60000, interval: bounded, reviews: (previous?.reviews ?? 0) + 1, rating };
}

export function intervalLabel(minutes: number): string {
  return minutes < 60 ? `${minutes} min` : `${Math.round(minutes / 1440)} day${minutes === 1440 ? '' : 's'}`;
}

export function readProgress(raw: string | null): StudyProgress {
  if (!raw) return {};
  const parsed = z.object({ version: z.literal(1), cards: z.record(z.string(), progressSchema) }).parse(JSON.parse(raw));
  return parsed.cards;
}

export function dueCards(cards: StudyCard[], progress: StudyProgress, now: number): StudyCard[] {
  return cards.filter(card => !progress[card.id] || progress[card.id].dueAt <= now)
    .sort((a, b) => (progress[a.id]?.dueAt ?? Infinity) - (progress[b.id]?.dueAt ?? Infinity) || a.term.localeCompare(b.term));
}
