"use client";
export default function ErrorPage({reset}:{error:Error & {digest?:string};reset:()=>void}){return <div className="page-container empty-state standalone-empty"><h1>That page couldn’t load.</h1><p>Your saved dictionary is not changed. Please try again.</p><button className="button button-primary" onClick={reset}>Try again</button></div>}
