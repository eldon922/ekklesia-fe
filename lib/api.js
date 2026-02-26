import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

// Events
export const eventsApi = {
  getAll: () => api.get('/events'),
  getOne: (id) => api.get(`/events/${id}`),
  create: (data) => api.post('/events', data),
  update: (id, data) => api.put(`/events/${id}`, data),
  delete: (id) => api.delete(`/events/${id}`),
  verifyPassword: (id, password) => api.post(`/events/${id}/verify-password`, { password }),
};

// Attendees
export const attendeesApi = {
  getAll: (eventId, params) => api.get(`/events/${eventId}/attendees`, { params }),
  create: (eventId, data) => api.post(`/events/${eventId}/attendees`, data),
  import: (eventId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/events/${eventId}/attendees/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  checkIn: (eventId, attendeeId) => api.patch(`/events/${eventId}/attendees/${attendeeId}/checkin`),
  undoCheckIn: (eventId, attendeeId) => api.patch(`/events/${eventId}/attendees/${attendeeId}/undo-checkin`),
  delete: (eventId, attendeeId) => api.delete(`/events/${eventId}/attendees/${attendeeId}`),
  deleteAll: (eventId) => api.delete(`/events/${eventId}/attendees`),
};

export default api;
