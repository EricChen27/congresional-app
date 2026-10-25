/* eslint-disable @next/next/no-img-element -- locally encoded JPEG thumbnail; no remote image requests */
export function ProfileAvatar({avatar,name}:{avatar?:string;name:string}){
 return avatar?<img className="profile-avatar" src={avatar} alt={`${name}'s profile picture`} width={64} height={64}/>:<span className="profile-avatar avatar-placeholder" aria-hidden="true">{name.slice(0,1).toUpperCase()||'?'}</span>;
}
