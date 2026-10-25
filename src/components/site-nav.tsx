"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export function SiteNav() {
  const path = usePathname();
  return <nav className="main-nav" aria-label="Main navigation">{[
    ["/bills", "Explore bills"], ["/learn", "Learn"], ["/forum", "Forum"], ["/glossary", "Glossary"], ["/dictionary", "My dictionary"], ["/saved", "Saved bills"], ["/account", "Account settings"]
  ].map(([href,label]) => <Link key={href} href={href} aria-current={path.startsWith(href) ? "page" : undefined}>{label}</Link>)}</nav>;
}
