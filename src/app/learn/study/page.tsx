import Link from 'next/link';
import { StudySession } from '@/components/study-session';
import { getAccountState } from '@/lib/supabase/account';
import { getDictionaryEntries } from '@/lib/dictionary/queries';

export const metadata = { title: 'Study vocabulary', description: 'Practice civic vocabulary with flashcards and spaced review.' };
export default async function StudyPage() {
  const account = await getAccountState();
  const data = account.user ? await getDictionaryEntries() : null;
  const personalCards = (data?.entries || []).filter(entry => entry.definition.trim()).map(entry => ({
    id: `dictionary:${entry.id}`, term: entry.term, definition: entry.definition,
    category: 'My dictionary', sourceUrl: entry.definitionSourceUrl,
  }));
  return <div className="page-container study-page"><header className="page-heading"><Link href="/learn" className="text-link">← Back to Learn</Link><div className="eyebrow">A LITTLE PRACTICE. LASTING KNOWLEDGE.</div><h1>Make it stick.</h1><p>One term at a time. Recall it, reveal it, and decide when to see it again.</p></header><StudySession key={account.user?.id || 'guest'} personalCards={personalCards} accountId={account.user?.id} dictionaryError={data?.error || account.error}/></div>;
}
