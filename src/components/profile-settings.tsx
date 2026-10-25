'use client';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { saveProfile } from '@/lib/profile/actions';
import type { MemberProfile } from '@/lib/profile/types';
import { ProfileAvatar } from './profile-avatar';
export function ProfileSettings({profile}:{profile:MemberProfile|null}){
 const [username,setUsername]=useState(profile?.username||'');const [savedUsername,setSavedUsername]=useState(profile?.username);
 const [name,setName]=useState(profile?.display_name||'');const [bio,setBio]=useState(profile?.bio||'');const [avatar,setAvatar]=useState(profile?.avatar||'');const [show,setShow]=useState(profile?.show_comments||false);const [message,setMessage]=useState('');const [processing,setProcessing]=useState(false);const [pending,startTransition]=useTransition();
 async function photo(file?:File){
  if(!file)return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){setMessage('Choose a JPG, PNG, or WebP image smaller than 5 MB.');return;}
  setProcessing(true);setMessage('');
  try{const bitmap=await createImageBitmap(file);const canvas=document.createElement('canvas');canvas.width=192;canvas.height=192;const ctx=canvas.getContext('2d');if(!ctx)throw new Error();ctx.fillStyle='#ffffff';ctx.fillRect(0,0,192,192);const size=Math.min(bitmap.width,bitmap.height);ctx.drawImage(bitmap,(bitmap.width-size)/2,(bitmap.height-size)/2,size,size,0,0,192,192);bitmap.close();setAvatar(canvas.toDataURL('image/jpeg',0.85));}
  catch{setMessage('This image could not be opened. Try a different photo.');}finally{setProcessing(false);}
 }
 return <form className="card profile-settings" onSubmit={e=>{e.preventDefault();startTransition(async()=>{const result=await saveProfile({username,display_name:name,bio,avatar,show_comments:show});setMessage(result.ok?'Profile saved.':result.error||'Unable to save.');if(result.ok){setSavedUsername(result.username);setUsername(result.username||username);}});}}>
 <h2>Your public profile</h2><p>Your name, photo, and bio are public after you save. Your email and personal dictionary stay private.</p>
 <fieldset disabled={pending||processing}><legend className="sr-only">Profile details</legend><ProfileAvatar avatar={avatar} name={name}/><label htmlFor="profile-photo">Profile picture</label><input id="profile-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{void photo(e.target.files?.[0]);e.target.value='';}}/><p className="muted">JPG, PNG, or WebP, up to 5 MB. Photos are cropped to a square.</p>{avatar&&<button type="button" className="button button-secondary" onClick={()=>setAvatar('')}>Remove picture</button>}
 <label htmlFor="profile-username">Unique username</label><input className="field" id="profile-username" value={username} onChange={e=>setUsername(e.target.value.toLowerCase())} minLength={3} maxLength={40} pattern="[a-z0-9_]{3,40}" required autoComplete="username" autoCapitalize="none" spellCheck={false} aria-describedby="username-help"/><p className="muted" id="username-help">3–40 lowercase letters, numbers, or underscores. Your profile address: /users/{username||'your_username'}. Usernames must be unique; display names can be shared. Changing your username changes this address.</p>
 <label htmlFor="profile-name">Display name</label><input className="field" id="profile-name" value={name} onChange={e=>setName(e.target.value)} minLength={2} maxLength={50} required autoComplete="nickname"/>
 <label htmlFor="profile-bio">About you (optional)</label><textarea className="field" id="profile-bio" value={bio} onChange={e=>setBio(e.target.value)} maxLength={500} rows={3}/>
 <label className="forum-consent"><input type="checkbox" checked={show} onChange={e=>setShow(e.target.checked)}/> Show my approved comments on my public profile</label><p className="muted">Turning this off hides your profile’s comment history. Approved comments remain visible in their bill discussions. Pending, hidden, and removed comments never appear on your public profile.</p>
 <button className="button button-primary" type="submit">{pending?'Saving…':processing?'Preparing picture…':'Save profile'}</button></fieldset>
 {message&&<p role="status">{message}</p>}{savedUsername&&<Link className="text-link" href={`/users/${savedUsername}`}>View my public profile →</Link>}</form>;
}
