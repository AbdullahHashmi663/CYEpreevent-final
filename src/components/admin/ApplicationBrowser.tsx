"use client";

import { useEffect, useState } from "react";
import { ArrowDownToLine, ArrowUpRight, LoaderCircle, RotateCcw, Search } from "lucide-react";
import type { AdminApplicationPage, ApplicationRecord } from "@/lib/cms-types";

export default function ApplicationBrowser({ revision, archived = false, onReview, onRestore }: {
  revision: number; archived?: boolean;
  onReview?: (record: ApplicationRecord) => void;
  onRestore?: (id: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [kind, setKind] = useState("all");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<AdminApplicationPage | null>(null);
  const [settledKey, setSettledKey] = useState("");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [restoring, setRestoring] = useState("");
  const requestKey = JSON.stringify([query, status, kind, page, archived, revision, retry]);
  const loading = requestKey !== settledKey;
  useEffect(() => {
    const controller = new AbortController();
    // Debounce typing, cancel outdated requests, and never display stale results as current.
    const timer = setTimeout(async () => {
      setError("");
      try {
        const params = new URLSearchParams({ q: query, status, kind, page: String(page), archived: String(archived) });
        const response = await fetch(`/api/admin/applications?${params}`, { cache: "no-store", credentials: "same-origin", signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw Error(data.error || "Applications could not be loaded.");
        if (controller.signal.aborted) return;
        const lastPage = Math.max(1, Math.ceil(data.total / data.pageSize));
        if (page > lastPage) { setPage(lastPage); return; }
        setResult(data);
      } catch (caught) {
        if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Applications could not be loaded.");
      } finally { if (!controller.signal.aborted) setSettledKey(requestKey); }
    }, query ? 250 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, status, kind, page, archived, revision, retry, requestKey]);
  const pages = Math.max(1, Math.ceil((result?.total || 0) / 20));
  return <section aria-label={archived ? "Archived applications" : "Applications"}>
    <header className="admin-page-header"><div><p className="admin-eyebrow">{archived ? "APPLICATION ARCHIVE" : "YOUR COMMUNITY"}</p>{archived ? <h2>Archived applications</h2> : <h1>Every entry matters.</h1>}<p>{archived ? "Restore archived entries when needed." : "Review participants and messages in one place."}</p></div>
      {!archived && <a className="admin-button admin-button-secondary" href="/api/admin/export" download><ArrowDownToLine size={18} /> Export all CSV</a>}
    </header>
    <div className="admin-toolbar"><label className="admin-search"><Search size={18} aria-hidden="true" /><input type="search" aria-label="Search applications" maxLength={160} placeholder="Search name, email, reference…" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} /></label>
      <label className="admin-filter">Status<select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="all">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></label>
      <label className="admin-filter">Type<select value={kind} onChange={e => { setKind(e.target.value); setPage(1); }}><option value="all">All applications</option><option value="contest">Contest</option><option value="conference">Workshop / Talk</option><option value="contact">Contact</option><option value="ambassador">Earlier ambassador entry</option></select></label>
    </div>
    <div className="admin-panel admin-table-panel" aria-busy={loading}>
      {loading ? <p role="status"><LoaderCircle size={18} className="admin-spin" /> Loading applications…</p> : error ? <div role="alert"><p>{error}</p><button className="admin-button admin-button-secondary" onClick={() => setRetry(n => n + 1)}>Try again</button></div> : <>
        {!result?.applications.length ? <p>No matching applications.</p> : <div className="admin-table-wrap"><table className="admin-table"><caption className="admin-sr-only">{archived ? "Archived applications" : "Application review list"}</caption><thead><tr><th>Applicant</th><th>Application</th><th>Reference</th><th>Status</th><th>{archived ? "Archived" : "Received"}</th><th><span className="admin-sr-only">Actions</span></th></tr></thead><tbody>{result.applications.map(item => <tr key={item.id}>
          <td><strong>{item.name}</strong><span>{item.email}</span></td><td><strong>{item.entry_title || (item.kind === "contact" ? "Contact message" : "Earlier application")}</strong><span>{item.kind}{item.team_members?.length ? ` · ${item.team_members.length + 1} participants` : ""}</span></td><td><span className="admin-reference">{item.reference}</span></td><td><span className={`admin-badge admin-badge-${item.status}`}>{item.status}</span></td><td>{new Date(archived ? item.deleted_at! : item.created_at).toLocaleDateString("en-GB", { timeZone: "Asia/Karachi" })}</td><td>
            {archived ? <button className="admin-button admin-button-small admin-button-secondary" disabled={!!restoring} onClick={async () => { setRestoring(item.id); try { await onRestore?.(item.id); setRetry(n => n + 1); } catch { /* Parent reports mutation errors. */ } finally { setRestoring(""); } }}><RotateCcw size={16} /> Restore</button> : <button className="admin-button admin-button-small admin-button-secondary" onClick={() => onReview?.(item)}>Review <ArrowUpRight size={15} /></button>}
          </td></tr>)}</tbody></table></div>}
        <div className="admin-table-footer"><span role="status">{result?.total || 0} applications · Page {page} of {pages}</span><div><button className="admin-text-button" disabled={page === 1} onClick={() => setPage(n => n - 1)}>Previous</button><button className="admin-text-button" disabled={page >= pages} onClick={() => setPage(n => n + 1)}>Next</button></div></div>
      </>}
    </div>
  </section>;
}
