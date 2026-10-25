import { getAccountState } from '@/lib/supabase/account';
import { createClient } from '@/lib/supabase/server';
import { AuthButton } from '@/components/auth-button';
import { ProfileSettings } from '@/components/profile-settings';
export const dynamic='force-dynamic';
export const metadata={title:'Account settings'};
export default async function AccountPage(){
 const account=await getAccountState();let profile=null;let failed=false;
 if(account.user){try{const client=await createClient();const result=await client?.from('member_profiles').select('id,username,display_name,bio,avatar,show_comments').eq('owner_id',account.user.id).maybeSingle();failed=!result||!!result.error;profile=result?.data||null;}catch{failed=true;}}
 return <div className="page-container"><header className="page-heading"><div className="eyebrow">MAKE YOURSELF AT HOME</div><h1>Account settings</h1><p>Choose how you appear in the BillBreakdown community.</p></header>{account.user?failed?<p className="notice" role="alert">Profiles could not be loaded. If profiles were just added, apply the latest profile/username database update in Supabase, then reload this page.</p>:<ProfileSettings profile={profile}/>:<section className="card profile-settings"><p>Sign in to create your profile and manage your preferences.</p><AuthButton account={account} returnPath="/account"/></section>}</div>;
}
