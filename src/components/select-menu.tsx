"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
type Option = {value:string;label:string};
/** Click-to-open menu, independent of native select mouse-hold behavior. */
export function SelectMenu({label,value,options,onChange}:{label:string;value:string;options:Option[];onChange:(value:string)=>void}) {
 const [open,setOpen]=useState(false);const [active,setActive]=useState(0);const root=useRef<HTMLDivElement>(null);const trigger=useRef<HTMLButtonElement>(null);const list=useRef<HTMLUListElement>(null);const id=useId();
 useEffect(()=>{if(!open)return;const close=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};document.addEventListener("pointerdown",close);list.current?.focus();return()=>document.removeEventListener("pointerdown",close);},[open]);
 useEffect(()=>{if(open)list.current?.children[active]?.scrollIntoView({block:"nearest"});},[active,open]);
 function choose(index:number){onChange(options[index].value);setOpen(false);trigger.current?.focus();}
 function show(){setActive(Math.max(0,options.findIndex(o=>o.value===value)));setOpen(true);}
 return <div className="select-menu" ref={root} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);}}>
 <span id={`${id}-label`} className="select-label">{label}</span>
 <button ref={trigger} type="button" className="field select-trigger" aria-labelledby={`${id}-label ${id}-value`} aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-list`} onClick={()=>open?setOpen(false):show()} onKeyDown={e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();show();}}}><span id={`${id}-value`}>{options.find(o=>o.value===value)?.label||options[0]?.label}</span><ChevronDown size={16}/></button>
 {open&&<ul ref={list} id={`${id}-list`} className="select-options" role="listbox" tabIndex={-1} aria-labelledby={`${id}-label`} aria-activedescendant={`${id}-option-${active}`} onKeyDown={e=>{
 if(e.key==='Escape'){e.preventDefault();setOpen(false);trigger.current?.focus();}else if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(active);}else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();setActive(i=>e.key==='Home'?0:e.key==='End'?options.length-1:(i+(e.key==='ArrowDown'?1:-1)+options.length)%options.length);}else if(e.key.length===1){const i=options.findIndex(o=>o.label.toLowerCase().startsWith(e.key.toLowerCase()));if(i>=0)setActive(i);}
 }}>{options.map((option,i)=><li id={`${id}-option-${i}`} key={option.value} role="option" aria-selected={value===option.value} className={i===active?'option-active':''} onPointerDown={e=>e.preventDefault()} onMouseEnter={()=>setActive(i)} onClick={()=>choose(i)}>{option.label}{value===option.value&&<Check size={15}/>}</li>)}</ul>}
 </div>;
}
