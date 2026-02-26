import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../../components/Layout";
import ImportModal from "../../components/ImportModal";
import { eventsApi, attendeesApi } from "../../lib/api";
import { useSocket } from "../../hooks/useSocket";
import { useLang } from "../../contexts/LangContext";
import { format, parseISO } from "date-fns";
import toast from "react-hot-toast";

// ── Password Gate ─────────────────────────────────────────────────────────────
function PasswordGate({ event, onUnlock }) {
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
      setError(err.response?.data?.message || t.toast_error_generic);
      setPassword("");
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title={event.name}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          padding: "20px",
        }}
      >
        <div style={{ width: "100%", maxWidth: "360px" }}>
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "14px",
                background: "var(--accent-dim)",
                border: "1px solid rgba(37,99,235,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                width={24}
                height={24}
                strokeWidth={1.8}
                style={{ color: "var(--accent)" }}
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "var(--text)",
                marginBottom: "6px",
              }}
            >
              {t.checkin_protected}
            </h2>
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-muted)",
                lineHeight: 1.6,
              }}
            >
              {t.checkin_protected_desc(event.name)}
            </p>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">{t.checkin_password_label}</label>
              <input
                ref={inputRef}
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.checkin_password_placeholder}
                style={{ fontSize: "15px", padding: "11px 14px" }}
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
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: "100%",
                justifyContent: "center",
                padding: "11px",
              }}
              disabled={loading || !password}
            >
              {loading ? t.checkin_unlocking : t.checkin_unlock}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function EventDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { t } = useLang();

  const [event, setEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [undoConfirm, setUndoConfirm] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAttendee, setNewAttendee] = useState({
    name: "",
    phone_number: "",
    email: "",
  });
  const [addLoading, setAddLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [liveActivity, setLiveActivity] = useState(null);

  const fetchEvent = useCallback(async () => {
    if (!id) return;
    try {
      const res = await eventsApi.getOne(id);
      const ev = res.data.data;
      setEvent(ev);
      // Auto-unlock events that have no password protection
      if (!ev.is_protected) setUnlocked(true);
    } catch {}
  }, [id]);

  const fetchAttendees = useCallback(async () => {
    if (!id) return;
    try {
      const params = {};
      if (search) params.search = search;
      if (filter === "checked") params.checked_in = "true";
      if (filter === "pending") params.checked_in = "false";
      const res = await attendeesApi.getAll(id, params);
      setAttendees(res.data.data);
    } catch {}
  }, [id, search, filter]);

  // Load event metadata on mount; attendees are deferred until unlocked
  useEffect(() => {
    if (id) fetchEvent().finally(() => setLoading(false));
  }, [id]);

  // Fetch (or re-fetch) attendees whenever the event is unlocked, or search/filter change
  useEffect(() => {
    if (id && unlocked) fetchAttendees();
  }, [search, filter, id, unlocked]);

  const applyStats = useCallback((stats) => {
    setEvent((prev) => (prev ? { ...prev, ...stats } : prev));
  }, []);

  const patchAttendee = useCallback(
    (updated) => {
      setAttendees((prev) => {
        if (filter === "checked" && !updated.checked_in)
          return prev.filter((a) => a.id !== updated.id);
        if (filter === "pending" && updated.checked_in)
          return prev.filter((a) => a.id !== updated.id);
        return prev.map((a) => (a.id === updated.id ? updated : a));
      });
    },
    [filter],
  );

  // Socket — silent for others' actions, no toasts
  useSocket(id, {
    onConnect: () => setConnected(true),
    onDisconnect: () => setConnected(false),
    onCheckedIn: ({ attendee, stats }) => {
      patchAttendee(attendee);
      applyStats(stats);
      // Show activity banner (no toast — just visual indicator)
      setLiveActivity({ name: attendee.name, ts: Date.now() });
      setTimeout(() => setLiveActivity((a) => (a?.ts ? null : a)), 4000);
    },
    onUnchecked: ({ attendee, stats }) => {
      patchAttendee(attendee);
      applyStats(stats);
    },
    onAdded: ({ attendee, stats }) => {
      if (!search && filter !== "checked") {
        setAttendees((prev) => {
          if (prev.find((a) => a.id === attendee.id)) return prev;
          return [...prev, attendee];
        });
      }
      applyStats(stats);
    },
    onDeleted: ({ attendeeId, stats }) => {
      setAttendees((prev) => prev.filter((a) => a.id !== attendeeId));
      applyStats(stats);
    },
    onImported: ({ stats }) => {
      fetchAttendees();
      applyStats(stats);
    },
    onCleared: ({ stats }) => {
      setAttendees([]);
      applyStats(stats);
    },
  });

  const handleCheckIn = async (attendee) => {
    try {
      const res = await attendeesApi.checkIn(id, attendee.id);
      toast.success(t.toast_checkin_success(res.data.data.name));
    } catch (err) {
      toast.error(err.response?.data?.message || t.toast_error_generic);
    }
  };

  const handleUndoCheckIn = async (attendee) => {
    setUndoConfirm(null);
    try {
      await attendeesApi.undoCheckIn(id, attendee.id);
      toast.success(t.toast_undo_done);
    } catch {
      toast.error(t.toast_undo_fail);
    }
  };

  const handleDeleteAttendee = async (attendeeId) => {
    if (!confirm(t.detail_delete_confirm)) return;
    try {
      await attendeesApi.delete(id, attendeeId);
      toast.success(t.toast_attendee_deleted);
    } catch {
      toast.error(t.toast_attendee_delete_fail);
    }
  };

  const handleAddAttendee = async (e) => {
    e.preventDefault();
    if (!newAttendee.name.trim()) return;
    setAddLoading(true);
    try {
      await attendeesApi.create(id, newAttendee);
      toast.success(t.toast_attendee_added);
      setNewAttendee({ name: "", phone_number: "", email: "" });
      setShowAddForm(false);
    } catch (err) {
      toast.error(err.response?.data?.message || t.toast_attendee_add_fail);
    } finally {
      setAddLoading(false);
    }
  };

  const formatDate = (d) => {
    try {
      return format(parseISO(d), "dd MMM yyyy");
    } catch {
      return d;
    }
  };
  const formatCheckinTime = (ts) => {
    try {
      return format(new Date(ts), "HH:mm");
    } catch {
      return "";
    }
  };

  const total = parseInt(event?.total_attendees) || 0;
  const checkedIn = parseInt(event?.checked_in_count) || 0;
  const progress = total > 0 ? Math.round((checkedIn / total) * 100) : 0;

  if (loading)
    return (
      <Layout>
        <div className="loading-wrap">
          <div className="spinner" />
          <span>{t.loading}</span>
        </div>
      </Layout>
    );
  if (!event)
    return (
      <Layout>
        <div className="empty-state">
          <div className="empty-state-title">{t.detail_not_found}</div>
          <Link
            href="/"
            className="btn btn-primary"
            style={{ marginTop: "16px" }}
          >
            {t.detail_back}
          </Link>
        </div>
      </Layout>
    );

  // Show password gate for protected events that haven't been unlocked yet
  if (!unlocked)
    return <PasswordGate event={event} onUnlock={() => setUnlocked(true)} />;

  return (
    <Layout title={event.name}>
      {/* Live activity banner */}
      {liveActivity && (
        <div
          style={{
            position: "fixed",
            top: "16px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 2000,
            background: "var(--success-dim)",
            border: "1px solid rgba(22,163,74,0.35)",
            borderRadius: "var(--radius)",
            padding: "9px 18px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "var(--shadow-md)",
            animation: "slideUp 0.2s ease",
          }}
        >
          <svg
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            width={14}
            height={14}
            strokeWidth={2.5}
            style={{ color: "var(--success)" }}
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span
            style={{
              fontSize: "13px",
              color: "var(--success)",
              fontWeight: 600,
            }}
          >
            {liveActivity.name} {t.detail_just_checked_in}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <Link
              href="/"
              className="breadcrumb-a"
              style={{
                color: "var(--text-muted)",
                textDecoration: "none",
                fontSize: "13px",
              }}
            >
              {t.nav_events}
            </Link>
            <span
              className="breadcrumb-sep"
              style={{ color: "var(--text-faint)" }}
            >
              /
            </span>
            <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>
              {event.name}
            </span>
          </div>
          <h1 className="page-title">{event.name}</h1>
          <p className="page-subtitle">
            {event.date ? formatDate(event.date) : ""}
            {event.date && event.time ? ` · ${event.time.substring(0, 5)}` : ""}
            {event.location ? ` · ${event.location}` : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 10px",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
            }}
          >
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: connected ? "var(--success)" : "var(--danger)",
                animation: connected ? "pulse 2s infinite" : "none",
              }}
            />
            <span
              style={{
                fontSize: "12px",
                color: connected ? "var(--success)" : "var(--text-muted)",
              }}
            >
              {connected ? t.detail_live : t.detail_offline}
            </span>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => setShowImport(true)}
          >
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              width={14}
              height={14}
              strokeWidth={2}
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {t.detail_import}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowAddForm(true)}
          >
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              width={14}
              height={14}
              strokeWidth={2.5}
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {t.detail_add}
          </button>
        </div>
      </div>

      <div className="page-content">
        {/* Stats */}
        <div className="stats-grid">
          {[
            { label: t.detail_total, value: total, cls: "" },
            { label: t.detail_checked_in, value: checkedIn, cls: "success" },
            {
              label: t.detail_not_yet,
              value: total - checkedIn,
              cls: "accent",
            },
            { label: t.detail_rate, value: `${progress}%`, cls: "" },
          ].map((s) => (
            <div key={s.label} className="stat-card">
              <div className="stat-label">{s.label}</div>
              <div
                className={`stat-value ${s.cls}`}
                style={{ transition: "all 0.3s" }}
              >
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {total > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <div className="progress-bar" style={{ height: "6px" }}>
              <div
                className="progress-fill"
                style={{
                  width: `${progress}%`,
                  background:
                    progress === 100 ? "var(--success)" : "var(--accent)",
                  transition: "width 0.5s ease",
                }}
              />
            </div>
          </div>
        )}

        {/* Add attendee form */}
        {showAddForm && (
          <div className="card" style={{ marginBottom: "20px" }}>
            <div className="card-header">
              <span className="card-title">{t.detail_add_manual}</span>
              <button
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => setShowAddForm(false)}
              >
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  width={14}
                  height={14}
                  strokeWidth={2}
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddAttendee}>
              <div className="card-body">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr auto",
                    gap: "12px",
                    alignItems: "end",
                  }}
                >
                  <div>
                    <label className="form-label">
                      {t.detail_add_name}{" "}
                      <span style={{ color: "var(--danger)" }}>*</span>
                    </label>
                    <input
                      className="form-input"
                      value={newAttendee.name}
                      onChange={(e) =>
                        setNewAttendee((f) => ({ ...f, name: e.target.value }))
                      }
                      placeholder={t.detail_add_placeholder_name}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">
                      {t.detail_add_phone}{" "}
                      <span
                        style={{
                          color: "var(--text-faint)",
                          fontWeight: 400,
                          fontSize: "10px",
                        }}
                      >
                        (opsional)
                      </span>
                    </label>
                    <input
                      className="form-input"
                      value={newAttendee.phone_number}
                      onChange={(e) =>
                        setNewAttendee((f) => ({
                          ...f,
                          phone_number: e.target.value,
                        }))
                      }
                      placeholder={t.detail_add_placeholder_phone}
                    />
                  </div>
                  <div>
                    <label className="form-label">
                      {t.detail_add_email}{" "}
                      <span
                        style={{
                          color: "var(--text-faint)",
                          fontWeight: 400,
                          fontSize: "10px",
                        }}
                      >
                        (opsional)
                      </span>
                    </label>
                    <input
                      type="email"
                      className="form-input"
                      value={newAttendee.email}
                      onChange={(e) =>
                        setNewAttendee((f) => ({ ...f, email: e.target.value }))
                      }
                      placeholder={t.detail_add_placeholder_email}
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={addLoading}
                    style={{ height: "40px" }}
                  >
                    {addLoading ? "..." : t.detail_add_btn}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Attendees table */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              {t.detail_attendees} ({attendees.length})
            </span>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <div className="filter-tabs">
                {[
                  [t.detail_filter_all, "all"],
                  [t.detail_filter_checked, "checked"],
                  [t.detail_filter_pending, "pending"],
                ].map(([label, val]) => (
                  <button
                    key={val}
                    className={`filter-tab ${filter === val ? "active" : ""}`}
                    onClick={() => setFilter(val)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="search-wrap" style={{ width: "220px" }}>
                <svg
                  className="search-icon"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  className="form-input"
                  placeholder={t.detail_search_placeholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="table-wrap">
            {attendees.length === 0 ? (
              <div className="empty-state">
                <svg
                  className="empty-state-icon"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <div className="empty-state-title">
                  {search ? t.detail_no_results : t.detail_empty_title}
                </div>
                <div className="empty-state-desc">
                  {search ? t.detail_no_results_desc : t.detail_empty_desc}
                </div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>{t.detail_col_no}</th>
                    <th>{t.detail_col_name}</th>
                    <th>{t.detail_col_phone}</th>
                    <th>{t.detail_col_email}</th>
                    <th>{t.detail_col_status}</th>
                    <th>{t.detail_col_time}</th>
                    <th>{t.detail_col_actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {attendees.map((a, idx) => (
                    <tr
                      key={a.id}
                      style={{
                        background: a.checked_in
                          ? "rgba(22,163,74,0.03)"
                          : undefined,
                        transition: "background 0.4s",
                      }}
                    >
                      <td
                        style={{ color: "var(--text-faint)", fontSize: "12px" }}
                      >
                        {idx + 1}
                      </td>
                      <td style={{ fontWeight: 600 }}>{a.name}</td>
                      <td
                        style={{ fontSize: "13px", color: "var(--text-muted)" }}
                      >
                        {a.phone_number || "—"}
                      </td>
                      <td
                        style={{ fontSize: "13px", color: "var(--text-muted)" }}
                      >
                        {a.email || "—"}
                      </td>
                      <td>
                        {a.checked_in ? (
                          <span className="badge badge-success">
                            <svg
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              width={10}
                              height={10}
                              strokeWidth={3}
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            {t.detail_status_checked}
                          </span>
                        ) : (
                          <span className="badge badge-muted">
                            {t.detail_status_pending}
                          </span>
                        )}
                      </td>
                      <td
                        style={{ fontSize: "13px", color: "var(--text-muted)" }}
                      >
                        {a.checked_in_at
                          ? formatCheckinTime(a.checked_in_at)
                          : "—"}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "4px" }}>
                          {a.checked_in ? (
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => setUndoConfirm(a)}
                              style={{
                                fontSize: "11px",
                                color: "var(--text-muted)",
                              }}
                            >
                              {t.detail_btn_undo}
                            </button>
                          ) : (
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleCheckIn(a)}
                            >
                              {t.detail_btn_checkin}
                            </button>
                          )}
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            onClick={() => handleDeleteAttendee(a.id)}
                            style={{ color: "var(--danger)" }}
                          >
                            <svg
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              width={12}
                              height={12}
                              strokeWidth={2}
                            >
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {showImport && (
        <ImportModal
          eventId={id}
          onClose={() => setShowImport(false)}
          onImported={() => {}}
        />
      )}

      {undoConfirm && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setUndoConfirm(null)}
        >
          <div className="modal" style={{ maxWidth: "380px" }}>
            <div className="modal-header">
              <h2 className="modal-title">{t.detail_undo_title}</h2>
            </div>
            <div className="modal-body">
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--text-muted)",
                  lineHeight: 1.6,
                }}
              >
                {t.detail_undo_confirm(undoConfirm.name)}
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setUndoConfirm(null)}
              >
                {t.cancel}
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleUndoCheckIn(undoConfirm)}
              >
                {t.detail_undo_btn}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
        }
      `}</style>
    </Layout>
  );
}
