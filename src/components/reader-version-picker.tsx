"use client";
import { useRouter, usePathname } from "next/navigation";
import { SelectMenu } from "./select-menu";
export function ReaderVersionPicker({tab,versions,selected,unavailable=false}:{tab:"summary"|"text";versions:{id:string;label:string}[];selected:string;unavailable?:boolean}){
 const options=versions.map(v=>({value:v.id,label:v.label+(v.id===selected&&unavailable?" · Unavailable in reader":"")}));
 if(!options.some(v=>v.value===selected))options.unshift({value:selected,label:"Unavailable — requested document version"});
 const router=useRouter();const pathname=usePathname();
 return <div className="reader-version"><SelectMenu label="Document version" value={selected} options={options} onChange={value=>router.push(`${pathname}?tab=${tab}&version=${encodeURIComponent(value)}`,{scroll:false})}/></div>;
}
