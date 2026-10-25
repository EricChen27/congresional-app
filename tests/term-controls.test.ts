import {describe,it,expect,vi} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {DictionaryTermsProvider,TermDictionaryButton} from '@/components/dictionary-terms';
import {findGlossaryTerm} from '@/lib/glossary';
vi.mock('@/lib/dictionary/actions',()=>({saveDictionaryEntry:vi.fn(),deleteDictionaryEntry:vi.fn()}));
vi.mock('next/navigation',()=>({useRouter:()=>({refresh:vi.fn()}),usePathname:()=>'/learn'}));
const term=findGlossaryTerm('HHS')!;
function render(entries:{id:string;term:string;glossaryId?:string}[],user:{id:string}|null={id:'account-a'},error?:string){return renderToStaticMarkup(createElement(DictionaryTermsProvider,{entries,account:{configured:true,user},error},createElement(TermDictionaryButton,{term})));}
describe('saved civic term controls',()=>{
 it('offers removal when the account saved an alias',()=>{const html=render([{id:'saved',term:'HHS'}]);expect(html).toContain('Remove from my dictionary');expect(html).not.toContain('Add to my dictionary');});
 it('offers adding for an unsaved preset',()=>{expect(render([])).toContain('Add to my dictionary');});
 it('requires sign-in for a signed-out visitor',()=>{const html=render([],null);expect(html).toContain('Sign in to save terms');expect(html).toContain('next=%2Flearn');expect(html).not.toContain('Remove from my dictionary');});
 it('disables changes when saved entries could not be loaded',()=>{const html=render([],{id:'account-a'},'Unavailable');expect(html).toContain('disabled');expect(html).toContain('Your saved terms could not be loaded');});
});
