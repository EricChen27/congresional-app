"use client";
import { Moon, Sun } from 'lucide-react';
export function ThemeToggle(){return <button className="theme-toggle icon-button" type="button" aria-label="Toggle light and dark mode" title="Toggle light and dark mode" onClick={()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;try{localStorage.setItem('billbreakdown:theme',next);}catch{/* Theme still works for this visit. */}}}><Moon className="theme-moon" size={19}/><Sun className="theme-sun" size={19}/></button>;}
