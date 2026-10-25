import { describe, expect, it } from 'vitest';
import { dueCards, intervalLabel, readProgress, scheduleReview, type StudyCard } from '../src/lib/study';

const now = Date.UTC(2026, 9, 22, 12);
const cards: StudyCard[] = ['A', 'B', 'C'].map(term => ({ id: term, term, definition: 'Meaning', category: 'Test' }));
describe('spaced review', () => {
  it('schedules failed and difficult recall soon and familiar terms days later', () => {
    for (const [rating, minutes] of [['Again', 1], ['Hard', 5], ['Good', 1440], ['Easy', 5760]] as const) {
      expect(scheduleReview(undefined, rating, now)).toEqual({ dueAt: now + minutes * 60000, interval: minutes, reviews: 1, rating });
    }
  });
  it('increases successful intervals, and relearns forgotten terms', () => {
    const first = scheduleReview(undefined, 'Good', now);
    const second = scheduleReview(first, 'Good', first.dueAt);
    expect(second.interval).toBe(4320);
    expect(scheduleReview(second, 'Easy', second.dueAt).interval).toBeGreaterThan(second.interval);
    expect(scheduleReview(second, 'Hard', now).interval).toBe(5);
    expect(scheduleReview(second, 'Again', now).interval).toBe(1);
    expect(second.reviews).toBe(2);
  });
  it('does not show a reviewed card before its due time and prioritizes due over new', () => {
    const progress = { C: scheduleReview(undefined, 'Hard', now), B: scheduleReview(undefined, 'Easy', now) };
    expect(dueCards(cards, progress, now).map(c => c.id)).toEqual(['A']);
    expect(dueCards(cards, progress, now + 299999).map(c => c.id)).toEqual(['A']);
    expect(dueCards(cards, progress, now + 300000).map(c => c.id)).toEqual(['C', 'A']);
  });
  it('restores schedules after reload and ignores progress for removed cards', () => {
    const progress = { A: scheduleReview(undefined, 'Good', now) };
    const restored = readProgress(JSON.stringify({ version: 1, cards: progress }));
    expect(dueCards(cards, restored, now).map(c => c.id)).toEqual(['B', 'C']);
    expect(dueCards(cards.slice(1), restored, now).map(c => c.id)).toEqual(['B', 'C']);
    expect(readProgress(null)).toEqual({});
  });
  it('rejects damaged or unsupported saved schedules instead of silently overwriting them', () => {
    expect(() => readProgress('{bad')).toThrow();
    expect(() => readProgress(JSON.stringify({ version: 2, cards: {} }))).toThrow();
    expect(() => readProgress(JSON.stringify({ version: 1, cards: { A: { dueAt: -1, interval: 0, reviews: -1, rating: 'Fake' } } }))).toThrow();
  });
  it('caps very long intervals and labels them clearly', () => {
    const previous = { dueAt: now, interval: 525600, reviews: 100, rating: 'Easy' as const };
    expect(scheduleReview(previous, 'Easy', now).interval).toBe(525600);
    expect(intervalLabel(1)).toBe('1 min');
    expect(intervalLabel(1440)).toBe('1 day');
    expect(intervalLabel(5760)).toBe('4 days');
  });
});
