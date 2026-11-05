 'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <section className="wrap section"><h1>Something went wrong.</h1><p>No success has been assumed. Please retry.</p><button className="button" onClick={reset}>Try again</button></section>;}
