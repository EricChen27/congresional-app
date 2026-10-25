import Link from "next/link";
import { ArrowUpRight, CalendarDays, ArrowRight } from "lucide-react";
import type { Bill } from "@/lib/bills/types";
export function billHref(bill: Pick<Bill,"congress"|"billType"|"number">) { return `/bills/${bill.congress}/${bill.billType}/${bill.number}`; }
export function formatDate(value?:string) { if (!value) return "Not available"; const date=new Date(value.slice(0,10)+"T12:00:00Z"); return Number.isNaN(date.getTime())?"Not available":date.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"}); }
export function BillCard({bill}: {bill:Pick<Bill,"id"|"congress"|"billType"|"number"|"title"|"category"|"introducedDate"|"latestAction"|"summaries">}) {
  const summary=[...bill.summaries].sort((a,b)=>b.actionDate.localeCompare(a.actionDate)||b.updatedAt.localeCompare(a.updatedAt))[0];
  return <article className="bill-card"><div className="bill-card-top"><span className="category-tag">{bill.category||"Uncategorized"}</span><span className="bill-reference">{bill.billType==="hr"?"H.R.":"S."} {bill.number}</span></div>
    <h3><Link href={billHref(bill)}>{bill.title}<ArrowUpRight size={20}/></Link></h3>
    <p className="bill-excerpt">{summary?.text || "An official summary is not yet available. Explore the bill’s details and legislative actions."}</p>
    <div className="latest-action"><span className="status-dot"/><span>{bill.latestAction.text}</span></div>
    <div className="bill-card-bottom"><span><CalendarDays size={14}/>{formatDate(bill.introducedDate)}</span><Link href={billHref(bill)}>Explore bill <ArrowRight size={15}/></Link></div>
  </article>;
}
