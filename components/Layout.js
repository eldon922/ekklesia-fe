const APP_VERSION = "v0.0.1-beta.0";
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

  useEffect(() => {
    const saved = localStorage.getItem("ekklesia-theme") || "light";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

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
        <aside className="sidebar">
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
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "var(--success)",
                    flexShrink: 0,
                    boxShadow: "0 0 5px var(--success)",
                  }}
                />
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
