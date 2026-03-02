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

// Helper to find original index in unfiltered list
const getOriginalIndex = (attendeeId, allAttendees) =>
  allAttendees.findIndex((a) => a.id === attendeeId) + 1;

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
  const { t, lang } = useLang();

  const [event, setEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [allAttendees, setAllAttendees] = useState([]);
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
  const [exportLoading, setExportLoading] = useState(false);
  // finish / restart confirmation modal: null | 'finish' | 'restart'
  const [finishModal, setFinishModal] = useState(null);
  const [finishLoading, setFinishLoading] = useState(false);
  // Edit attendee modal
  const [editAttendee, setEditAttendee] = useState(null); // attendee object | null
  const [editForm, setEditForm] = useState({ name: "", phone_number: "", email: "" });
  const [editLoading, setEditLoading] = useState(false);
  // Scroll to top/bottom FAB state
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const fetchEvent = useCallback(async () => {
    if (!id) return;
    try {
      const res = await eventsApi.getOne(id);
      const ev = res.data.data;
      setEvent(ev);
      if (!ev.is_protected) setUnlocked(true);
    } catch {}
  }, [id]);

  // Fetch unfiltered list for original numbering
  const fetchAllAttendees = useCallback(async () => {
    if (!id) return;
    try {
      const res = await attendeesApi.getAll(id, {});
      setAllAttendees(res.data.data);
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

  useEffect(() => {
    if (id) fetchEvent().finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchAllAttendees();
  }, [id, fetchAllAttendees]);

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
      // Also update allAttendees so numbering is correct without refresh
      setAllAttendees((prev) => {
        if (prev.find((a) => a.id === attendee.id)) return prev;
        return [...prev, attendee];
      });
      applyStats(stats);
    },
    onDeleted: ({ attendeeId, stats }) => {
      setAttendees((prev) => prev.filter((a) => a.id !== attendeeId));
      setAllAttendees((prev) => prev.filter((a) => a.id !== attendeeId));
      applyStats(stats);
    },
    onImported: ({ stats }) => {
      fetchAttendees();
      fetchAllAttendees();
      applyStats(stats);
    },
    onCleared: ({ stats }) => {
      setAttendees([]);
      setAllAttendees([]);
      applyStats(stats);
    },
    onUpdated: ({ attendee }) => {
      setAttendees((prev) => prev.map((a) => (a.id === attendee.id ? attendee : a)));
      setAllAttendees((prev) => prev.map((a) => (a.id === attendee.id ? attendee : a)));
    },
    onFinished: () => {
      setEvent((prev) => (prev ? { ...prev, is_finished: true } : prev));
      toast(t.event_finished_banner, { icon: "🔒" });
    },
    onRestarted: () => {
      setEvent((prev) => (prev ? { ...prev, is_finished: false } : prev));
      toast(t.toast_event_restarted, { icon: "🔓" });
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

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const response = await attendeesApi.export(id, lang);
      // response.data is already a Blob when responseType:'blob' — use it directly
      const url = URL.createObjectURL(response.data);
      const a = document.createElement("a");
      a.href = url;
      let filename = `${lang=='id' ? 'peserta' : 'attendees'}_${event?.name}_${new Date().toLocaleString().replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(t.toast_export_success);
    } catch {
      toast.error(t.toast_export_fail);
    } finally {
      setExportLoading(false);
    }
  };

  const handleFinishEvent = async () => {
    setFinishLoading(true);
    try {
      await eventsApi.finish(id);
      setEvent((prev) => (prev ? { ...prev, is_finished: true } : prev));
      toast.success(t.toast_event_finished);
    } catch (err) {
      toast.error(err.response?.data?.message || t.toast_error_generic);
    } finally {
      setFinishLoading(false);
      setFinishModal(null);
    }
  };

  const handleRestartEvent = async () => {
    setFinishLoading(true);
    try {
      await eventsApi.restart(id);
      setEvent((prev) => (prev ? { ...prev, is_finished: false } : prev));
      toast.success(t.toast_event_restarted);
    } catch (err) {
      toast.error(err.response?.data?.message || t.toast_error_generic);
    } finally {
      setFinishLoading(false);
      setFinishModal(null);
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

  const handleEditAttendee = (attendee) => {
    setEditAttendee(attendee);
    setEditForm({
      name: attendee.name || "",
      phone_number: attendee.phone_number || "",
      email: attendee.email || "",
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) return;
    setEditLoading(true);
    try {
      const res = await attendeesApi.update(id, editAttendee.id, editForm);
      const updated = res.data.data;
      setAttendees((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setAllAttendees((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      toast.success(t.toast_attendee_updated);
      setEditAttendee(null);
    } catch (err) {
      toast.error(err.response?.data?.message || t.toast_attendee_update_fail);
    } finally {
      setEditLoading(false);
    }
  };

  // Scroll to top/bottom handlers
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const scrollToBottom = () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" });
  };

  // Scroll event listener
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const threshold = 300;
      const distFromBottom = document.body.scrollHeight - window.innerHeight - scrollY;
      setShowScrollTop(scrollY > threshold);
      setShowScrollBottom(distFromBottom > threshold);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  if (!unlocked)
    return <PasswordGate event={event} onUnlock={() => setUnlocked(true)} />;

  return (
    <Layout title={event.name}>
      {/* Live activity banner */}
      {liveActivity && (
        <div
          className="live-activity-banner"
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
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 className="page-title" style={{ margin: 0 }}>
              {event.name}
            </h1>
            {event.is_finished && (
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "3px 9px",
                  borderRadius: "var(--radius)",
                  background: "var(--warning-dim)",
                  color: "var(--warning)",
                  border: "1px solid rgba(234,179,8,0.3)",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                {t.event_finished_badge}
              </span>
            )}
          </div>
          <p className="page-subtitle">
            {event.date ? formatDate(event.date) : ""}
            {event.date && event.time ? ` · ${event.time.substring(0, 5)}` : ""}
            {event.location ? ` · ${event.location}` : ""}
          </p>
        </div>
        <div
          className="detail-header-actions"
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
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
          {/* Export Excel — only available when event is finished */}
          {event.is_finished && (
            <button
              className="btn btn-secondary"
              onClick={handleExport}
              disabled={exportLoading}
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
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {exportLoading ? "..." : t.detail_export}
            </button>
          )}
          {/* Import Data */}
          <button
            className="btn btn-secondary"
            onClick={() => setShowImport(true)}
            disabled={event.is_finished}
            style={
              event.is_finished
                ? { opacity: 0.4, cursor: "not-allowed" }
                : undefined
            }
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
          {/* Add Attendee */}
          <button
            className="btn btn-primary"
            onClick={() => setShowAddForm(true)}
            disabled={event.is_finished}
            style={
              event.is_finished
                ? { opacity: 0.4, cursor: "not-allowed" }
                : undefined
            }
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
          {/* Finish / Restart Event */}
          {event.is_finished ? (
            <button
              className="btn btn-secondary"
              onClick={() => setFinishModal("restart")}
              style={{
                color: "var(--success)",
                borderColor: "rgba(22,163,74,0.4)",
              }}
            >
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                width={14}
                height={14}
                strokeWidth={2}
              >
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              {t.event_restart_btn}
            </button>
          ) : (
            <button
              className="btn btn-secondary"
              onClick={() => setFinishModal("finish")}
              style={{
                color: "var(--warning)",
                borderColor: "rgba(234,179,8,0.4)",
              }}
            >
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                width={14}
                height={14}
                strokeWidth={2}
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
              {t.event_finish_btn}
            </button>
          )}
        </div>
      </div>

      <div className="page-content">
        {/* Finished event warning banner */}
        {event.is_finished && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 16px",
              background: "var(--warning-dim)",
              border: "1px solid rgba(234,179,8,0.3)",
              borderRadius: "var(--radius)",
              marginBottom: "20px",
            }}
          >
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              width={16}
              height={16}
              strokeWidth={2}
              style={{ color: "var(--warning)", flexShrink: 0 }}
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span
              style={{
                fontSize: "13px",
                color: "var(--warning)",
                fontWeight: 600,
              }}
            >
              {t.event_finished_banner}
            </span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setFinishModal("restart")}
              style={{
                marginLeft: "auto",
                fontSize: "12px",
                color: "var(--warning)",
              }}
            >
              {t.event_restart_btn}
            </button>
          </div>
        )}

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
                  className="add-attendee-grid"
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
                      type="text"
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
                  autoFocus
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
                    <th className="table-col-phone">{t.detail_col_phone}</th>
                    <th className="table-col-email">{t.detail_col_email}</th>
                    <th>{t.detail_col_status}</th>
                    <th>{t.detail_col_time}</th>
                    <th>{t.detail_col_actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {attendees.map((a) => (
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
                        {getOriginalIndex(a.id, allAttendees)}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{a.name}</div>
                        <span
                          style={{
                            display: "inline-block",
                            fontSize: "9px",
                            padding: "1px 5px",
                            borderRadius: "3px",
                            background:
                              a.source === "import"
                                ? "var(--accent-dim)"
                                : "var(--bg-elevated)",
                            color:
                              a.source === "import"
                                ? "var(--accent)"
                                : "var(--text-faint)",
                            border: "1px solid",
                            borderColor:
                              a.source === "import"
                                ? "rgba(37,99,235,0.2)"
                                : "var(--border)",
                            marginTop: "3px",
                          }}
                        >
                          {a.source === "import"
                            ? t.source_import
                            : t.source_manual}
                        </span>
                      </td>
                      <td
                        className="table-col-phone"
                        style={{ fontSize: "13px", color: "var(--text-muted)" }}
                      >
                        {a.phone_number || "—"}
                      </td>
                      <td
                        className="table-col-email"
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
                          ) : event.is_finished ? (
                            <button
                              className="btn btn-ghost btn-sm"
                              disabled
                              title={t.event_finished_checkin_blocked}
                              style={{
                                fontSize: "11px",
                                color: "var(--text-faint)",
                                cursor: "not-allowed",
                                opacity: 0.5,
                              }}
                            >
                              {t.detail_btn_checkin}
                            </button>
                          ) : (
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleCheckIn(a)}
                            >
                              {t.detail_btn_checkin}
                            </button>
                          )}
                          {!event.is_finished && (
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              onClick={() => handleEditAttendee(a)}
                              title={t.detail_btn_edit}
                              style={{ color: "var(--text-muted)" }}
                            >
                              <svg
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                width={12}
                                height={12}
                                strokeWidth={2}
                              >
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                          )}
                          {!event.is_finished && (
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
                          )}
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

      {/* Edit Attendee Modal */}
      {editAttendee && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setEditAttendee(null)}>
          <div className="modal" style={{ maxWidth: "420px" }}>
            <div className="modal-header">
              <h2 className="modal-title">{t.detail_edit_attendee}</h2>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setEditAttendee(null)}
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width={16} height={16} strokeWidth={2}>
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">
                    {t.detail_add_name} <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <input
                    className="form-input"
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder={t.detail_add_placeholder_name}
                    required
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    {t.detail_add_phone}{" "}
                    <span style={{ color: "var(--text-faint)", fontWeight: 400, fontSize: "10px" }}>(opsional)</span>
                  </label>
                  <input
                    className="form-input"
                    value={editForm.phone_number}
                    onChange={(e) => setEditForm((f) => ({ ...f, phone_number: e.target.value }))}
                    placeholder={t.detail_add_placeholder_phone}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    {t.detail_add_email}{" "}
                    <span style={{ color: "var(--text-faint)", fontWeight: 400, fontSize: "10px" }}>(opsional)</span>
                  </label>
                  <input
                    className="form-input"
                    value={editForm.email}
                    onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder={t.detail_add_placeholder_email}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditAttendee(null)}
                  disabled={editLoading}
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={editLoading || !editForm.name.trim()}
                >
                  {editLoading ? t.form_saving : t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {finishModal && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setFinishModal(null)}
        >
          <div className="modal" style={{ maxWidth: "400px" }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {finishModal === "finish"
                  ? t.event_finish_title
                  : t.event_restart_title}
              </h2>
            </div>
            <div className="modal-body">
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--text-muted)",
                  lineHeight: 1.6,
                }}
              >
                {finishModal === "finish"
                  ? t.event_finish_confirm
                  : t.event_restart_confirm}
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setFinishModal(null)}
                disabled={finishLoading}
              >
                {t.cancel}
              </button>
              <button
                className={
                  finishModal === "finish"
                    ? "btn btn-danger"
                    : "btn btn-primary"
                }
                onClick={
                  finishModal === "finish"
                    ? handleFinishEvent
                    : handleRestartEvent
                }
                disabled={finishLoading}
              >
                {finishLoading
                  ? "..."
                  : finishModal === "finish"
                    ? t.event_finish_btn
                    : t.event_restart_btn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scroll FABs */}
      <div
        className="scroll-fabs"
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          zIndex: 1000,
        }}
      >
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background: "var(--accent)",
              color: "#ffffff",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "var(--shadow-md)",
              transition: "background 0.15s, transform 0.15s",
              animation: "fabIn 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--accent-hover)";
              e.currentTarget.style.transform = "scale(1.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--accent)";
              e.currentTarget.style.transform = "scale(1)";
            }}
            title="Scroll to top"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width={18} height={18} strokeWidth={2.5}>
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>
        )}
        {showScrollBottom && (
          <button
            onClick={scrollToBottom}
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background: "var(--bg-card)",
              color: "var(--text-muted)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "var(--shadow-md)",
              transition: "background 0.15s, transform 0.15s, color 0.15s",
              animation: "fabIn 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-elevated)";
              e.currentTarget.style.color = "var(--text)";
              e.currentTarget.style.transform = "scale(1.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--bg-card)";
              e.currentTarget.style.color = "var(--text-muted)";
              e.currentTarget.style.transform = "scale(1)";
            }}
            title="Scroll to bottom"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width={18} height={18} strokeWidth={2.5}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        )}
      </div>

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
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fabIn {
          from { opacity: 0; transform: translateY(6px) scale(0.9); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </Layout>
  );
}
