export interface BillReference {version:string;url:string;location:string;quote:string}
export interface ForumComment {parent_id?:string|null;depth?:number;reference?:BillReference|null; id:string; body:string; status:'pending'|'published'|'hidden'|'unavailable'; created_at:string; author_label:string; is_own:boolean;profile_id?:string|null;username?:string|null;avatar?:string }
export interface ModerationComment {parent_id?:string|null;reference?:BillReference|null; id:string; bill_id:string; body:string; status:string; created_at:string; report_count:number; reasons:string[] }
export interface ForumResult { ok:boolean; error?:string }
export const reportReasons = [{value:'harassment',label:'Harassment or threats'},{value:'spam',label:'Spam or off-topic promotion'},{value:'personal-information',label:'Private personal information'},{value:'other',label:'Other rule violation'}];
