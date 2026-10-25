import Link from "next/link";
import { SearchX } from "lucide-react";
export default function NotFound(){return <div className="page-container empty-state standalone-empty"><SearchX size={36}/><h1>We couldn’t find that page.</h1><p>Try browsing the catalog or checking the bill number and Congress.</p><Link className="button button-primary" href="/bills">Explore bills</Link></div>}
