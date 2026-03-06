import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Layout from "../components/Layout";
import EventFormModal from "../components/EventFormModal";
import { eventsApi } from "../lib/api";
import { useLang } from "../contexts/LangContext";
import { apiError } from "../lib/i18n";
import { format, parseISO } from "date-fns";
import toast from "react-hot-toast";

// ── Password Gate Modal (for edit / delete on protected events) ───────────────
function PasswordGateModal({ event, onUnlock, onClose }) {
  const { t } = useLang();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await eventsApi.verifyPassword(event.id, password);
      onUnlock();
    } catch (err) {
      setError(apiError(err, t));
      setPassword("");
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" style={{ maxWidth: "380px" }}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "8px",
                background: "var(--accent-dim)",
                border: "1px solid rgba(37,99,235,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                width={15}
                height={15}
                strokeWidth={2}
                style={{ color: "var(--accent)" }}
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2 className="modal-title">{t.checkin_protected}</h2>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-muted)",
                lineHeight: 1.6,
                marginBottom: "16px",
              }}
            >
              {t.events_action_protected_desc(event.name)}
            </p>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">{t.checkin_password_label}</label>
              <input
                ref={inputRef}
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.checkin_password_placeholder}
              />
              {error && (
                <p
                  style={{
                    fontSize: "12px",
                    color: "var(--danger)",
                    marginTop: "6px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <svg
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    width={13}
                    height={13}
                    strokeWidth={2}
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {error}
                </p>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !password}
            >
              {loading ? t.checkin_unlocking : t.events_action_unlock}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function EventsPage() {
  const { t } = useLang();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [passwordGate, setPasswordGate] = useState(null); // { event, action: 'edit' | 'delete' }

  const fetchEvents = useCallback(async () => {
    try {
      const res = await eventsApi.getAll();
      setEvents(res.data.data);
    } catch {
      toast.error(t.toast_event_load_fail);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Live stat updates via socket (no toast — silent background sync)
  const updateEventStats = useCallback((eventId, stats) => {
    setEvents((prev) =>
      prev.map((ev) =>
        ev.id === eventId
          ? {
              ...ev,
              total_attendees: stats.total_attendees,
              checked_in_count: stats.checked_in_count,
            }
          : ev,
      ),
    );
  }, []);

  useEffect(() => {
    if (events.length === 0) return;
    const eventIds = events.map((e) => e.id);

    console.debug("Setting up socket connection using URL:", process.env.NEXT_PUBLIC_EKKLESIA_API_URL);
    const SOCKET_URL = (
      process.env.NEXT_PUBLIC_EKKLESIA_API_URL || "http://localhost:4000"
    );
    let s;
    import("socket.io-client").then(({ io }) => {
      console.debug("Initializing socket connection to", SOCKET_URL);
      s = io(SOCKET_URL, { autoConnect: true, secure: SOCKET_URL.startsWith("https") });

      eventIds.forEach((id) => s.emit("join_event", String(id)));
      const handler = (payload) => {
        if (payload?.stats && payload?.eventId)
          updateEventStats(payload.eventId, payload.stats);
      };
      [
        "attendee:checked_in",
        "attendee:unchecked",
        "attendee:added",
        "attendee:deleted",
        "attendees:imported",
        "attendees:cleared",
      ].forEach((ev) => s.on(ev, handler));
    });
    return () => {
      if (s) {
        eventIds.forEach((id) => s.emit("leave_event", String(id)));
        s.disconnect();
      }
    };
  }, [JSON.stringify(events.map((e) => e.id))]);

  const handleDelete = async (id) => {
    try {
      await eventsApi.delete(id);
      toast.success(t.toast_event_deleted);
      setDeleteConfirm(null);
      fetchEvents();
    } catch {
      toast.error(t.toast_event_delete_fail);
    }
  };

  const handlePasswordUnlock = () => {
    const { event, action } = passwordGate;
    setPasswordGate(null);
    if (action === "edit") {
      setEditEvent(event);
      setShowModal(true);
    } else if (action === "delete") {
      setDeleteConfirm(event);
    }
  };

  const formatDate = (d) => {
    try {
      return format(parseISO(d), "dd MMM yyyy");
    } catch {
      return d;
    }
  };
  const getProgress = (c, t) => (!t ? 0 : Math.round((c / t) * 100));

  return (
    <Layout title={t.events_title}>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t.events_title}</h1>
          <p className="page-subtitle">{t.events_subtitle}</p>
        </div>
        <div>
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditEvent(null);
              setShowModal(true);
            }}
          >
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              width={15}
              height={15}
              strokeWidth={2.5}
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {t.events_new}
          </button>
        </div>
      </div>

      <div className="page-content">
        {loading ? (
          <div className="loading-wrap">
            <div className="spinner" />
            <span>{t.loading}</span>
          </div>
        ) : events.length === 0 ? (
          <div className="empty-state">
            <svg
              className="empty-state-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <div className="empty-state-title">{t.events_empty_title}</div>
            <div className="empty-state-desc">{t.events_empty_desc}</div>
            <button
              className="btn btn-primary"
              style={{ marginTop: "16px" }}
              onClick={() => setShowModal(true)}
            >
              {t.events_create}
            </button>
          </div>
        ) : (
          <div className="events-grid">
            {events.map((event) => {
              const total = parseInt(event.total_attendees) || 0;
              const checked = parseInt(event.checked_in_count) || 0;
              const progress = getProgress(checked, total);
              return (
                <div key={event.id} style={{ position: "relative" }}>
                  <Link href={`/events/${event.id}`} className="event-card">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        marginBottom: "6px",
                        paddingRight: "52px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "15px",
                          fontWeight: 600,
                          color: "var(--text)",
                          lineHeight: 1.4,
                        }}
                      >
                        {event.name}
                      </div>
                      {event.is_protected && (
                        <span
                          title="Protected"
                          style={{
                            flexShrink: 0,
                            color: "var(--text-faint)",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <svg
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            width={13}
                            height={13}
                            strokeWidth={2}
                          >
                            <rect x="3" y="11" width="18" height="11" rx="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                        </span>
                      )}
                    </div>
                    <div className="event-card-meta">
                      {event.date && (
                        <span>
                          📅 {formatDate(event.date)}
                          {event.time ? ` · ${event.time.substring(0, 5)}` : ""}
                        </span>
                      )}
                      {event.location && <span>📍 {event.location}</span>}
                    </div>
                    {total > 0 && (
                      <div style={{ marginBottom: "14px" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: "5px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "10px",
                              color: "var(--text-muted)",
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                            }}
                          >
                            {t.events_progress}
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              color:
                                progress === 100
                                  ? "var(--success)"
                                  : "var(--accent)",
                              fontWeight: 700,
                            }}
                          >
                            {progress}%
                          </span>
                        </div>
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${progress}%`,
                              background:
                                progress === 100
                                  ? "var(--success)"
                                  : "var(--accent)",
                            }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="event-card-stats">
                      <div className="event-card-stat">
                        <div className="event-card-stat-value">{total}</div>
                        <div className="event-card-stat-label">
                          {t.events_registered}
                        </div>
                      </div>
                      <div className="event-card-divider" />
                      <div className="event-card-stat">
                        <div
                          className={`event-card-stat-value ${checked > 0 ? "accent" : ""}`}
                        >
                          {checked}
                        </div>
                        <div className="event-card-stat-label">
                          {t.events_checked_in}
                        </div>
                      </div>
                      {total > 0 && (
                        <>
                          <div className="event-card-divider" />
                          <div className="event-card-stat">
                            <div
                              className="event-card-stat-value"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {total - checked}
                            </div>
                            <div className="event-card-stat-label">
                              {t.events_remaining}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </Link>

                  {/* Action buttons */}
                  <div
                    style={{
                      position: "absolute",
                      top: "12px",
                      right: "12px",
                      display: "flex",
                      gap: "4px",
                    }}
                  >
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={(e) => {
                        e.preventDefault();
                        if (event.is_protected) {
                          setPasswordGate({ event, action: "edit" });
                        } else {
                          setEditEvent(event);
                          setShowModal(true);
                        }
                      }}
                      title={t.edit}
                    >
                      <svg
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        width={13}
                        height={13}
                        strokeWidth={2}
                      >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={(e) => {
                        e.preventDefault();
                        if (event.is_protected) {
                          setPasswordGate({ event, action: "delete" });
                        } else {
                          setDeleteConfirm(event);
                        }
                      }}
                      style={{ color: "var(--danger)" }}
                      title={t.delete}
                    >
                      <svg
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        width={13}
                        height={13}
                        strokeWidth={2}
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <EventFormModal
          event={editEvent}
          onClose={() => {
            setShowModal(false);
            setEditEvent(null);
          }}
          onSaved={() => {
            setShowModal(false);
            setEditEvent(null);
            fetchEvents();
          }}
        />
      )}

      {deleteConfirm && (
        <div
          className="modal-overlay"
          onClick={(e) =>
            e.target === e.currentTarget && setDeleteConfirm(null)
          }
        >
          <div className="modal" style={{ maxWidth: "380px" }}>
            <div className="modal-header">
              <h2 className="modal-title">{t.events_delete_title}</h2>
            </div>
            <div className="modal-body">
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--text-muted)",
                  lineHeight: 1.6,
                }}
              >
                {t.events_delete_confirm(deleteConfirm.name)}
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setDeleteConfirm(null)}
              >
                {t.cancel}
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleDelete(deleteConfirm.id)}
              >
                {t.events_delete_btn}
              </button>
            </div>
          </div>
        </div>
      )}

      {passwordGate && (
        <PasswordGateModal
          event={passwordGate.event}
          onUnlock={handlePasswordUnlock}
          onClose={() => setPasswordGate(null)}
        />
      )}
    </Layout>
  );
}
