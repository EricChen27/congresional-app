import {it,expect,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import {ReaderVersionPicker} from '../src/components/reader-version-picker';
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()}),usePathname:()=>'/bills/119/hr/952'}));
it('labels a failed selected version without replacing it with an older option',()=>{
 const html=renderToStaticMarkup(createElement(ReaderVersionPicker,{tab:'text',selected:'enrolled',unavailable:true,versions:[{id:'introduced',label:'Introduced in House'},{id:'enrolled',label:'Enrolled Bill · Date unavailable'}]}));
 expect(html).toContain('Enrolled Bill · Date unavailable · Unavailable in reader');expect(html).not.toContain('Introduced in House');
});
it('shows unavailable when a requested version is absent from the options',()=>{
 const html=renderToStaticMarkup(createElement(ReaderVersionPicker,{tab:'text',selected:'missing',unavailable:true,versions:[{id:'introduced',label:'Introduced in House'}]}));
 expect(html).toContain('Unavailable — requested document version');expect(html).not.toContain('Introduced in House');
});
