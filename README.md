# Ekklesia — Frontend

Next.js 14 web application for managing church events and running check-in stations.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (Pages Router) |
| UI | React 18 |
| HTTP client | Axios |
| Real-time | Socket.io client 4 |
| File upload | react-dropzone |
| Date formatting | date-fns |
| Notifications | react-hot-toast |

---

## Project Structure

```
frontend/
├── pages/
│   ├── _app.js              # Global providers (LangProvider, Toaster)
│   ├── _document.js         # Custom HTML document
│   ├── index.js             # Events list page
│   ├── checkin.js           # Check-in station page
│   └── events/
│       └── [id].js          # Event detail & attendee management page
├── components/
│   ├── Layout.js            # Sidebar, nav, theme/language toggle, support bar
│   ├── EventFormModal.js    # Create / edit event modal
│   └── ImportModal.js       # CSV / Excel import modal
├── hooks/
│   └── useSocket.js         # Singleton Socket.io hook shared across pages
├── contexts/
│   └── LangContext.js       # Language state (Indonesian / English)
├── lib/
│   ├── api.js               # Axios instance + eventsApi / attendeesApi helpers
│   └── i18n.js              # All UI strings for both languages
├── styles/
│   └── globals.css          # Design tokens, layout, component styles
├── next.config.js
└── package.json
```

---

## Pages

### `/` — Events List

- Displays all events as cards with live attendee stats (registered, checked-in, remaining, progress bar)
- **New Event** button opens `EventFormModal`
- Edit (✏️) and Delete (🗑️) buttons on each card
- **Password-protected events** require the event password before the edit or delete action is allowed
- Live stat updates arrive silently via Socket.io — no page refresh needed

### `/events/[id]` — Event Detail

- Full attendee table with search, filter (All / Checked In / Pending), and sortable columns
- Add attendees manually or import from a CSV/XLS/XLSX file
- Check-in and undo check-in per attendee (undo requires confirmation)
- **Password-protected events** show a password gate before any content is visible; attendee data is not fetched from the network until the password is verified
- Live banner appears at the top whenever any operator checks someone in from another tab/device

### `/checkin` — Check-in Station

- Designed for operators running a check-in desk
- Select an event from the list; protected events require the password before the station unlocks
- Real-time attendee search by name or phone number (300 ms debounce)
- One-click check-in with instant feedback and a live recent check-ins feed
- Live stat bar shows current checked-in count, remaining, and total

---

## Key Features

### Password Protection
Events can be protected with a password (set in `EventFormModal`). The password gate appears in three places:
- **Events tab** — before opening the edit form or delete confirmation
- **Event detail page** — before the attendee list is shown or fetched
- **Check-in station** — before the search interface unlocks

### Live Updates
All pages share a singleton Socket.io connection (`hooks/useSocket.js`). Whenever any operator performs an action (check-in, import, add/delete attendee), every open tab and device watching the same event updates instantly without a refresh.

### Attendee Import
The import modal accepts `.csv`, `.xls`, and `.xlsx` files. Column headers are matched flexibly — Google Form exports work out of the box. Rows are inserted in the same order they appear in the file. On success the modal closes automatically.

### Bilingual UI
All interface strings are defined in `lib/i18n.js` and toggled via the sidebar language switcher. Supported languages:
- 🇮🇩 **Indonesian** (`id`) — default
- 🇬🇧 **English** (`en`)

### Dark / Light Mode
Theme preference is persisted in `localStorage` and applied before first paint via an inline script in `_document.js` to avoid flash of unstyled content.

---

## Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```env
EKKLESIA_API_URL=http://localhost:4000/ekklesia-api
```

| Variable | Default | Description |
|---|---|---|
| `EKKLESIA_API_URL` | `http://localhost:4000/ekklesia-api` | Base URL of the backend API |

---

## Running Locally

### Prerequisites

- Node.js 20+
- Backend API running (see `backend/README.md`)

### Steps

```bash
# 1. Install dependencies
cd frontend
npm install

# 2. Create .env.local (see above)

# 3. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build for production

```bash
npm run build
npm start
```

---

## Running with Docker

From the project root:

```bash
docker compose up --build
```

The frontend container starts on port `3000` and depends on the backend container being up first.

---

## API Communication

All HTTP requests go through the helpers in `lib/api.js`:

```
eventsApi.getAll()
eventsApi.getOne(id)
eventsApi.create(data)
eventsApi.update(id, data)
eventsApi.delete(id)
eventsApi.verifyPassword(id, password)

attendeesApi.getAll(eventId, params)
attendeesApi.create(eventId, data)
attendeesApi.import(eventId, file)        ← multipart/form-data
attendeesApi.checkIn(eventId, attendeeId)
attendeesApi.undoCheckIn(eventId, attendeeId)
attendeesApi.delete(eventId, attendeeId)
attendeesApi.deleteAll(eventId)
```

The Axios instance has a 30-second timeout. Error responses from the API are surfaced as toast notifications.

---

## Customisation

### WhatsApp Support Link
Update the `WA_URL` constant at the top of `components/Layout.js`:

```js
const WA_URL = "https://wa.me/+6289618113757";
```

### App Version
Update the `APP_VERSION` constant at the top of `components/Layout.js`:

```js
const APP_VERSION = "v2.0.3-beta.0";
```

### Adding a Language
1. Add a new entry to the `translations` object in `lib/i18n.js`, mirroring all keys from the `en` block.
2. Add the language metadata to the `LANGS` array at the bottom of the same file.
3. The sidebar language switcher cycles through all entries in `LANGS` automatically.