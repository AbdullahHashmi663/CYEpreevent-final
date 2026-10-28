"use client";

import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import ApplicationBrowser from "./ApplicationBrowser";
import { ArrowDownToLine, ArrowLeft, ArrowUpRight, Archive, Check, ChevronRight, CircleAlert, Clock3, ExternalLink, FileText, ImagePlus, LayoutDashboard, LoaderCircle, LogOut, Menu, Mic2, Pencil, Plus, RefreshCw, RotateCcw, Search, Settings2, ShieldCheck, Sparkles, Trophy, Users, X } from "lucide-react";
import { whatsappContacts } from "@/lib/whatsapp-contacts";
import { teamPortrait } from "@/lib/team-portraits";
import { blankRecord } from "@/lib/cms-seed";
import { COMPETITION_SECTIONS, CONFERENCE_SECTIONS, requiresPayment } from "@/lib/programme";
import { CONTENT_KINDS, type AdminData, type AdminUser, type ApplicationRecord, type ContentKind, type ContentRecord, type SiteSettings } from "@/lib/cms-types";
type View = "overview" | "applications" | ContentKind | "settings" | "trash" | "activity" | "account";
type Notice = {
  text: string;
  error?: boolean;
} | null;
const labels: Record<ContentKind, string> = {
  conferences: "Conferences",
  speakers: "Speakers",
  team: "Team members",
  contests: "Contests",
  sponsors: "Partners"
};
const singular: Record<ContentKind, string> = {
  conferences: "conference",
  speakers: "speaker",
  team: "team member",
  contests: "contest",
  sponsors: "partner"
};
const icons = {
  conferences: Mic2,
  speakers: Users,
  team: Users,
  contests: Trophy,
  sponsors: Sparkles
};
const nav = [{
  id: "overview",
  label: "Overview",
  icon: LayoutDashboard
}, {
  id: "applications",
  label: "Applications",
  icon: Users
}, ...CONTENT_KINDS.map(id => ({
  id,
  label: labels[id],
  icon: icons[id]
})), {
  id: "settings",
  label: "Site settings",
  icon: Settings2
}, {
  id: "trash",
  label: "Trash & restore",
  icon: Archive
}, {
  id: "activity",
  label: "Activity log",
  icon: Clock3
}, {
  id: "account",
  label: "My account",
  icon: ShieldCheck
}] as const;
class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}
async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...options,
      cache: "no-store",
      credentials: "same-origin",
      signal: AbortSignal.timeout(30000),
      headers: options.body instanceof FormData ? options.headers : {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  } catch {
    throw new Error("The server could not be reached. Check your connection and try again.");
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(result.error || "Your request could not be completed. Please try again.", response.status);
  return result as T;
}
const message = (error: unknown) => error instanceof Error ? error.message : "Something went wrong. Please try again.";
function formatDate(value: string) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Karachi"
  });
}
function Badge({
  value
}: {
  value: string;
}) {
  return <span className={`admin-badge admin-badge-${value.toLowerCase().replace(/\s+/g, "-")}`}>{value}</span>;
}
function Empty({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return <div className="admin-empty"><FileText aria-hidden="true" /><h3>{title}</h3><p>{description}</p>{children}</div>;
}
function ErrorText({
  error
}: {
  error: string;
}) {
  return error ? <div className="admin-inline-error" role="alert"><CircleAlert size={18} aria-hidden="true" /><span>{error}</span></div> : null;
}
function AdminImage({ src, alt }: { src: string; alt: string }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const imageSource = src.trim();
  const local = /^\/(images\/|api\/media\/)/.test(imageSource) && !imageSource.includes("..") && !imageSource.includes("\\");
  let secure = false;
  try {
    const url = new URL(imageSource);
    secure = url.protocol === "https:" && !url.username && !url.password;
  } catch {}
  if ((!local && !secure) || failedSource === imageSource) return <div className="admin-image-fallback" role={alt ? "img" : undefined} aria-label={alt || undefined} aria-hidden={!alt}><ImagePlus size={24} aria-hidden="true" /><span>Image unavailable</span></div>;
  // CMS previews support database media and arbitrary HTTPS sources without requiring image-optimizer host configuration.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={imageSource} alt={alt} loading="lazy" onError={() => setFailedSource(imageSource)} />;
}
function Modal({
  title,
  subtitle,
  onClose,
  children,
  busy = false
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
    };
  }, []);
  return <dialog className="admin-dialog admin-root" ref={ref} aria-labelledby={titleId} onCancel={event => {
    event.preventDefault();
    if (!busy) onClose();
  }} onClick={event => {
    if (event.target === event.currentTarget && !busy) onClose();
  }}>
    <div className="admin-dialog-header"><div><p className="admin-eyebrow">CYE / ADMIN STUDIO</p><h2 id={titleId}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button type="button" className="admin-icon-button" aria-label="Close dialog" disabled={busy} onClick={onClose}><X size={22} /></button></div>
    {children}
  </dialog>;
}
export default function AdminPortal() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [revision, setRevision] = useState(0);
  const [view, setView] = useState<View>("overview");
  const [notice, setNotice] = useState<Notice>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editor, setEditor] = useState<ContentRecord | null>(null);
  const [review, setReview] = useState<ApplicationRecord | null>(null);
  const [archive, setArchive] = useState<{
    type: "content" | "application";
    id: string;
    title: string;
  } | null>(null);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [archiveError, setArchiveError] = useState("");
  const [logoutBusy, setLogoutBusy] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const skipLinkRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const sidebar = sidebarRef.current;
    const main = mainRef.current;
    const skipLink = skipLinkRef.current;
    const menuButton = menuButtonRef.current;
    if (!sidebar || !main) return;
    const media = window.matchMedia("(max-width: 960px)");
    const previousOverflow = document.body.style.overflow;
    const syncDrawer = () => {
      sidebar.inert = media.matches && !menuOpen;
      main.inert = media.matches && menuOpen;
      if (skipLink) skipLink.inert = media.matches && menuOpen;
      document.body.style.overflow = media.matches && menuOpen ? "hidden" : previousOverflow;
      if (!media.matches && menuOpen) setMenuOpen(false);
    };
    syncDrawer();
    media.addEventListener("change", syncDrawer);
    const controls = () => Array.from(sidebar.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])")).filter(element => element.offsetParent !== null);
    const focusFirst = () => (sidebar.querySelector<HTMLButtonElement>(".admin-sidebar-close") || controls()[0])?.focus();
    if (media.matches && menuOpen) focusFirst();
    const handleKey = (event: KeyboardEvent) => {
      if (!media.matches || !menuOpen) return;
      if (event.key === "Escape") { event.preventDefault(); setMenuOpen(false); return; }
      if (event.key !== "Tab") return;
      const items = controls();
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !sidebar.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !sidebar.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
    };
    const containFocus = (event: FocusEvent) => {
      if (media.matches && menuOpen && !sidebar.contains(event.target as Node)) focusFirst();
    };
    document.addEventListener("keydown", handleKey);
    document.addEventListener("focusin", containFocus);
    return () => {
      media.removeEventListener("change", syncDrawer);
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("focusin", containFocus);
      document.body.style.overflow = previousOverflow;
      sidebar.inert = false;
      main.inert = false;
      if (skipLink) skipLink.inert = false;
      if (menuOpen && menuButton?.isConnected) menuButton.focus();
    };
  }, [menuOpen, user?.id, user?.must_change_password, loading]);
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const next = await api<AdminData>("/api/admin/data");
      setData(next);
      setRevision(n => n + 1);
      setUser(next.user);
      return next;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
        setData(null);
      }
      throw error;
    } finally {
      setRefreshing(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const session = await api<{
          user: AdminUser | null;
        }>("/api/admin/auth");
        if (!active) return;
        setUser(session.user);
        if (session.user && !session.user.must_change_password) await refresh();
      } catch (error) {
        if (active) setNotice({
          text: message(error),
          error: true
        });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [refresh]);
  async function signedIn(next: AdminUser) {
    setUser(next);
    setNotice(null);
    if (!next.must_change_password) {
      try {
        await refresh();
      } catch (error) {
        setNotice({
          text: message(error),
          error: true
        });
      }
    }
  }
  async function logout() {
    setLogoutBusy(true);
    try {
      await api("/api/admin/auth", {
        method: "DELETE"
      });
      setUser(null);
      setData(null);
      setView("overview");
      setMenuOpen(false);
      setNotice(null);
    } catch (error) {
      setNotice({
        text: message(error),
        error: true
      });
    } finally {
      setLogoutBusy(false);
    }
  }
  async function saveContent(record: ContentRecord) {
    const result = await api<{
      record: ContentRecord;
    }>(record.id ? `/api/admin/content/${encodeURIComponent(record.id)}` : "/api/admin/content", {
      method: record.id ? "PATCH" : "POST",
      body: JSON.stringify(record)
    });
    setData(current => current ? {
      ...current,
      content: record.id ? current.content.map(item => item.id === result.record.id ? result.record : item) : [...current.content, result.record]
    } : current);
    setEditor(null);
    setNotice({
      text: `${labels[record.kind]} updated. Published changes are now visible on the website.`
    });
    void refresh().catch(error => setNotice({
      text: `Saved successfully. ${message(error)}`,
      error: true
    }));
  }
  async function updateApplication(id: string, values: object) {
    const result = await api<{
      application: ApplicationRecord;
    }>(`/api/admin/applications/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(values)
    });
    setData(current => current ? {
      ...current,
      applications: current.applications.map(item => item.id === id ? result.application : item)
    } : current);
    setReview(current => current?.id === id ? result.application : current);
    setNotice({
      text: "Application updated successfully."
    });
    void refresh().catch(error => setNotice({
      text: `Saved successfully. ${message(error)}`,
      error: true
    }));
  }
  async function archiveRecord() {
    if (!archive) return;
    setArchiveBusy(true);
    setArchiveError("");
    try {
      if (archive.type === "application") await updateApplication(archive.id, {
        deleted: true
      });else {
        await api(`/api/admin/content/${encodeURIComponent(archive.id)}`, {
          method: "DELETE"
        });
        setData(current => current ? {
          ...current,
          content: current.content.map(item => item.id === archive.id ? {
            ...item,
            deleted_at: new Date().toISOString()
          } : item)
        } : current);
        void refresh().catch(error => setNotice({
          text: `Archived successfully. ${message(error)}`,
          error: true
        }));
      }
      setReview(null);
      setArchive(null);
      setNotice({
        text: "Moved to trash. You can restore this item at any time."
      });
    } catch (error) {
      setArchiveError(message(error));
    } finally {
      setArchiveBusy(false);
    }
  }
  async function restore(type: "content" | "application", id: string) {
    try {
      if (type === "application") await updateApplication(id, {
        restore: true
      });else {
        const result = await api<{
          record: ContentRecord;
        }>(`/api/admin/content/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: JSON.stringify({
            restore: true
          })
        });
        setData(current => current ? {
          ...current,
          content: current.content.map(item => item.id === id ? result.record : item)
        } : current);
        void refresh().catch(error => setNotice({
          text: `Restored successfully. ${message(error)}`,
          error: true
        }));
      }
      setNotice({
        text: "Item restored successfully."
      });
    } catch (error) {
      setNotice({
        text: message(error),
        error: true
      });
      throw error;
    }
  }
  function navigate(next: View) {
    setView(next);
    setMenuOpen(false);
    setNotice(null);
  }
  const pending = data?.applicationSummary.pending || 0;
  if (loading) return <div className="admin-root admin-loading"><LoaderCircle className="admin-spin" size={30} /><p>Opening your admin studio…</p></div>;
  if (!user) return <Login onSignIn={signedIn} notice={notice} />;
  if (user.must_change_password) return <div className="admin-root admin-password-gate"><div className="admin-password-card"><Brand /><p className="admin-eyebrow">ONE QUICK STEP</p><h1>Make it yours.</h1><p>Set a new password before opening your admin studio.</p><PasswordForm required onSuccess={async () => {
        setUser(current => current ? {
          ...current,
          must_change_password: false
        } : current);
        setNotice({
          text: "Your password has been changed."
        });
        try {
          await refresh();
        } catch (error) {
          setNotice({
            text: `Password changed successfully. ${message(error)}`,
            error: true
          });
        }
      }} /><button className="admin-text-button" onClick={logout} disabled={logoutBusy}>Sign out</button></div></div>;
  return <div className="admin-root admin-shell">
    <a ref={skipLinkRef} className="admin-skip-link" href="#admin-main">Skip to workspace</a>
    <aside ref={sidebarRef} id="admin-navigation" className={`admin-sidebar ${menuOpen ? "admin-sidebar-open" : ""}`} role={menuOpen ? "dialog" : undefined} aria-modal={menuOpen || undefined} aria-label="Admin navigation"><div className="admin-sidebar-brand"><Brand /><button className="admin-sidebar-close admin-icon-button" aria-label="Close navigation" onClick={() => setMenuOpen(false)}><X size={21} /></button></div><p className="admin-sidebar-label">YOUR WORKSPACE</p><nav>{nav.map(item => {
          const Icon = item.icon;
          return <button key={item.id} className={`admin-nav-button ${view === item.id ? "admin-nav-active" : ""}`} aria-current={view === item.id ? "page" : undefined} onClick={() => navigate(item.id as View)}><Icon size={19} aria-hidden="true" /><span>{item.label}</span>{item.id === "applications" && pending > 0 && <span className="admin-nav-count">{pending}</span>}</button>;
        })}<Link href="/admin/competition-registrations" className="admin-nav-button"><ExternalLink size={19} aria-hidden="true"/><span>CYE competition entries</span></Link></nav><div className="admin-sidebar-bottom"><Link href="/" target="_blank" className="admin-nav-button"> <ArrowUpRight size={19} aria-hidden="true" /><span>View website</span><ExternalLink size={14} aria-hidden="true" /></Link><div className="admin-user"><span className="admin-avatar">{user.email.charAt(0).toUpperCase()}</span><div><strong>Administrator</strong><span>{user.email}</span></div><button aria-label="Sign out" title="Sign out" className="admin-icon-button" disabled={logoutBusy} onClick={logout}><LogOut size={18} /></button></div></div></aside>
    {menuOpen && <button className="admin-menu-backdrop" tabIndex={-1} aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
    <div ref={mainRef} className="admin-main"><header className="admin-topbar"><div><button ref={menuButtonRef} className="admin-mobile-menu admin-icon-button" aria-label="Open navigation" aria-controls="admin-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)}><Menu size={23} /></button><span>Admin studio</span><ChevronRight size={15} aria-hidden="true" /><strong>{nav.find(item => item.id === view)?.label}</strong></div><div><span className="admin-secure"><ShieldCheck size={15} aria-hidden="true" /> Secure workspace</span><button type="button" className="admin-icon-button" title="Refresh data" aria-label="Refresh data" disabled={refreshing} onClick={() => refresh().then(() => setNotice({
            text: "Workspace refreshed."
          })).catch(error => setNotice({
            text: message(error),
            error: true
          }))}><RefreshCw size={18} className={refreshing ? "admin-spin" : ""} /></button></div></header>
    <main className="admin-workspace" id="admin-main" tabIndex={-1}>
      {notice && <div role={notice.error ? "alert" : "status"} className={`admin-notice ${notice.error ? "admin-notice-error" : ""}`}><span>{notice.error ? <CircleAlert size={19} aria-hidden="true" /> : <Check size={19} aria-hidden="true" />}{notice.text}</span><button className="admin-icon-button" onClick={() => setNotice(null)} aria-label="Dismiss message"><X size={16} /></button></div>}
      {!data ? <Empty title="Your workspace is temporarily unavailable" description="Your account is signed in. Refresh to reconnect to the database."><button className="admin-button" disabled={refreshing} onClick={() => refresh().catch(error => setNotice({
            text: message(error),
            error: true
          }))}>Try again <RefreshCw size={16} /></button></Empty> : <>
        {view === "overview" && <Overview data={data} navigate={navigate} onReview={setReview} />}
        {view === "applications" && <ApplicationBrowser revision={revision} onReview={setReview} />}
        {view === "contests" && <div className="admin-notice"><span>New competition entries, fees, team sizes and payment review are managed by the main CYE team. Local competition records control the published six-event lineup; existing applications remain available here.</span><Link href="/admin/competition-registrations">View CYE competition entries ↗</Link></div>}
        {CONTENT_KINDS.includes(view as ContentKind) && <ContentList kind={view as ContentKind} records={data.content} onEdit={setEditor} onArchive={record => {
            setArchiveError("");
            setArchive({
              type: "content",
              id: record.id,
              title: record.title
            });
          }} />}
        {view === "settings" && <SettingsForm settings={data.settings} onSave={async settings => {
            const result = await api<{
              settings: SiteSettings;
            }>("/api/admin/settings", {
              method: "PUT",
              body: JSON.stringify(settings)
            });
            setData(current => current ? {
              ...current,
              settings: result.settings
            } : current);
            setNotice({
              text: "Site settings saved. Your website has been updated."
            });
            void refresh().catch(error => setNotice({
              text: `Saved successfully. ${message(error)}`,
              error: true
            }));
          }} />}
        {view === "trash" && <><Trash data={data} onRestore={restore} /><ApplicationBrowser archived revision={revision} onRestore={id => restore("application", id)} /></>}
        {view === "activity" && <Activity data={data} />}
        {view === "account" && <><PageHeader eyebrow="ACCOUNT & SECURITY" title="Your account." description="Keep your admin access secure." /><div className="admin-panel admin-account-panel"><p className="admin-eyebrow">SIGNED IN AS</p><h3>{user.email}</h3><PasswordForm onSuccess={async () => {
                setNotice({
                  text: "Your password has been changed successfully."
                });
                try {
                  await refresh();
                } catch (error) {
                  setNotice({
                    text: `Password changed successfully. ${message(error)}`,
                    error: true
                  });
                }
              }} /></div></>}
      </>}
    </main><footer className="admin-footer"><span>Capital Youth Expo pre-event · Admin studio</span><span>Built for the people behind the event.</span></footer></div>
    {editor && <ContentEditor record={editor} speakers={data?.content.filter(item => item.kind === "speakers") || []} onSave={saveContent} onClose={() => setEditor(null)} />}
    {review && <ApplicationReview record={review} onUpdate={values => updateApplication(review.id, values)} onClose={() => setReview(null)} onArchive={() => {
      setArchiveError("");
      setArchive({
        type: "application",
        id: review.id,
        title: review.name
      });
    }} />}
    {archive && <Modal title="Move to trash?" subtitle={`“${archive.title}” will be archived.`} onClose={() => setArchive(null)} busy={archiveBusy}><div className="admin-dialog-body"><p>The item will be hidden from active lists and the public website. Its details will be preserved, and you can restore it from Trash & restore.</p><ErrorText error={archiveError} /></div><div className="admin-dialog-footer"><button className="admin-button admin-button-secondary" disabled={archiveBusy} onClick={() => setArchive(null)}>Keep item</button><button className="admin-button admin-button-danger" disabled={archiveBusy} onClick={archiveRecord}>{archiveBusy ? <LoaderCircle size={18} className="admin-spin" /> : <Archive size={18} />} Move to trash</button></div></Modal>}
  </div>;
}
function Brand() {
  return <Link href="/" className="admin-brand" aria-label="Capital Youth Expo pre-event home"><span className="admin-brand-mark">CYE<span>↗</span></span><span>CAPITAL YOUTH<br />EXPO PRE-EVENT<span className="admin-brand-sub">ADMIN STUDIO</span></span></Link>;
}
function Login({
  onSignIn,
  notice
}: {
  onSignIn: (user: AdminUser) => Promise<void>;
  notice: Notice;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [method, setMethod] = useState<"password" | "login" | "reset">("password");
  const [address, setAddress] = useState("");
  const [challenge, setChallenge] = useState("");
  const [feedback, setFeedback] = useState("");
  const [resendWait, setResendWait] = useState(0);
  useEffect(() => {
    if (!resendWait) return;
    const timer = setTimeout(() => setResendWait(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendWait]);
  function chooseMethod(next: "password" | "login" | "reset") {
    setMethod(next); setChallenge(""); setFeedback(""); setError("");
  }
  async function sendCode() {
    setBusy(true); setError("");
    try {
      const result = await api<{ challenge_id: string; message: string }>("/api/admin/access/code", { method: "POST", body: JSON.stringify({ email: address, purpose: method }) });
      setChallenge(result.challenge_id); setFeedback(result.message); setResendWait(60);
    } catch (caught) { setError(message(caught)); }
    finally { setBusy(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (method !== "password" && !challenge) { await sendCode(); return; }
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      if (method === "reset" && form.get("new_password") !== form.get("confirm_password")) throw new Error("The new passwords do not match.");
      const result = await api<{ user?: AdminUser; message?: string }>(method === "password" ? "/api/admin/auth" : "/api/admin/access/verify", {
        method: "POST",
        body: JSON.stringify({
          email: address,
          ...(method === "password" ? { password: form.get("password") } : { purpose: method, challenge_id: challenge, code: form.get("code"), ...(method === "reset" ? { new_password: form.get("new_password") } : {}) })
        })
      });
      if (result.user) await onSignIn(result.user);
      else if (method === "reset") { chooseMethod("password"); setFeedback(result.message || "Password reset. Sign in with your new password."); }
      else throw new Error("Sign-in could not be confirmed. Please try again.");
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }
  return <main className="admin-root admin-login"><div className="admin-login-art"><Brand /><div><p className="admin-eyebrow">BEHIND EVERY GREAT EVENT.</p><h1>Good people.<br />Big possibilities<span>↗</span></h1><p>Your ideas. Your community. One place to bring it all together.</p></div><span className="admin-login-art-footer">CAPITAL YOUTH EXPO PRE-EVENT / ORGANIZER WORKSPACE</span></div><div className="admin-login-main"><Link href="/" className="admin-back-link"><ArrowLeft size={17} aria-hidden="true" /> Back to the website</Link><div className="admin-login-form">
    <p className="admin-eyebrow">{method === "reset" ? "RECOVER YOUR ACCOUNT" : "WELCOME BACK"}</p><h2>{method === "reset" ? <>A fresh start.<br />Same possibilities.</> : <>Let’s make<br />things happen.</>}</h2>
    <p>{method === "reset" ? "Verify the code sent to the owner's email, then choose a new password." : method === "login" ? "Sign in with a one-time email passkey. No password needed." : "Sign in to manage your event and community."}</p>
    {method !== "reset" && <div className="admin-login-methods" role="group" aria-label="Sign-in method"><button type="button" disabled={busy} aria-pressed={method === "password"} onClick={() => chooseMethod("password")}>Password</button><button type="button" disabled={busy} aria-pressed={method === "login"} onClick={() => chooseMethod("login")}>Email passkey</button></div>}
    <form onSubmit={submit}>
      <fieldset disabled={busy} className="admin-login-fields">
        <legend className="admin-sr-only">{method === "reset" ? "Reset admin password" : "Admin sign-in"}</legend>
        <label className="admin-field">Username or email<input type="text" name="email" autoComplete="username" required maxLength={100} autoFocus value={address} readOnly={Boolean(challenge)} onChange={event => setAddress(event.target.value)} placeholder="Your admin username" /></label>
        {method === "password" && <><label className="admin-field">Password<input type="password" name="password" autoComplete="current-password" required maxLength={256} placeholder="Enter your password" /></label><button type="button" className="admin-text-button admin-forgot-password" onClick={() => chooseMethod("reset")}>Forgot password?</button></>}
        {method !== "password" && challenge && <><label className="admin-field">Email passkey<input key={challenge} name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required autoFocus placeholder="Six-digit email code" /><span>Valid for 10 minutes. Each code works once.</span></label>
          {method === "reset" && <><label className="admin-field">New password<input type="password" name="new_password" autoComplete="new-password" required minLength={12} maxLength={256} /><span>Use at least 12 characters.</span></label><label className="admin-field">Confirm new password<input type="password" name="confirm_password" autoComplete="new-password" required minLength={12} maxLength={256} /></label></>}
          <div className="admin-login-code-actions"><button type="button" className="admin-text-button" disabled={resendWait > 0} onClick={sendCode}>{resendWait ? `Resend in ${resendWait}s` : "Send a new code"}</button><button type="button" className="admin-text-button" onClick={() => { setChallenge(""); setError(""); setFeedback(""); }}>Change username</button></div></>}
        {feedback && <p className="admin-login-feedback" role="status">{feedback}</p>}
        <ErrorText error={error || (notice?.error ? notice.text : "")} />
        <button className="admin-button admin-login-submit" disabled={busy}>{busy ? <>Please wait <LoaderCircle className="admin-spin" size={18} /></> : <>{method === "password" ? "Open admin studio" : !challenge ? "Send email passkey" : method === "reset" ? "Reset password" : "Sign in with passkey"}<ArrowUpRight size={19} /></>}</button>
      </fieldset>
    </form>
    {method === "reset" && <button type="button" className="admin-text-button" disabled={busy} onClick={() => chooseMethod("password")}><ArrowLeft size={16} aria-hidden="true" /> Back to sign in</button>}
    <p className="admin-login-security"><ShieldCheck size={15} aria-hidden="true" /> Authorized organizers only. Codes go to the owner’s configured email.</p>
    </div><span className="admin-login-footer">Capital Youth Expo pre-event · Made for what comes next.</span></div></main>;
}
function PageHeader({
  eyebrow,
  title,
  description,
  children
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return <div className="admin-page-header"><div><p className="admin-eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{children}</div>;
}
function Overview({
  data,
  navigate,
  onReview
}: {
  data: AdminData;
  navigate: (view: View) => void;
  onReview: (item: ApplicationRecord) => void;
}) {
  const applications = data.applications.filter(item => !item.deleted_at);
  const content = data.content.filter(item => !item.deleted_at);
  const pending = applications.filter(item => item.status === "pending");
  const stats = [{
    label: "Total applications",
    count: data.applicationSummary.total,
    note: "Your growing community",
    icon: Users
  }, {
    label: "Awaiting review",
    count: data.applicationSummary.pending,
    note: "Ready for your decision",
    icon: Clock3
  }, {
    label: "Approved entries",
    count: data.applicationSummary.approved,
    note: "All set for the event",
    icon: Check
  }, {
    label: "Published content",
    count: content.filter(item => item.published).length,
    note: "Live on your website",
    icon: FileText
  }];
  return <><PageHeader eyebrow="THE ORGANIZER’S CORNER" title="Make good things happen." description="A clear view of your event. Everything you need to keep it moving." /><div className="admin-stats">{stats.map(item => {
        const Icon = item.icon;
        return <div key={item.label} className="admin-stat"><div><span>{item.label}</span><Icon size={19} aria-hidden="true" /></div><strong>{item.count.toString().padStart(2, "0")}</strong><p>{item.note}</p></div>;
      })}</div><div className="admin-overview-grid"><section className="admin-panel"><div className="admin-panel-heading"><div><p className="admin-eyebrow">NEXT UP</p><h2>Waiting on you.</h2></div><button className="admin-text-button" onClick={() => navigate("applications")}>All applications <ArrowUpRight size={16} /></button></div>{pending.length === 0 ? <Empty title="You’re all caught up" description="New applications will appear here when they arrive." /> : <div className="admin-queue">{pending.slice(0, 5).map(item => <button key={item.id} onClick={() => onReview(item)}><span className="admin-avatar">{item.name.charAt(0).toUpperCase()}</span><span><strong>{item.name}</strong><span>{item.entry_title || item.kind} · {formatDate(item.created_at)}</span></span><Badge value="pending" /><ChevronRight size={18} aria-hidden="true" /></button>)}</div>}</section><section className="admin-event-summary"><div><p className="admin-eyebrow">YOUR NEXT BIG MOMENT</p><ArrowUpRight size={35} aria-hidden="true" /></div><h2>{data.settings.event_name}</h2><p>{data.settings.date_label || formatDate(data.settings.event_date)}<br />{data.settings.venue}</p><Badge value={data.settings.registration_open ? "Registration open" : "Registration closed"} /><button className="admin-button" onClick={() => navigate("settings")}>Edit event details <Pencil size={17} /></button></section></div><section className="admin-panel"><div className="admin-panel-heading"><div><p className="admin-eyebrow">BUILD YOUR LINEUP</p><h2>The details make the difference.</h2></div></div><div className="admin-shortcuts">{CONTENT_KINDS.map(kind => {
          const Icon = icons[kind];
          return <button key={kind} onClick={() => navigate(kind)}><Icon size={24} aria-hidden="true" /><strong>{labels[kind]}</strong><span>{content.filter(item => item.kind === kind).length} items <ArrowUpRight size={16} aria-hidden="true" /></span></button>;
        })}</div></section></>;
}
function SearchField({
  value,
  onChange,
  placeholder = "Search…"
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return <label className="admin-search"><Search size={18} aria-hidden="true" /><input type="search" aria-label={placeholder} placeholder={placeholder} value={value} onChange={event => onChange(event.target.value)} /></label>;
}
function ContentList({
  kind,
  records,
  onEdit,
  onArchive
}: {
  kind: ContentKind;
  records: ContentRecord[];
  onEdit: (record: ContentRecord) => void;
  onArchive: (record: ContentRecord) => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const all = records.filter(item => item.kind === kind && !item.deleted_at);
  const visible = all.filter(item => `${item.title} ${item.subtitle} ${item.category}`.toLowerCase().includes(query.toLowerCase()) && (status === "all" || (status === "published" ? item.published : !item.published))).sort((a, b) => a.sort_order - b.sort_order);
  return <><PageHeader eyebrow="CONTENT STUDIO" title={`${labels[kind]}.`} description={`Create, edit, and curate the ${labels[kind].toLowerCase()} on your website.`}><button className="admin-button" onClick={() => onEdit(blankRecord(kind))}><Plus size={18} /> Add {singular[kind]}</button></PageHeader><div className="admin-toolbar"><SearchField value={query} onChange={setQuery} placeholder={`Search ${labels[kind].toLowerCase()}`} /><label className="admin-filter">Visibility<select value={status} onChange={event => setStatus(event.target.value)}><option value="all">All items</option><option value="published">Published</option><option value="draft">Drafts</option></select></label><span className="admin-result-count">{visible.length} of {all.length} items</span></div>{visible.length === 0 ? <div className="admin-panel"><Empty title={all.length ? "No matching items" : `Add your first ${singular[kind]}`} description={all.length ? "Try a different search or visibility filter." : "Add the details, upload a picture, and publish when you’re ready."}>{!all.length && <button className="admin-button" onClick={() => onEdit(blankRecord(kind))}><Plus size={17} /> Create {singular[kind]}</button>}</Empty></div> : <div className="admin-content-grid">{visible.map(item => <article className="admin-content-card" key={item.id}><div className={`admin-content-image ${["team", "speakers"].includes(kind) ? "admin-portrait" : ""}`}>{(kind === "team" || item.image_url) ? <AdminImage src={kind === "team" ? teamPortrait(item) : item.image_url} alt="" /> : <div><ImagePlus size={30} aria-hidden="true" /><span>No image added</span></div>}<Badge value={item.published ? "Published" : "Draft"} /></div><div className="admin-content-body"><p className="admin-eyebrow">{item.category || labels[kind]}{item.featured && " / FEATURED"}{kind === "team" && item.show_as_segment_lead && " / SEGMENT LEAD"}</p><h2>{item.title}</h2><p>{item.subtitle || item.description || "Add a description in the editor."}</p>{(kind === "conferences" || kind === "contests") && <span className="admin-content-meta">{formatDate(item.date)} · {item.time || "Time to be announced"}</span>}<div className="admin-content-actions"><button className="admin-button admin-button-secondary" onClick={() => onEdit(item)}><Pencil size={15} /> Edit details</button><button className="admin-icon-button" title={`Move ${item.title} to trash`} aria-label={`Move ${item.title} to trash`} onClick={() => onArchive(item)}><Archive size={18} /></button></div></div></article>)}</div>}</>;
}
function ImageField({
  value,
  onChange,
  label = "Image",
  onBusy
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  onBusy?: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function upload(file?: File) {
    if (!file) return;
    if (!/^(image\/jpeg|image\/png|image\/webp)$/.test(file.type)) {
      setError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Choose an image smaller than 2 MB.");
      return;
    }
    setBusy(true);
    onBusy?.(true);
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      const result = await api<{
        url: string;
      }>("/api/admin/media", {
        method: "POST",
        body: form
      });
      onChange(result.url);
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
      onBusy?.(false);
    }
  }
  return <div className="admin-image-field"><label className="admin-field">{label} URL<input type="text" maxLength={1500} value={value} onChange={event => onChange(event.target.value)} placeholder="https://… or /images/…" /></label><div className="admin-image-upload">{value && <AdminImage src={value} alt={`${label} preview`} />}<label className={`admin-button admin-button-secondary ${busy ? "admin-disabled" : ""}`}>{busy ? <LoaderCircle size={17} className="admin-spin" aria-hidden="true" /> : <ImagePlus size={17} aria-hidden="true" />}{busy ? "Uploading…" : "Upload image"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event => {
          void upload(event.target.files?.[0]);
          event.target.value = "";
        }} /></label><span>JPG, PNG, WebP · up to 2 MB</span></div><ErrorText error={error} /></div>;
}
function ConferenceSpeakerPicker({ speakers, selected, assigned, onChange }: { speakers: ContentRecord[]; selected: string[]; assigned: string[]; onChange: (ids: string[]) => void }) {
  const hintId = useId();
  const linked = new Set([...assigned, ...selected]);
  const known = new Set(speakers.map(speaker => speaker.id));
  const options = [
    ...speakers.filter(speaker => !speaker.deleted_at || linked.has(speaker.id)).map(speaker => ({ id: speaker.id, title: speaker.title, subtitle: speaker.subtitle, archived: !!speaker.deleted_at })),
    ...Array.from(linked).filter(id => !known.has(id)).map(id => ({ id, title: `Unavailable speaker (${id})`, subtitle: "This record is no longer available.", archived: true })),
  ];
  return <fieldset className="admin-speaker-picker admin-full"><legend>Conference speakers</legend>
    {options.some(speaker => speaker.archived) && <p className="admin-speaker-warning" id={hintId}>Archived or unavailable speakers cannot stay assigned. Uncheck them below, or restore the speaker from trash before saving.</p>}
    {!options.length && <p>Add speakers to your studio, then connect them here.</p>}
    {options.map(speaker => <label key={speaker.id} className={speaker.archived ? "admin-speaker-archived" : ""}><input type="checkbox" checked={selected.includes(speaker.id)} disabled={speaker.archived && !selected.includes(speaker.id)} aria-describedby={speaker.archived ? hintId : undefined} onChange={event => onChange(event.target.checked ? [...selected, speaker.id] : selected.filter(id => id !== speaker.id))} /><span>{speaker.title}<small>{speaker.subtitle}</small></span>{speaker.archived && <Badge value="Archived" />}</label>)}
  </fieldset>;
}
function ContentEditor({
  record,
  speakers,
  onSave,
  onClose
}: {
  record: ContentRecord;
  speakers: ContentRecord[];
  onSave: (record: ContentRecord) => Promise<void>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(record);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const person = record.kind === "team" || record.kind === "speakers";
  const event = record.kind === "conferences" || record.kind === "contests";
  const paidEvent = requiresPayment(draft);
  function field(key: keyof ContentRecord, value: string | boolean | number | string[]) {
    setDraft(current => {
      const next = { ...current, [key]: value };
      if (next.kind === "conferences") {
        next.min_members = 1;
        next.max_members = 1;
        if (!requiresPayment(next)) next.fee = 0;
      }
      return next;
    });
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (record.kind === "contests" && draft.min_members > draft.max_members) {
      setError("Minimum team size cannot exceed the maximum.");
      return;
    }
    if (record.kind === "conferences" && draft.speaker_ids.some(id => !speakers.some(speaker => speaker.id === id && !speaker.deleted_at))) {
      setError("Uncheck archived or unavailable speakers before saving this conference. You can also restore them from Trash & restore.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSave(draft);
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }
  return <Modal title={`${record.id ? "Edit" : "Add"} ${singular[record.kind]}`} subtitle="Give it the details it deserves." busy={busy || uploading} onClose={onClose}><form onSubmit={submit}><div className="admin-dialog-body admin-form-grid"><label className="admin-field admin-full">{person ? "Full name" : "Title"}<input required maxLength={160} value={draft.title} onChange={e => field("title", e.target.value)} /></label><label className="admin-field admin-full">{record.kind === "team" ? "Position" : person ? "Role / organization" : "Subtitle"}<input maxLength={220} value={draft.subtitle} onChange={e => field("subtitle", e.target.value)} /></label><label className="admin-field admin-full">{person ? "Biography" : "Description"}<textarea rows={4} maxLength={10000} value={draft.description} onChange={e => field("description", e.target.value)} /></label><div className="admin-full">{record.kind === "team" && <><p>Photo changes update this member’s homepage lead card, organizing team card and team marquee. Featured members appear in the homepage lead cards, in display order (up to three). Select “Show in segment lead cards” below only for segment leads on the Our team page.</p><label className="admin-field">Display picture<select value={draft.use_avatar ? "avatar" : "photo"} onChange={e => field("use_avatar", e.target.value === "avatar")}><option value="photo">Uploaded photo</option><option value="avatar">Use avatar instead of photo</option></select></label><label className="admin-field">Avatar style<select value={draft.avatar_style || "beard"} onChange={e => field("avatar_style", e.target.value)}><option value="scarf">Woman wearing a scarf</option><option value="beard">Man with a medium beard</option></select><span>Used when no photo is added, when a photo cannot load, or when you choose an avatar. Select the style for this member.</span></label><div className="admin-team-portrait-preview"><AdminImage src={teamPortrait(draft)} alt="Member portrait preview" /></div></>}{!(record.kind === "team" && draft.use_avatar) && <ImageField label={person ? "Portrait" : record.kind === "sponsors" ? "Logo" : "Cover image"} value={draft.image_url} onChange={value => field("image_url", value)} onBusy={setUploading} />}{record.kind === "team" && draft.image_url && <button type="button" className="admin-button admin-button-secondary" onClick={() => { field("image_url", ""); field("use_avatar", true); }}>Remove photo and use avatar</button>}</div><label className="admin-field">{record.kind === "team" ? "Department" : person ? "Department / category" : "Category"}{event ? <select required value={draft.category} onChange={e => field("category", e.target.value)}><option value="">Choose a section</option>{!(record.kind === "contests" ? COMPETITION_SECTIONS : CONFERENCE_SECTIONS).some(section => section.name === draft.category) && draft.category && <option value={draft.category}>{draft.category} (previous category)</option>}{(record.kind === "contests" ? COMPETITION_SECTIONS : CONFERENCE_SECTIONS).map(section => <option key={section.name} value={section.name}>{section.name}{record.kind === "conferences" && section.name === "Career Pro" ? " — Workshop" : ""}</option>)}</select> : <input maxLength={100} value={draft.category} onChange={e => field("category", e.target.value)} />}{record.kind === "team" && <span>Shown under the member’s name and position in the team marquee.</span>}</label><label className="admin-field">Display order<input type="number" min={0} max={100000} step={1} required value={draft.sort_order} onChange={e => field("sort_order", Number(e.target.value))} /><span>Lower numbers appear first.</span></label>{event && <><label className="admin-field">Date<input type="date" value={draft.date} onChange={e => field("date", e.target.value)} required /></label><label className="admin-field">Time / duration<input value={draft.time} maxLength={100} placeholder="10:00 – 16:00" onChange={e => field("time", e.target.value)} /></label><label className="admin-field admin-full">Venue<input value={draft.location} maxLength={240} onChange={e => field("location", e.target.value)} /></label><label className="admin-field">Entry fee (PKR)<input type="number" min={paidEvent ? 0.01 : 0} disabled={!paidEvent} max={1000000} step="0.01" required value={draft.fee} onChange={e => field("fee", Number(e.target.value))} /><span>{record.kind === "contests" ? "Total fee per individual/team registration. Required for every competition." : paidEvent ? "Workshop fee per person. Receipt required. One participant per registration." : "Free Talk. Registration required. One participant per registration."}</span></label><label className="admin-field">Capacity<input type="number" min={0} max={100000} step={1} required value={draft.capacity} onChange={e => field("capacity", Number(e.target.value))} /><span>0 means no capacity limit.</span></label></>}{paidEvent && <><label className="admin-field">Payment method<input maxLength={100} value={draft.payment_method || ""} onChange={e => field("payment_method", e.target.value)} placeholder="Easypaisa, JazzCash, bank or another wallet" /></label><label className="admin-field">Account holder name<input maxLength={160} value={draft.payment_account_name || ""} onChange={e => field("payment_account_name", e.target.value)} /></label><label className="admin-field admin-full">Account / wallet number<input maxLength={100} value={draft.payment_account_number || ""} onChange={e => field("payment_account_number", e.target.value)} /></label><label className="admin-field admin-full">Payment instructions<textarea rows={4} maxLength={3000} value={draft.payment_instructions || ""} onChange={e => field("payment_instructions", e.target.value)} placeholder="Bank or wallet name, account title and number, payment reference instructions…" /><span>Shown to participants before they upload a receipt.</span></label></>}{record.kind === "contests" && <><label className="admin-field">Minimum team size<input type="number" min={1} max={20} step={1} required value={draft.min_members} onChange={e => field("min_members", Number(e.target.value))} /><span>Include the team leader in this count.</span></label><label className="admin-field">Maximum team size<input type="number" min={1} max={20} step={1} required value={draft.max_members} onChange={e => field("max_members", Number(e.target.value))} /><span>1 for an individual contest.</span></label><label className="admin-field admin-full">Rules & requirements<textarea rows={5} value={draft.rules} maxLength={15000} onChange={e => field("rules", e.target.value)} /><span>Write each rule on a new line.</span></label></>}{record.kind === "conferences" && <ConferenceSpeakerPicker speakers={speakers} selected={draft.speaker_ids} assigned={record.speaker_ids} onChange={ids => field("speaker_ids", ids)} />}<div className="admin-full admin-checks">{record.kind === "team" && <label><input type="checkbox" checked={draft.show_as_segment_lead === true} onChange={e => field("show_as_segment_lead", e.target.checked)} /><span>Show in segment lead cards<small>Display this member in “The minds making it happen” on the Our team page. Select only segment leads. All published members still appear in the team marquee.</small></span></label>}<label><input type="checkbox" checked={draft.published} onChange={e => field("published", e.target.checked)} /><span>Published<small>Visible on the public website.</small></span></label><label><input type="checkbox" checked={draft.featured} onChange={e => field("featured", e.target.checked)} /><span>Featured<small>Highlight in the main lineup.</small></span></label></div><div className="admin-full"><ErrorText error={error} /></div></div><div className="admin-dialog-footer"><button type="button" className="admin-button admin-button-secondary" disabled={busy || uploading} onClick={onClose}>Cancel</button><button className="admin-button" disabled={busy || uploading}>{busy ? <LoaderCircle size={18} className="admin-spin" /> : <Check size={18} />} {busy ? "Saving…" : "Save changes"}</button></div></form></Modal>;
}
function ApplicationReview({
  record,
  onUpdate,
  onClose,
  onArchive
}: {
  record: ApplicationRecord;
  onUpdate: (values: object) => Promise<void>;
  onClose: () => void;
  onArchive: () => void;
}) {
  const [reason, setReason] = useState(record.rejection_reason);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function update(status: ApplicationRecord["status"]) {
    if (status === "rejected" && !reason.trim()) {
      setError("Add a reason before rejecting this application.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onUpdate({
        status,
        rejection_reason: status === "rejected" ? reason.trim() : ""
      });
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }
  const details = [{
    label: "Email",
    value: record.email
  }, {
    label: "Phone",
    value: record.phone
  }, {
    label: "University",
    value: record.university
  }, {
    label: "CNIC / B-Form number",
    value: record.identification_number
  }, {
    label: "Department",
    value: record.department
  }, {
    label: "Semester",
    value: record.semester
  }, {
    label: "Received",
    value: formatDate(record.created_at)
  }];
  return <Modal title={record.name} subtitle={`${record.entry_title || record.kind} · ${record.reference}`} onClose={onClose} busy={busy}><div className="admin-dialog-body"><div className="admin-review-status"><Badge value={record.status} /><span>Application details</span></div><dl className="admin-detail-grid">{details.filter(item => item.value).map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>{record.message && <div className="admin-review-message"><h3>Message</h3><p>{record.message}</p></div>}{!!record.team_members?.length && <div className="admin-review-message"><h3>Additional team members ({record.team_members.length})</h3>{record.team_members.map((member, index) => <div className="admin-team-detail" key={`${member.email}-${index}`}><strong>{member.name}</strong><span>{member.email}</span><span>{member.phone} · {member.university}</span></div>)}</div>}{(record.kind === "contest" || record.kind === "conference") && <section className="admin-review-message"><h3>Registration payment</h3><p>{record.payment_amount !== undefined ? record.payment_amount === 0 ? "Free registration · one participant" : `Fee at registration: PKR ${record.payment_amount.toLocaleString()}` : "No fee snapshot recorded for this earlier application."}</p>{record.payment_receipt_url ? <a className="admin-button admin-button-secondary" href={record.payment_receipt_url} target="_blank" rel="noopener noreferrer">Download payment receipt <ArrowDownToLine size={17} /></a> : <p>{record.payment_amount === 0 ? "No receipt required for the free Talk." : "No receipt recorded for this earlier application."}</p>}<p>Check the receipt against your payment account before approving the participant.</p></section>}<label className="admin-field">Reason for rejection<textarea rows={3} value={reason} maxLength={1000} placeholder="Explain your decision clearly." onChange={e => setReason(e.target.value)} /><span>Stored with the application. Applicants are not automatically emailed.</span></label><ErrorText error={error} /><div className="admin-review-buttons"><button className="admin-button" disabled={busy || record.status === "approved"} onClick={() => update("approved")}><Check size={18} /> Approve</button><button className="admin-button admin-button-danger" disabled={busy} onClick={() => update("rejected")}><X size={18} /> Reject</button>{record.status !== "pending" && <button className="admin-button admin-button-secondary" disabled={busy} onClick={() => update("pending")}><RotateCcw size={17} /> Mark pending</button>}</div>{busy && <p className="admin-saving" role="status"><LoaderCircle size={16} className="admin-spin" /> Saving decision…</p>}</div><div className="admin-dialog-footer"><button className="admin-text-button" disabled={busy} onClick={onArchive}><Archive size={17} /> Move to trash</button><button className="admin-button admin-button-secondary" disabled={busy} onClick={onClose}>Done</button></div></Modal>;
}
function SettingsForm({
  settings,
  onSave
}: {
  settings: SiteSettings;
  onSave: (settings: SiteSettings) => Promise<void>;
}) {
  const [draft, setDraft] = useState(() => ({ ...settings, whatsapp_contacts: whatsappContacts(settings) }));
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  function field(key: keyof SiteSettings, value: string | boolean) {
    setDraft(current => ({
      ...current,
      [key]: value
    }));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSave(draft);
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }
  const limits: Partial<Record<keyof SiteSettings, number>> = {
    event_name: 100,
    date_label: 100,
    venue: 200,
    venue_address: 300,
    hero_title: 100,
    hero_accent: 100,
    contact_email: 254,
    contact_phone: 50,
    instagram_url: 1500,
    linkedin_url: 1500,
    maps_url: 1500
  };
  const input = (key: keyof SiteSettings, label: string, type = "text", required = false) => <label className="admin-field">{label}<input type={type} required={required} maxLength={limits[key] || 1000} value={String(draft[key])} onChange={e => field(key, e.target.value)} /></label>;
  return <><PageHeader eyebrow="MAKE IT YOURS" title="Your website. Your voice." description="Update the event, homepage, and contact details from one place." /><form className="admin-settings-form" onSubmit={submit}><section className="admin-panel"><div className="admin-panel-heading"><div><p className="admin-eyebrow">01 / THE EVENT</p><h2>The essentials.</h2></div></div><div className="admin-form-grid">{input("event_name", "Event name", "text", true)}{input("event_date", "Event date", "date", true)}{input("date_label", "Date display label", "text", true)}{input("venue", "Venue name", "text", true)}<div className="admin-full">{input("venue_address", "Full venue address")}</div><div className="admin-full">{input("maps_url", "Google Maps link", "url")}</div><div className="admin-full admin-registration-toggle"><label><input type="checkbox" checked={draft.registration_open} onChange={e => field("registration_open", e.target.checked)} /><span><strong>Open registrations</strong><small>Allow new competition, workshop, and Talk registrations.</small></span></label><Badge value={draft.registration_open ? "Open" : "Closed"} /></div></div></section><section className="admin-panel"><div className="admin-panel-heading"><div><p className="admin-eyebrow">02 / THE HOMEPAGE</p><h2>Set the tone.</h2></div></div><div className="admin-form-grid">{input("hero_title", "Hero headline", "text", true)}{input("hero_accent", "Hero accent line", "text", true)}<label className="admin-field admin-full">Hero description<textarea rows={3} maxLength={1000} required value={draft.hero_description} onChange={e => field("hero_description", e.target.value)} /></label><div className="admin-full"><ImageField label="Hero image" value={draft.hero_image} onChange={value => field("hero_image", value)} onBusy={setUploading} /></div><label className="admin-field admin-full">About the event<textarea rows={5} maxLength={10000} required value={draft.about_description} onChange={e => field("about_description", e.target.value)} /></label></div></section><section className="admin-panel"><div className="admin-panel-heading"><div><p className="admin-eyebrow">03 / STAY CONNECTED</p><h2>Keep the conversation going.</h2></div></div><div className="admin-form-grid">{input("contact_email", "Contact email", "email", true)}<fieldset className="admin-full admin-whatsapp-contacts"><legend>WhatsApp contacts (up to 2)</legend><p>Add numbers with country codes. Leave this list empty to hide WhatsApp contacts.</p>{draft.whatsapp_contacts.map((contact, index) => <div key={index} className="admin-form-grid"><label className="admin-field">Contact {index + 1} name (optional)<input maxLength={80} value={contact.name} onChange={e => setDraft(current => ({ ...current, whatsapp_contacts: current.whatsapp_contacts.map((item, i) => i === index ? { ...item, name: e.target.value } : item) }))} /></label><label className="admin-field">WhatsApp number {index + 1}<input type="tel" required maxLength={50} placeholder="+923001234567" value={contact.phone} onChange={e => setDraft(current => ({ ...current, whatsapp_contacts: current.whatsapp_contacts.map((item, i) => i === index ? { ...item, phone: e.target.value } : item) }))} /></label><button type="button" className="admin-button admin-button-secondary" onClick={() => setDraft(current => ({ ...current, whatsapp_contacts: current.whatsapp_contacts.filter((_, i) => i !== index) }))}>Remove contact {index + 1}</button></div>)}{draft.whatsapp_contacts.length < 2 && <button type="button" className="admin-button admin-button-secondary" onClick={() => setDraft(current => ({ ...current, whatsapp_contacts: [...current.whatsapp_contacts, { name: "", phone: "" }] }))}>Add WhatsApp contact</button>}</fieldset>{input("instagram_url", "Instagram URL", "url")}{input("linkedin_url", "LinkedIn URL", "url")}</div></section><ErrorText error={error} /><div className="admin-settings-save"><p>Published changes appear on the website after saving.</p><button className="admin-button" disabled={busy || uploading}>{busy ? <LoaderCircle size={18} className="admin-spin" /> : <Check size={18} />}{busy ? "Saving…" : "Save site settings"}</button></div></form></>;
}
function Trash({
  data,
  onRestore
}: {
  data: AdminData;
  onRestore: (type: "content" | "application", id: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState("");
  const items = data.content.filter(item => item.deleted_at).map(item => ({
    id: item.id, title: item.title, detail: labels[item.kind], deleted_at: item.deleted_at!, type: "content" as const
  })).filter(item => (item.title + " " + item.detail).toLowerCase().includes(query.toLowerCase())).sort((a, b) => b.deleted_at.localeCompare(a.deleted_at));
  async function restore(item: typeof items[number]) {
    setBusy(item.id);
    try {
      await onRestore(item.type, item.id);
    } catch {/* The parent displays the server error. */} finally {
      setBusy("");
    }
  }
  return <><PageHeader eyebrow="NOTHING LOST" title="Room for second chances." description="Archived items stay here until you restore them. No permanent deletions." /><div className="admin-toolbar"><SearchField value={query} onChange={setQuery} placeholder="Search archived content" /><span className="admin-result-count">{items.length} archived content items</span></div><div className="admin-panel admin-table-panel">{items.length === 0 ? <Empty title="No archived content" description="Archived website content will be kept here for recovery. Archived applications appear below." /> : <div className="admin-table-wrap"><table className="admin-table"><caption className="admin-sr-only">Archived records</caption><thead><tr><th>Item</th><th>Type / details</th><th>Archived</th><th><span className="admin-sr-only">Restore</span></th></tr></thead><tbody>{items.map(item => <tr key={`${item.type}-${item.id}`}><td><strong>{item.title}</strong></td><td>{item.detail}</td><td>{formatDate(item.deleted_at)}</td><td><button className="admin-button admin-button-small admin-button-secondary" disabled={!!busy} onClick={() => restore(item)}>{busy === item.id ? <LoaderCircle className="admin-spin" size={16} /> : <RotateCcw size={16} />} Restore</button></td></tr>)}</tbody></table></div>}</div></>;
}
function Activity({
  data
}: {
  data: AdminData;
}) {
  return <><PageHeader eyebrow="A CLEAR PAPER TRAIL" title="Every change, accounted for." description="A record of recent admin changes to your website and applications." /><div className="admin-panel admin-table-panel">{data.audit.length === 0 ? <Empty title="A fresh start" description="Changes made by your admin team will appear here." /> : <div className="admin-table-wrap"><table className="admin-table"><caption className="admin-sr-only">Administrator activity log</caption><thead><tr><th>Action</th><th>Administrator</th><th>Record</th><th>When</th></tr></thead><tbody>{data.audit.map(item => <tr key={item.id}><td><strong>{item.action.replaceAll("_", " ").replaceAll(".", " / ")}</strong></td><td>{item.admin_email}</td><td><span className="admin-reference">{item.target_id || "—"}</span></td><td>{formatDate(item.created_at)}<span>{new Date(item.created_at).toLocaleTimeString("en-GB", {
                    timeZone: "Asia/Karachi",
                    hour: "2-digit",
                    minute: "2-digit"
                  })} PKT</span></td></tr>)}</tbody></table></div>}</div></>;
}
function PasswordForm({
  onSuccess,
  required = false
}: {
  onSuccess: () => Promise<void>;
  required?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [codeMessage, setCodeMessage] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const ref = useRef<HTMLFormElement>(null);
  async function requestCode() {
    setError("");
    setSendingCode(true);
    try {
      const fields = new FormData(ref.current!);
      const result = await api<{ challenge_id: string; message: string }>("/api/admin/password/code", {
        method: "POST", body: JSON.stringify({ current_password: fields.get("current_password") })
      });
      setChallengeId(result.challenge_id);
      setCodeMessage(result.message);
      const codeInput = ref.current?.elements.namedItem("code") as HTMLInputElement | null;
      if (codeInput) codeInput.value = "";
    } catch (caught) { setError(message(caught)); }
    finally { setSendingCode(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const fields = new FormData(event.currentTarget);
    if (fields.get("new_password") !== fields.get("confirm_password")) {
      setError("The new passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await api("/api/admin/password", {
        method: "PATCH",
        body: JSON.stringify({
          current_password: fields.get("current_password"),
          new_password: fields.get("new_password"),
          code: fields.get("code"),
          challenge_id: challengeId
        })
      });
      ref.current?.reset();
      setChallengeId("");
      setCodeMessage("");
      await onSuccess();
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }
  return <form ref={ref} className="admin-password-form" onSubmit={submit}>{!required && <h2>Change your password</h2>}<p>Confirm this change with a code sent to the website owner’s security email.</p><label className="admin-field">{required ? "Temporary password" : "Current password"}<input name="current_password" type="password" required autoComplete="current-password" /></label><button type="button" className="admin-button admin-button-secondary" disabled={busy || sendingCode} onClick={requestCode}>{sendingCode ? "Sending code…" : challengeId ? "Resend email code" : "Send email code"}</button>{codeMessage && <p role="status">{codeMessage}</p>}<label className="admin-field">Email verification code<input name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required placeholder="6-digit code" /></label><label className="admin-field">New password<input name="new_password" type="password" minLength={12} maxLength={128} required autoComplete="new-password" /><span>Use at least 12 characters.</span></label><label className="admin-field">Confirm new password<input name="confirm_password" type="password" minLength={12} maxLength={128} required autoComplete="new-password" /></label><ErrorText error={error} /><button className="admin-button" disabled={busy || sendingCode || !challengeId}>{busy ? <LoaderCircle size={18} className="admin-spin" /> : <ShieldCheck size={18} />}{busy ? "Updating…" : required ? "Verify code & continue" : "Verify code & update password"}</button></form>;
}
