"use client";
import { useState } from "react";

export default function CompetitionExcelDownload({ competition, name }: { competition: string; name: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function download() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/competition-registrations/export?competition=${encodeURIComponent(competition)}`, { cache: "no-store" });
      if (!response.ok) {
        const data = await response.json();
        throw Error(data.error || "The download failed. Please try again.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `cye-${competition}-registrations-${new Date().toISOString().slice(0,10)}.xlsx`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) { setError(e instanceof Error ? e.message : "The download failed. Please try again."); }
    finally { setBusy(false); }
  }
  return <div style={{ margin: "20px 0" }}>
    <button type="button" className="button button-primary" onClick={download} disabled={busy} aria-busy={busy}>{busy ? "Preparing Excel…" : "Download Excel"}</button>
    <p className="muted">All registrations for {name}, including every results page.</p>
    {error && <p role="alert">{error}</p>}
  </div>;
}
