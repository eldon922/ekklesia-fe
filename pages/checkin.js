import { useState, useEffect, useRef, useCallback } from 'react';
import Layout from '../components/Layout';
import { eventsApi, attendeesApi } from '../lib/api';
import { useSocket } from '../hooks/useSocket';
import { useLang } from '../contexts/LangContext';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

// ── Password Gate ─────────────────────────────────────────────────────────────
function PasswordGate({ event, onUnlock }) {
  const { t } = useLang();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await eventsApi.verifyPassword(event.id, password);
      onUnlock();
    } catch (err) {
      setError(err.response?.data?.message || t.toast_error_generic);
      setPassword('');
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '14px',
            background: 'var(--accent-dim)', border: '1px solid rgba(37,99,235,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          }}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width={24} height={24} strokeWidth={1.8} style={{ color: 'var(--accent)' }}>
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>{t.checkin_protected}</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
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
              onChange={e => setPassword(e.target.value)}
              placeholder={t.checkin_password_placeholder}
              style={{ fontSize: '15px', padding: '11px 14px' }}
            />
            {error && (
              <p style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width={13} height={13} strokeWidth={2}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </p>
            )}
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '11px' }}
            disabled={loading || !password}
          >
            {loading ? t.checkin_unlocking : t.checkin_unlock}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CheckInPage() {
  const { t } = useLang();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [unlocked, setUnlocked] = useState(false);
  const [stats, setStats] = useState({ total_attendees: 0, checked_in_count: 0 });
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [lastAction, setLastAction] = useState(null);
  const [connected, setConnected] = useState(false);
  const [recentCheckins, setRecentCheckins] = useState([]);
  const searchRef = useRef(null);
  const searchTimeout = useRef(null);

  useEffect(() => {
    eventsApi.getAll().then(res => setEvents(res.data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (searchRef.current && selectedEvent && unlocked) searchRef.current.focus();
  }, [selectedEvent, unlocked]);

  const fetchStats = useCallback(async (eventId) => {
    try {
      const res = await eventsApi.getOne(eventId);
      const d = res.data.data;
      setStats({ total_attendees: parseInt(d.total_attendees) || 0, checked_in_count: parseInt(d.checked_in_count) || 0 });
    } catch {}
  }, []);

  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
    setUnlocked(!event.is_protected);
    setSearch(''); setResults([]); setLastAction(null); setRecentCheckins([]);
    if (!event.is_protected) fetchStats(event.id);
  };

  const handleUnlock = () => {
    setUnlocked(true);
    fetchStats(selectedEvent.id);
  };

  // ── Socket — silent for others' check-ins, only update state ─────────────
  useSocket(selectedEvent?.id, {
    onConnect: () => setConnected(true),
    onDisconnect: () => setConnected(false),
    onCheckedIn: ({ attendee, stats: s }) => {
      // Update stats silently — no toast for others' actions
      setStats({ total_attendees: s.total_attendees, checked_in_count: s.checked_in_count });
      setResults(prev => prev.map(a => a.id === attendee.id ? attendee : a));
      setRecentCheckins(prev => [attendee, ...prev].slice(0, 8));
    },
    onUnchecked: ({ attendee, stats: s }) => {
      setStats({ total_attendees: s.total_attendees, checked_in_count: s.checked_in_count });
      setResults(prev => prev.map(a => a.id === attendee.id ? attendee : a));
      setRecentCheckins(prev => prev.filter(a => a.id !== attendee.id));
    },
    onAdded: ({ stats: s }) => setStats({ total_attendees: s.total_attendees, checked_in_count: s.checked_in_count }),
    onDeleted: ({ attendeeId, stats: s }) => {
      setStats({ total_attendees: s.total_attendees, checked_in_count: s.checked_in_count });
      setResults(prev => prev.filter(a => a.id !== attendeeId));
    },
    // No toast for imports by others — silent state update only
    onImported: ({ stats: s }) => setStats({ total_attendees: s.total_attendees, checked_in_count: s.checked_in_count }),
    onCleared: ({ stats: s }) => {
      setStats({ total_attendees: s.total_attendees, checked_in_count: s.checked_in_count });
      setResults([]);
    },
  });

  // ── Search ─────────────────────────────────────────────────────────────────
  const handleSearch = (value) => {
    setSearch(value);
    clearTimeout(searchTimeout.current);
    if (!value.trim()) { setResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await attendeesApi.getAll(selectedEvent.id, { search: value });
        setResults(res.data.data);
      } catch {} finally { setSearching(false); }
    }, 300);
  };

  // ── Check-in — only show toast for OUR OWN action ────────────────────────
  const handleCheckIn = async (attendee) => {
    try {
      const res = await attendeesApi.checkIn(selectedEvent.id, attendee.id);
      const checked = res.data.data;
      setLastAction({ attendee: checked, type: 'checkin' });
      toast.success(t.toast_checkin_success(checked.name));
      setSearch(''); setResults([]);
      if (searchRef.current) searchRef.current.focus();
    } catch (err) {
      if (err.response?.status === 409) {
        setLastAction({ attendee: err.response.data.data, type: 'already' });
        toast.error(err.response.data.message);
      } else {
        toast.error(err.response?.data?.message || t.toast_error_generic);
      }
    }
  };

  const formatDate = (d) => { try { return format(parseISO(d), 'dd MMM yyyy'); } catch { return d; } };
  const formatTime = (ts) => { try { return format(new Date(ts), 'HH:mm'); } catch { return ''; } };

  const total = stats.total_attendees;
  const checkedIn = stats.checked_in_count;
  const progress = total > 0 ? Math.round((checkedIn / total) * 100) : 0;

  return (
    <Layout title={t.checkin_title}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t.checkin_title}</h1>
          <p className="page-subtitle">{t.checkin_subtitle}</p>
        </div>
        {selectedEvent && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {unlocked && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? 'var(--success)' : 'var(--text-faint)', animation: connected ? 'pulse 2s infinite' : 'none' }} />
                <span style={{ fontSize: '12px', color: connected ? 'var(--success)' : 'var(--text-muted)' }}>
                  {connected ? t.checkin_live_sync : t.checkin_connecting}
                </span>
              </div>
            )}
            <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedEvent(null); setUnlocked(false); setStats({ total_attendees: 0, checked_in_count: 0 }); }}>
              {t.checkin_change}
            </button>
          </div>
        )}
      </div>

      <div className="page-content">
        {/* Event selection */}
        {!selectedEvent ? (
          <div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>{t.checkin_select_desc}</p>
            {events.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-title">{t.checkin_no_events}</div>
                <div className="empty-state-desc">{t.checkin_no_events_desc}</div>
              </div>
            ) : (
              <div className="events-grid" style={{ maxWidth: '860px' }}>
                {events.map(event => (
                  <div key={event.id} className="event-card" onClick={() => handleSelectEvent(event)}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div className="event-card-name" style={{ marginBottom: 0 }}>{event.name}</div>
                      {event.is_protected && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0, marginLeft: '8px', marginTop: '2px' }}>
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width={12} height={12} strokeWidth={2}>
                            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                          </svg>
                        </span>
                      )}
                    </div>
                    <div className="event-card-meta">
                      {event.date && <span>📅 {formatDate(event.date)}{event.time ? ` · ${event.time.substring(0, 5)}` : ''}</span>}
                      {event.location && <span>📍 {event.location}</span>}
                    </div>
                    <div className="event-card-stats">
                      <div className="event-card-stat">
                        <div className="event-card-stat-value">{event.total_attendees || 0}</div>
                        <div className="event-card-stat-label">{t.events_registered}</div>
                      </div>
                      <div className="event-card-divider" />
                      <div className="event-card-stat">
                        <div className="event-card-stat-value accent">{event.checked_in_count || 0}</div>
                        <div className="event-card-stat-label">{t.events_checked_in}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        ) : !unlocked ? (
          <PasswordGate event={selectedEvent} onUnlock={handleUnlock} />

        ) : (
          /* Check-in station */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px', alignItems: 'start' }}>
            <div>
              {/* Event stats */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', marginBottom: '18px', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)', marginBottom: '3px' }}>{selectedEvent.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {selectedEvent.date ? formatDate(selectedEvent.date) : ''}
                      {selectedEvent.date && selectedEvent.time ? ` · ${selectedEvent.time.substring(0, 5)}` : ''}
                      {selectedEvent.location ? ` · ${selectedEvent.location}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                    <div style={{ fontSize: '30px', fontWeight: 700, lineHeight: 1, color: progress === 100 ? 'var(--success)' : 'var(--accent)', transition: 'color 0.3s', letterSpacing: '-0.02em' }}>
                      {progress}%
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '3px' }}>
                      {t.checkin_attendance}
                    </div>
                  </div>
                </div>
                <div className="progress-bar" style={{ marginBottom: '10px' }}>
                  <div className="progress-fill" style={{ width: `${progress}%`, background: progress === 100 ? 'var(--success)' : 'var(--accent)', transition: 'width 0.5s ease' }} />
                </div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span><strong style={{ color: 'var(--success)' }}>{checkedIn}</strong> {t.checkin_checked_in}</span>
                  <span><strong style={{ color: 'var(--text)' }}>{total - checkedIn}</strong> {t.checkin_remaining}</span>
                  <span><strong style={{ color: 'var(--text)' }}>{total}</strong> {t.checkin_total}</span>
                </div>
              </div>

              {/* Last action result */}
              {lastAction && (
                <div className={`checkin-result ${lastAction.type === 'checkin' ? 'success' : 'warning'}`} style={{ alignItems: 'center' }}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width={20} height={20} strokeWidth={2}
                    style={{ color: lastAction.type === 'checkin' ? 'var(--success)' : 'var(--warning)', flexShrink: 0 }}>
                    {lastAction.type === 'already'
                      ? <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>
                      : <polyline points="20 6 9 17 4 12"/>}
                  </svg>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: lastAction.type === 'checkin' ? 'var(--success)' : 'var(--warning)' }}>
                      {lastAction.type === 'checkin' ? t.checkin_success : t.checkin_already}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text)', marginTop: '1px' }}>{lastAction.attendee?.name}</div>
                    {lastAction.attendee?.phone_number && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px' }}>{lastAction.attendee.phone_number}</div>}
                    {lastAction.attendee?.checked_in_at && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px' }}>
                        {t.checkin_at} {formatTime(lastAction.attendee.checked_in_at)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Search box */}
              <div className="card">
                <div className="card-body">
                  <div className="form-group" style={{ marginBottom: results.length > 0 ? '14px' : 0 }}>
                    <label className="form-label">{t.checkin_search_label}</label>
                    <div className="search-wrap">
                      <svg className="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      </svg>
                      <input
                        ref={searchRef}
                        className="form-input"
                        style={{ fontSize: '16px', padding: '13px 13px 13px 38px' }}
                        placeholder={t.checkin_search_placeholder}
                        value={search}
                        onChange={e => handleSearch(e.target.value)}
                        autoComplete="off"
                      />
                    </div>
                    {searching && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>{t.checkin_searching}</p>}
                  </div>

                  {results.map(a => (
                    <div key={a.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '13px', border: '1px solid',
                      borderColor: a.checked_in ? 'rgba(22,163,74,0.2)' : 'var(--border)',
                      borderRadius: 'var(--radius)', marginBottom: '8px',
                      background: a.checked_in ? 'var(--success-dim)' : 'var(--bg-elevated)',
                      transition: 'all 0.3s',
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text)', marginBottom: '3px' }}>{a.name}</div>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          {a.phone_number && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>📱 {a.phone_number}</span>}
                          {a.email && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>✉️ {a.email}</span>}
                        </div>
                        {a.checked_in && a.checked_in_at && (
                          <div style={{ fontSize: '11px', color: 'var(--success)', marginTop: '3px' }}>
                            ✓ {t.checkin_at} {formatTime(a.checked_in_at)}
                          </div>
                        )}
                      </div>
                      {a.checked_in
                        ? <span className="badge badge-success">{t.checkin_done}</span>
                        : <button className="btn btn-primary" style={{ padding: '10px 18px', fontSize: '14px' }} onClick={() => handleCheckIn(a)}>{t.checkin_btn}</button>
                      }
                    </div>
                  ))}

                  {search.length > 1 && !searching && results.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>
                      {t.checkin_no_results(search)}
                    </div>
                  )}
                  {!search && (
                    <div style={{ textAlign: 'center', padding: '18px', color: 'var(--text-faint)', fontSize: '12px' }}>
                      {t.checkin_hint}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Live feed — only shows check-ins from ALL operators (no toast for others) */}
            <div>
              <div className="card" style={{ position: 'sticky', top: '20px' }}>
                <div className="card-header">
                  <span className="card-title">{t.checkin_live_feed}</span>
                  {connected && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', animation: 'pulse 2s infinite' }} />
                      <span style={{ fontSize: '10px', color: 'var(--success)', fontWeight: 600 }}>LIVE</span>
                    </div>
                  )}
                </div>
                <div className="card-body" style={{ padding: '12px' }}>
                  {recentCheckins.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-faint)', fontSize: '12px' }}>
                      {t.checkin_live_empty}
                    </div>
                  ) : recentCheckins.map((a, i) => (
                    <div key={`${a.id}-${i}`} style={{
                      padding: '9px 11px', borderRadius: 'var(--radius)', marginBottom: '6px',
                      background: i === 0 ? 'var(--success-dim)' : 'var(--bg-elevated)',
                      border: `1px solid ${i === 0 ? 'rgba(22,163,74,0.2)' : 'var(--border)'}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width={12} height={12} strokeWidth={2.5} style={{ color: 'var(--success)', flexShrink: 0 }}>
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>{formatTime(a.checked_in_at)}</span>
                      </div>
                      {a.phone_number && (
                        <div style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '2px', paddingLeft: '18px' }}>{a.phone_number}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </Layout>
  );
}
