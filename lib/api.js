import axios from "axios";

const API_URL =
  process.env.NEXT_PUBLIC_EKKLESIA_API_URL || "http://localhost:4000";

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

// ─── Token store (keyed by eventId, persisted in localStorage) ───────────────
const TOKEN_PREFIX = "ekklesia_token_";

export function saveEventToken(eventId, token) {
  try { localStorage.setItem(`${TOKEN_PREFIX}${eventId}`, token); } catch {}
}

export function getEventToken(eventId) {
  try { return localStorage.getItem(`${TOKEN_PREFIX}${eventId}`) || null; } catch { return null; }
}

export function clearEventToken(eventId) {
  try { localStorage.removeItem(`${TOKEN_PREFIX}${eventId}`); } catch {}
}

// ─── Codes that mean the token is no longer valid ────────────────────────────
const INVALIDATED_CODES = new Set([
  "AUTH_REQUIRED",
  "AUTH_INVALID",
  "AUTH_EXPIRED",
]);

// ─── Request interceptor — attach token when URL contains an eventId ─────────
api.interceptors.request.use((config) => {
  const match = config.url?.match(/\/events\/(\d+)/);
  if (match) {
    const token = getEventToken(match[1]);
    if (token) {
      config.headers = config.headers || {};
      config.headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return config;
});

// ─── Response interceptor — clear stale token and notify UI on auth failure ───
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const code = err.response?.data?.code;
    if (err.response?.status === 401 && INVALIDATED_CODES.has(code)) {
      const match = err.config?.url?.match(/\/events\/(\d+)/);
      if (match) {
        const eventId = match[1];
        clearEventToken(eventId);
        // Notify any mounted page that this event needs re-authentication
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("ekklesia:auth-expired", { detail: { eventId } }),
          );
        }
      }
    }
    return Promise.reject(err);
  },
);

// Events
export const eventsApi = {
  getAll: () => api.get("/events"),
  getOne: (id) => api.get(`/events/${id}`),
  create: (data) => api.post("/events", data),
  update: (id, data) => api.put(`/events/${id}`, data),
  delete: (id) => api.delete(`/events/${id}`),
  verifyPassword: async (id, password) => {
    const res = await api.post(`/events/${id}/verify-password`, { password });
    if (res.data?.token) saveEventToken(id, res.data.token);
    return res;
  },
  finish: (id) => api.patch(`/events/${id}/finish`),
  restart: (id) => api.patch(`/events/${id}/restart`),
};

// Attendees
export const attendeesApi = {
  getAll: (eventId, params) =>
    api.get(`/events/${eventId}/attendees`, { params }),
  create: (eventId, data) => api.post(`/events/${eventId}/attendees`, data),
  import: (eventId, file) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post(`/events/${eventId}/attendees/import`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  importDuplicates: (eventId, duplicates) =>
    api.post(`/events/${eventId}/attendees/import-duplicates`, { duplicates }),
  export: (eventId, lang) =>
    api.get(`/events/${eventId}/attendees/export`, {
      params: { lang },
      responseType: "blob",
    }),
  update: (eventId, attendeeId, data) =>
    api.patch(`/events/${eventId}/attendees/${attendeeId}`, data),
  checkIn: (eventId, attendeeId) =>
    api.patch(`/events/${eventId}/attendees/${attendeeId}/checkin`),
  undoCheckIn: (eventId, attendeeId) =>
    api.patch(`/events/${eventId}/attendees/${attendeeId}/undo-checkin`),
  delete: (eventId, attendeeId) =>
    api.delete(`/events/${eventId}/attendees/${attendeeId}`),
  deleteAll: (eventId) => api.delete(`/events/${eventId}/attendees`),
};

export default api;
