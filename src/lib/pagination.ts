export function pageWindow(current:number,total:number):number[]{
 const count=Math.min(5,Math.max(1,total));
 const start=Math.max(1,Math.min(current-2,total-count+1));
 return Array.from({length:count},(_,i)=>start+i);
}
