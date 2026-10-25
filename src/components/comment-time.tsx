export function CommentTime({value}:{value:string}){
 const label=new Date(value).toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'});
 return <time dateTime={value} title={`${label} UTC`}>{label} UTC</time>;
}
