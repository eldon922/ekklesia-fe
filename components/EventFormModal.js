import { useState, useEffect } from 'react';
import { eventsApi } from '../lib/api';
import { useLang } from '../contexts/LangContext';
import toast from 'react-hot-toast';

export default function EventFormModal({ event, onClose, onSaved }) {
  const { t } = useLang();
  const [form, setForm] = useState({ name: '', date: '', time: '', location: '', description: '', password: '', remove_password: false });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [changePassword, setChangePassword] = useState(false);

  useEffect(() => {
    if (event) {
      setForm({
        name: event.name || '',
        date: event.date ? event.date.substring(0, 10) : '',
        time: event.time ? event.time.substring(0, 5) : '',
        location: event.location || '',
        description: event.description || '',
        password: '',
        remove_password: false,
      });
    }
  }, [event]);

  const isEditing = !!event;
  const isProtected = event?.is_protected;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error(t.form_name_required); return; }
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        date: form.date || null,
        time: form.time || null,
        location: form.location || null,
        description: form.description || null,
      };
      if (isEditing) {
        if (form.remove_password) payload.remove_password = true;
        else if (changePassword && form.password) payload.password = form.password;
      } else {
        if (form.password) payload.password = form.password;
      }
      if (isEditing) {
        await eventsApi.update(event.id, payload);
        toast.success(t.toast_event_updated);
      } else {
        await eventsApi.create(payload);
        toast.success(t.toast_event_created);
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || t.toast_error_generic);
    } finally {
      setLoading(false);
    }
  };

  const EyeIcon = ({ off }) => off ? (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width={14} height={14} strokeWidth={2}>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width={14} height={14} strokeWidth={2}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  );

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{isEditing ? t.form_edit_event : t.form_new_event}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width={16} height={16} strokeWidth={2}>
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">
                {t.form_event_name} <span style={{ color: 'var(--danger)', fontWeight: 600 }}>*</span>
              </label>
              <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t.form_event_name_placeholder} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">{t.form_date} <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>{t.form_optional}</span></label>
                <input type="date" className="form-input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">{t.form_time} <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>{t.form_optional}</span></label>
                <input type="time" className="form-input" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t.form_location} <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>{t.form_optional}</span></label>
              <input className="form-input" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder={t.form_location_placeholder} />
            </div>

            <div className="form-group">
              <label className="form-label">{t.form_description} <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>{t.form_optional}</span></label>
              <textarea className="form-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={t.form_description_placeholder} style={{ minHeight: '70px' }} />
            </div>

            {/* Password protection */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width={14} height={14} strokeWidth={2} style={{ color: 'var(--text-muted)' }}>
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{t.form_password_protection}</span>
                {isProtected && <span className="badge badge-accent" style={{ fontSize: '10px' }}>{t.form_password_active}</span>}
              </div>

              {isEditing && isProtected && !changePassword && !form.remove_password && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setChangePassword(true)}>{t.form_change_password}</button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => setForm(f => ({ ...f, remove_password: true }))}>{t.form_remove_password}</button>
                </div>
              )}

              {form.remove_password && (
                <div style={{ background: 'var(--danger-dim)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 'var(--radius)', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: 'var(--danger)' }}>{t.form_password_will_remove}</span>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm(f => ({ ...f, remove_password: false }))}>{t.form_undo}</button>
                </div>
              )}

              {(!isEditing || changePassword) && !form.remove_password && (
                <div>
                  <label className="form-label">{isEditing ? t.form_new_password : t.form_set_password} <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>{t.form_optional}</span></label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPassword ? 'text' : 'password'} className="form-input" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={t.form_password_placeholder} style={{ paddingRight: '40px' }} />
                    <button type="button" onClick={() => setShowPassword(p => !p)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}>
                      <EyeIcon off={showPassword} />
                    </button>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '5px' }}>{t.form_password_hint}</p>
                  {isEditing && <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: '6px' }} onClick={() => setChangePassword(false)}>{t.form_cancel_change}</button>}
                </div>
              )}

              {!isEditing && !form.password && (
                <p style={{ fontSize: '12px', color: 'var(--text-faint)', marginTop: '4px' }}>{t.form_password_desc}</p>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>{t.form_cancel}</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? t.form_saving : isEditing ? t.form_save : t.form_create}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
