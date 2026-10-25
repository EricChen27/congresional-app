"use client";

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { glossaryTerms } from '@/data/glossary';
import { dueCards, intervalLabel, ratings, readProgress, scheduleReview, type Rating, type StudyCard, type StudyProgress } from '@/lib/study';
import { SelectMenu } from './select-menu';

const presetCards: StudyCard[] = glossaryTerms.map(term => ({...term, id: `glossary:${term.id}`, category: term.category || 'Legislative vocabulary'}));
const descriptions = { Again: 'I couldn’t recall it', Hard: 'Correct, but difficult', Good: 'I understood it', Easy: 'I knew it immediately' };

export function StudySession({ personalCards, accountId, dictionaryError }: { personalCards: StudyCard[]; accountId?: string; dictionaryError?: string }) {
  const storageKey = `billbreakdown:study:v1:${accountId || 'guest'}`;
  const [progress, setProgress] = useState<StudyProgress>({});
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [deck, setDeck] = useState('preset');
  const [category, setCategory] = useState('');
  const [active, setActive] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState(0);
  const [now, setNow] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const cardButton = useRef<HTMLButtonElement>(null);
  const ratingLock = useRef(false);
  const cards = (deck === 'personal' ? personalCards : presetCards).filter(card => !category || card.category === category);
  const due = dueCards(cards, progress, now);
  const current = cards.find(card => card.id === currentId) || due[0];
  const nextDue = cards.reduce((earliest, card) => Math.min(earliest, progress[card.id]?.dueAt ?? Infinity), Infinity);

  useEffect(() => {
    const load = () => {
      try { setProgress(readProgress(localStorage.getItem(storageKey))); setError(''); setReady(true); }
      catch { setError('Your study schedule could not be loaded. Allow browser storage and reload. Existing progress has not been overwritten.'); setReady(false); }
      setNow(Date.now());
    };
    // Browser storage is external state: hydrate only after mounting.
    load();
    const timer = setInterval(() => setNow(Date.now()), 1000);
    const sync = (event: StorageEvent) => { if (event.key === storageKey) { load(); setCurrentId(null); setRevealed(false); } };
    window.addEventListener('storage', sync);
    return () => { clearInterval(timer); window.removeEventListener('storage', sync); };
  }, [storageKey]);

  function handleRate(rating: Rating, reviewedAt: number) {
    if (!current || !revealed || ratingLock.current) return;
    ratingLock.current = true;
    try {
      // Merge the latest persisted values so another tab's reviews are retained.
      const latest = readProgress(localStorage.getItem(storageKey));
      const updated = scheduleReview(latest[current.id], rating, reviewedAt);
      const next = { ...latest, [current.id]: updated };
      localStorage.setItem(storageKey, JSON.stringify({ version: 1, cards: next }));
      setProgress(next); setNow(reviewedAt); setCurrentId(null); setRevealed(false);
      setReviewed(count => count + 1); setError('');
      setAnnouncement(`${current.term}: ${rating}. Saved. Review again in ${intervalLabel(updated.interval)}.`);
      requestAnimationFrame(() => cardButton.current?.focus());
    } catch { setError('Your rating was not saved. Allow browser storage, then try again. This card is still here.'); }
    finally { ratingLock.current = false; }
  }

  function start() { setActive(true); setRevealed(false); setCurrentId(null); setReviewed(0); setAnnouncement(''); requestAnimationFrame(() => cardButton.current?.focus()); }

  return <section className="study-shell">
    <p className="muted study-storage">Study progress is saved in this browser{accountId ? ' separately for your account' : ''}. It does not sync across devices. Your personal dictionary still uses your account.</p>
    {dictionaryError && <p className="notice" role="alert">{dictionaryError} You can still study the public vocabulary.</p>}
    {error && <p className="notice" role="alert">{error}</p>}
    <p className="study-announcement" role="status">{announcement}</p>
    {!active ? <div className="card study-overview">
      <h2>What would you like to learn?</h2>
      <div className="learn-toolbar">
        <SelectMenu label="Deck" value={deck} onChange={value => {setDeck(value); setCategory('');}} options={[{value:'preset',label:'Civic vocabulary'}, {value:'personal',label:'My dictionary'}]}/>
        <SelectMenu label="Topic" value={category} onChange={setCategory} options={[{value:'',label:'All topics'}, ...Array.from(new Set((deck === 'personal' ? personalCards : presetCards).map(card => card.category))).sort().map(value => ({value,label:value}))]}/>
      </div>
      <div className="study-stats"><span><strong>{cards.length}</strong> cards</span><span><strong>{ready ? due.filter(card=>!!progress[card.id]).length : '—'}</strong> due</span><span><strong>{ready ? due.filter(card=>!progress[card.id]).length : '—'}</strong> new</span></div>
      {deck === 'personal' && <p className="muted">Only words with definitions become flashcards. <Link className="text-link" href="/dictionary">Add or edit your words →</Link>{!accountId && ' Sign in to use your personal dictionary.'}</p>}
      <button className="button button-primary" disabled={!ready || !due.length} onClick={start}>Start study session</button>
      {ready && cards.length > 0 && !due.length && <p role="status">You’re caught up! Next review: {new Date(nextDue).toLocaleString()}.</p>}
      <p className="muted">Think of the meaning, reveal the definition, then honestly rate your recall. Difficult cards return in minutes; familiar ones wait days.</p>
    </div> : <div>
      <div className="study-topline"><span>{reviewed} reviewed · {due.length} ready now</span><button className="button button-secondary" onClick={()=>{setActive(false);setCurrentId(null);setRevealed(false);}}>End session</button></div>
      {current ? <div className="study-card-area" key={current.id}>
        <button ref={cardButton} className="card flashcard" aria-expanded={revealed} onClick={()=>{setCurrentId(current.id);setRevealed(value=>!value);}}>
          <span className="eyebrow">{current.category}</span><span className="flashcard-term">{current.term}</span>
          {revealed ? <span className="flashcard-definition">{current.definition}</span> : <span className="muted">What does this mean? Click or tap to reveal.</span>}
          <span className="flashcard-hint">{revealed ? 'Click to hide definition' : 'Press Enter or Space to reveal'}</span>
        </button>
        {revealed && <><div className="study-ratings" aria-label="Rate your recall">{ratings.map(rating => <button className={`button button-secondary rating-${rating.toLowerCase()}`} key={rating} onClick={()=>handleRate(rating, Date.now())}><strong>{rating}</strong><span>{intervalLabel(scheduleReview(progress[current.id],rating,now).interval)}</span><small>{descriptions[rating]}</small></button>)}</div>{current.sourceUrl && <a className="text-link" href={current.sourceUrl} target="_blank" rel="noreferrer">Read the source ↗</a>}</>}
      </div> : <div className="card study-overview" role="status"><h2>You’re caught up for now.</h2><p>{reviewed} reviews completed this session.</p>{Number.isFinite(nextDue) && <p>Next review: {new Date(nextDue).toLocaleString()}. {nextDue-now<600000 ? 'Stay here and the card will appear when it is due.' : 'Come back then to keep building your recall.'}</p>}<Link className="text-link" href="/learn">Explore more vocabulary →</Link></div>}
    </div>}
    <p className="study-method muted">Anki-inspired practice with a simple schedule: Again in 1 minute, Hard in 5 minutes, Good initially in 1 day, Easy initially in 4 days. Good and Easy intervals grow with repeated recall. This is not Anki’s adaptive FSRS scheduler.</p>
  </section>;
}
