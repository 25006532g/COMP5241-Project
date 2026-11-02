"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Award, BarChart3, BookOpen, GraduationCap, LayoutDashboard, Library, LogOut, Menu, MessageSquare, Route, Settings, ShieldCheck, Users, X, Zap } from "lucide-react";
import { logOut } from "@/app/auth/actions";

const links = [
  ["Dashboard", "/dashboard", LayoutDashboard],
  ["Course catalog", "/catalog", Library],
  ["Learning paths", "/paths", Route],
  ["Interview simulator", "/interviews", MessageSquare],
  ["Daily 4D reflections", "/reflections", BookOpen],
  ["Create lesson", "/studio", BookOpen],
  ["Progress", "/progress", Award],
  ["Profile & settings", "/profile", Settings],
] as const;

function subscribeToMobileNavigation(onChange: () => void) {
  const media = window.matchMedia("(max-width: 900px)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function isMobileNavigation() { return window.matchMedia("(max-width: 900px)").matches; }
function serverMobileNavigation() { return true; }

export function LearnerShell({ children, active, name = "Learner", admin = false, instructor = false }: { children: React.ReactNode; active: string; name?: string; admin?: boolean; instructor?: boolean }) {
  const [open, setOpen] = useState(false);
  const mobile = useSyncExternalStore(subscribeToMobileNavigation, isMobileNavigation, serverMobileNavigation);
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open || !mobile) return;
    closeButton.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, mobile]);
  function closeMenu() { setOpen(false); menuButton.current?.focus(); }
  const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return <main className="portal-shell">
    <aside id="learner-navigation" className={`portal-sidebar ${open ? "portal-sidebar-open" : ""}`} inert={mobile && !open}>
      <div className="brand-row"><Link href="/dashboard" className="portal-brand"><span><Zap size={18} /></span><strong>FORGE</strong></Link><button ref={closeButton} className="portal-close" onClick={closeMenu} aria-label="Close navigation"><X size={19} /></button></div>
      <Link href="/profile" className="portal-profile"><span className="avatar">{initials}</span><span><strong>{name}</strong><small>{admin ? "Administrator" : instructor ? "Instructor" : "Learner"}</small></span></Link>
      <nav className="portal-nav" aria-label="Learner navigation">{links.map(([label, href, Icon]) => <Link key={href} href={href} className={active === href ? "active" : ""} aria-current={active === href ? "page" : undefined} onClick={() => setOpen(false)}><Icon size={18} />{label}</Link>)}{(instructor || admin) && <Link href="/teaching" className={active === "/teaching" ? "active" : ""} aria-current={active === "/teaching" ? "page" : undefined} onClick={() => setOpen(false)}><GraduationCap size={18} />Teaching</Link>}</nav>
      <nav className="portal-nav" aria-label="Reporting"><Link href="/reports" className={active === "/reports" ? "active" : ""} aria-current={active === "/reports" ? "page" : undefined} onClick={() => setOpen(false)}><BarChart3 size={18} />Quiz reports</Link>{admin && <><Link href="/admin" className={active === "/admin" ? "active" : ""} aria-current={active === "/admin" ? "page" : undefined} onClick={() => setOpen(false)}><ShieldCheck size={18} />Publish & review</Link><Link href="/admin/accounts" className={active === "/admin/accounts" ? "active" : ""} aria-current={active === "/admin/accounts" ? "page" : undefined} onClick={() => setOpen(false)}><Users size={18} />Account maintenance</Link></>}</nav>
      <div className="portal-foot"><form action={logOut}><button type="submit"><LogOut size={17} /> Log out</button></form></div>
    </aside>
    <section className="portal-workspace">
      <header className="portal-topbar"><button ref={menuButton} className="portal-menu" onClick={() => setOpen(true)} aria-label="Open navigation" aria-controls="learner-navigation" aria-expanded={open}><Menu size={20} /></button><Link href="/catalog" className="catalog-shortcut">Explore courses</Link><Link href="/profile" className="avatar portal-avatar">{initials}</Link></header>
      {children}
    </section>
    {open && mobile && <button className="portal-scrim" onClick={closeMenu} aria-label="Close navigation overlay" />}
  </main>;
}