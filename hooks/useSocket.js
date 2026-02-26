import { useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";

const SOCKET_URL =
  process.env.EKKLESIA_API_URL?.replace("/ekklesia-api", "") ||
  "http://localhost:4000";

// Singleton socket instance shared across the app
let socket = null;

function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }
  return socket;
}

/**
 * useSocket(eventId, handlers)
 *
 * @param {string|number|null} eventId  - Join this event room when provided
 * @param {object}             handlers - Map of socket event name → callback
 *
 * Handlers recognised:
 *   onCheckedIn(payload)    → attendee:checked_in
 *   onUnchecked(payload)    → attendee:unchecked
 *   onAdded(payload)        → attendee:added
 *   onDeleted(payload)      → attendee:deleted
 *   onImported(payload)     → attendees:imported
 *   onCleared(payload)      → attendees:cleared
 *   onConnect()
 *   onDisconnect()
 *
 * payload shape: { eventId, attendee?, attendeeId?, imported?, skipped?, stats }
 * stats shape:   { total_attendees, checked_in_count }
 */
export function useSocket(eventId, handlers = {}) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers; // always latest without re-binding

  useEffect(() => {
    const s = getSocket();

    // Join event room
    if (eventId) {
      s.emit("join_event", String(eventId));
    }

    const wrap =
      (fn) =>
      (...args) =>
        fn && fn(...args);

    const onCheckedIn = wrap((p) => handlersRef.current.onCheckedIn?.(p));
    const onUnchecked = wrap((p) => handlersRef.current.onUnchecked?.(p));
    const onAdded = wrap((p) => handlersRef.current.onAdded?.(p));
    const onDeleted = wrap((p) => handlersRef.current.onDeleted?.(p));
    const onImported = wrap((p) => handlersRef.current.onImported?.(p));
    const onCleared = wrap((p) => handlersRef.current.onCleared?.(p));
    const onConnect = wrap(() => handlersRef.current.onConnect?.());
    const onDisconnect = wrap(() => handlersRef.current.onDisconnect?.());

    s.on("attendee:checked_in", onCheckedIn);
    s.on("attendee:unchecked", onUnchecked);
    s.on("attendee:added", onAdded);
    s.on("attendee:deleted", onDeleted);
    s.on("attendees:imported", onImported);
    s.on("attendees:cleared", onCleared);
    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);

    // The socket is a singleton and may already be connected before this
    // component mounted (e.g. navigating between pages). In that case the
    // 'connect' event will never fire again, leaving local `connected` state
    // permanently stuck at false. Sync it immediately if the socket is live.
    if (s.connected) {
      handlersRef.current.onConnect?.();
    }

    return () => {
      if (eventId) s.emit("leave_event", String(eventId));
      s.off("attendee:checked_in", onCheckedIn);
      s.off("attendee:unchecked", onUnchecked);
      s.off("attendee:added", onAdded);
      s.off("attendee:deleted", onDeleted);
      s.off("attendees:imported", onImported);
      s.off("attendees:cleared", onCleared);
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
    };
  }, [eventId]);

  return getSocket();
}
