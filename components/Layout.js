const APP_VERSION = require('../package.json').version;
const WA_URL = "https://wa.me/+6289618113757";

import Link from "next/link";
import Head from "next/head";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { useLang } from "../contexts/LangContext";
import { LANGS } from "../lib/i18n";

const CalendarIcon = () => (
  <svg
    className="nav-icon"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={2}
  >
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const CheckSquareIcon = () => (
  <svg
    className="nav-icon"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={2}
  >
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);

const SunIcon = () => (
  <svg
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    width={15}
    height={15}
    strokeWidth={2}
  >
    <circle cx="12" cy="12" r="4" />
    <line x1="12" y1="2" x2="12" y2="4" />
    <line x1="12" y1="20" x2="12" y2="22" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="2" y1="12" x2="4" y2="12" />
    <line x1="20" y1="12" x2="22" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const MoonIcon = () => (
  <svg
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    width={15}
    height={15}
    strokeWidth={2}
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const GlobeIcon = () => (
  <svg
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    width={15}
    height={15}
    strokeWidth={2}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

export default function Layout({ children, title }) {
  const router = useRouter();
  const { lang, switchLang, t } = useLang();
  const [theme, setTheme] = useState("light");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("ekklesia-theme") || "light";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [router.pathname]);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("ekklesia-theme", next);
  };

  const toggleLang = () => {
    const next = lang === "id" ? "en" : "id";
    switchLang(next);
  };

  const isActive = (path) =>
    path === "/" ? router.pathname === "/" : router.pathname.startsWith(path);

  const pageTitle = title ? `${title} — Ekklesia` : "Ekklesia";
  const otherLang = LANGS.find((l) => l.code !== lang);
  const currentLang = LANGS.find((l) => l.code === lang);

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
      </Head>
      <div className="layout">
        {/* Mobile header */}
        <header className="mobile-header">
          <div className="mobile-header-logo">
            <div style={{ width: 28, height: 28, borderRadius: "7px", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg fill="white" viewBox="0 0 64 64" width={17} height={17}>
                <circle cx="32" cy="18" r="8" />
                <path d="M18 44c0-7.732 6.268-14 14-14s14 6.268 14 14" fill="white" />
                <circle cx="14" cy="22" r="6" fillOpacity="0.7" />
                <path d="M4 42c0-5.523 4.477-10 10-10s10 4.477 10 10" fill="rgba(255,255,255,0.7)" />
                <circle cx="50" cy="22" r="6" fillOpacity="0.7" />
                <path d="M40 42c0-5.523 4.477-10 10-10s10 4.477 10 10" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            Ekklesia
          </div>
          <button className="mobile-hamburger" onClick={() => setSidebarOpen(true)}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width={20} height={20} strokeWidth={2}>
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </header>

        {/* Overlay for sidebar drawer */}
        <div className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`} onClick={() => setSidebarOpen(false)} />

        <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          {/* Logo */}
          <div className="sidebar-logo">
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "9px",
                  background: "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg fill="white" viewBox="0 0 64 64" width={22} height={22}>
                  <circle cx="32" cy="18" r="8" />
                  <path
                    d="M18 44c0-7.732 6.268-14 14-14s14 6.268 14 14"
                    fill="white"
                  />
                  <circle cx="14" cy="22" r="6" fillOpacity="0.7" />
                  <path
                    d="M4 42c0-5.523 4.477-10 10-10s10 4.477 10 10"
                    fill="rgba(255,255,255,0.7)"
                  />
                  <circle cx="50" cy="22" r="6" fillOpacity="0.7" />
                  <path
                    d="M40 42c0-5.523 4.477-10 10-10s10 4.477 10 10"
                    fill="rgba(255,255,255,0.7)"
                  />
                </svg>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "var(--text)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Ekklesia
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "var(--text-muted)",
                    marginTop: "1px",
                  }}
                >
                  {t.app_subtitle}
                </div>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="sidebar-nav">
            <div className="nav-section-label">{t.nav_menu}</div>
            <Link
              href="/"
              className={`nav-item ${isActive("/") && !router.pathname.startsWith("/events/") ? "active" : ""}`}
            >
              <CalendarIcon />
              {t.nav_events}
            </Link>
            <Link
              href="/checkin"
              className={`nav-item ${isActive("/checkin") ? "active" : ""}`}
            >
              <CheckSquareIcon />
              {t.nav_checkin}
            </Link>
          </nav>

          {/* Footer: theme + language + support */}
          <div className="sidebar-footer">
            {/* Dark / Light mode toggle */}
            <button className="sidebar-action-btn" onClick={toggleTheme}>
              {theme === "light" ? <MoonIcon /> : <SunIcon />}
              <span>{theme === "light" ? t.switch_dark : t.switch_light}</span>
            </button>

            {/* Language switcher */}
            <button className="sidebar-action-btn" onClick={toggleLang}>
              <GlobeIcon />
              <span style={{ flex: 1 }}>{otherLang.label}</span>
              {/* Show current lang as small tag */}
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  background: "var(--accent-dim)",
                  color: "var(--accent)",
                  border: "1px solid var(--accent-dim)",
                  borderRadius: "3px",
                  padding: "1px 5px",
                }}
              >
                {currentLang.code.toUpperCase()}
              </span>
            </button>

            {/* Support / WhatsApp */}
            <div
              style={{
                borderTop: "1px solid var(--border)",
                paddingTop: "10px",
                marginTop: "2px",
              }}
            >
              <p
                style={{
                  fontSize: "11px",
                  color: "var(--text-faint)",
                  textAlign: "center",
                  lineHeight: 1.4,
                  marginBottom: "6px",
                  padding: "0 2px",
                }}
              >
                {t.support_text}
              </p>
              <a
                href={WA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="sidebar-action-btn"
                style={{
                  color: "var(--success)",
                  borderColor: "rgba(22,163,74,0.25)",
                  background: "rgba(22,163,74,0.06)",
                  textDecoration: "none",
                  justifyContent: "center",
                  gap: "7px",
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="4 4 16 16"
                  fill="currentColor">
                  <g transform="scale(1.5) translate(-4 -4)">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564c.173.087.289.129.332.202.043.073.043.423-.101.827z" />
                  </g>
                </svg>
                {t.support_whatsapp}
              </a>
            </div>

            {/* Version badge */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                paddingTop: "4px",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "2px 9px",
                  borderRadius: "20px",
                  background: "rgba(220,38,38,0.12)",
                  color: "var(--danger)",
                  border: "1px solid rgba(220,38,38,0.25)",
                  fontSize: "10px",
                  fontWeight: 700,
                  fontFamily: "var(--mono)",
                  letterSpacing: "0.04em",
                }}
              >
                {APP_VERSION}
              </span>
            </div>
          </div>
        </aside>

        <main className="main">{children}</main>
      </div>
    </>
  );
}
