# Frontend

This is the caretaker dashboard for the Remote Care Companion project.

It is a Next.js app that shows:

- device connection flow
- patient overview
- medicine schedule and stock
- alerts and SOS handling
- caregiver burnout suggestions
- prescription upload and AI-note demos

The frontend is built to work in two modes:

1. Live mode, where it talks to the backend API and socket server.
2. Demo fallback mode, where it loads seeded data from local storage and simulates events.

One important implementation detail: the AI note parsing and prescription scan are currently mocked inside `lib/api.ts`. They do not yet call the real logic in `ai-module`.

## Route Flow

### 1. Entry

`app/page.tsx` immediately redirects `/` to `/connect`.

### 2. Connection screen

`app/connect/page.tsx` is the pairing screen.

It simulates a device connection by:

- showing a QR-style visual
- flipping `connected` to true after a timeout
- allowing a manual device ID entry
- sending the user into `/dashboard`

This page is presentation-driven. It does not yet call the backend.

### 3. Dashboard shell boot

Every dashboard route is wrapped by `app/dashboard/layout.tsx`, which renders `components/DashboardShell.tsx`.

`DashboardShell` is the main runtime orchestrator. It:

1. calls `useCareStore().initialize()`
2. loads dashboard data from the backend through `lib/api.ts`
3. connects to the socket layer through `lib/socket.ts`
4. falls back to mock socket events if the real socket is unavailable
5. exposes a global SOS button and overlay
6. renders the sidebar, header, and active child page

### 4. Data loading flow

`store/useCareStore.ts` is the central state container.

During initialization:

1. `fetchDashboardData()` tries `GET /api/reminder/list`
2. if that works, reminders are mapped into frontend `Medicine` rows
3. patient, alerts, burnout, and caretaker data still come from the local demo snapshot
4. if the API call fails, everything falls back to local storage via `lib/storage.ts`

This means the dashboard is partly live and partly demo-driven.

### 5. Real-time flow

`lib/socket.ts` tries to connect to the backend socket server.

If the connection succeeds:

- `alert:new` creates a care alert
- `sos:triggered` opens the emergency overlay

If the connection fails:

- the app marks itself as disconnected
- mock timers generate a missed-dose alert and a later SOS alert

### 6. User action flows

#### Logs page

`app/dashboard/logs/page.tsx` combines:

- `MedicineTable` for current medications
- `AIInputBox` for simulated note parsing
- `AddMedicineForm` for creating a medicine reminder

When a medicine is added:

1. the form validates input with `react-hook-form` and `zod`
2. `useCareStore().addMedicine()` calls `createMedicine()`
3. `createMedicine()` tries `POST /api/reminder/add`
4. on API failure, it creates a local demo medicine instead
5. the store persists the new snapshot to local storage

#### Refills page

`app/dashboard/refills/page.tsx` shows low-stock medicines and renders `PrescriptionUpload`.

The upload widget currently:

1. shows a preview of the chosen image
2. calls `scanPrescription()` from `lib/api.ts`
3. returns a simulated scan result from demo data

It is not yet connected to `ai-module/ocr.js`.

#### Alerts page

`app/dashboard/alerts/page.tsx` reads alerts from the store and renders `AlertsPanel`.

Alerts come from:

- the seeded demo snapshot
- socket events
- local SOS fallback

#### Settings page

`app/dashboard/settings/page.tsx` stores UI settings directly in browser local storage. These settings are frontend-only for now.

#### Dashboard home page

`app/dashboard/page.tsx` shows the high-level patient summary, caregiver burnout chart, and support network.

The burnout suggestion button calls `POST /api/burnout` through `fetchBurnoutSuggestion()`, with a local fallback if the API is down.

## Source Layout

### `app/`

- `app/layout.tsx`
  Root HTML shell, font setup, and global toast container.
- `app/globals.css`
  Shared visual system for cards, buttons, inputs, layout polish, and theme colors.
- `app/page.tsx`
  Redirects users from `/` to `/connect`.
- `app/connect/page.tsx`
  Simulated pairing and device-linking screen.
- `app/dashboard/layout.tsx`
  Wraps all dashboard routes in `DashboardShell`.
- `app/dashboard/page.tsx`
  Main overview page.
- `app/dashboard/logs/page.tsx`
  Medication list, add-medicine modal, and AI care-note demo.
- `app/dashboard/refills/page.tsx`
  Prescription upload demo and refill queue.
- `app/dashboard/alerts/page.tsx`
  Alert metrics and alert list.
- `app/dashboard/settings/page.tsx`
  Local operational preferences.

### `components/`

- `DashboardShell.tsx`
  Global dashboard frame, initialization, socket hookup, and SOS trigger handling.
- `SidebarNav.tsx`
  Left navigation for dashboard routes.
- `ConnectionStatus.tsx`
  Small connected/waiting badge used in the dashboard header.
- `SOSOverlay.tsx`
  Emergency modal with staged UI feedback.
- `PatientOverviewCard.tsx`
  Patient summary card on the dashboard home page.
- `CaregiverSupportCard.tsx`
  Burnout trend chart and suggestion request flow.
- `CaretakerGrid.tsx`
  Support network overview.
- `MedicineTable.tsx`
  Daily medicine schedule and stock-risk display.
- `AddMedicineForm.tsx`
  Modal form with validation for new medicine entries.
- `AIInputBox.tsx`
  Simulated AI follow-up note parser.
- `PrescriptionUpload.tsx`
  File preview and simulated prescription scan card.
- `AlertsPanel.tsx`
  Active alert list with dismiss actions.

### `store/`

- `useCareStore.ts`
  Zustand store for patient data, medicines, alerts, AI state, connection state, and SOS UI state.

### `lib/`

- `api.ts`
  Backend fetch helpers plus local fallbacks and demo AI stubs.
- `socket.ts`
  Socket.io connection setup and mock-event fallback.
- `storage.ts`
  Browser local-storage snapshot persistence for demo mode.
- `demo-data.ts`
  Seed patient, medicine, alert, caretaker, burnout, and scan data.
- `types.ts`
  Shared frontend TypeScript models.
- `utils.ts`
  Small utilities like class merging, timestamp formatting, and sleep.

### Config files

- `package.json`
  Next.js scripts and dependencies.
- `.env.example`
  Public runtime variables for API and socket URLs.
- `tailwind.config.ts`
  Tailwind theme extensions and content paths.
- `postcss.config.js`
  PostCSS configuration for Tailwind.
- `tsconfig.json`
  TypeScript configuration.
- `next.config.mjs`
  Next.js config.

## Backend Integration Points

The frontend currently uses these backend endpoints:

- `GET /api/reminder/list`
- `POST /api/reminder/add`
- `POST /api/sos`
- `POST /api/burnout`

The socket client listens for:

- `alert:new`
- `sos:triggered`

## Running It

```bash
cd frontend
npm install
npm run dev
```

Default environment variables:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_SOCKET_URL=ws://localhost:4000
```

If you are running the bundled backend in this repo, its socket server defaults to port `3001`, so update `NEXT_PUBLIC_SOCKET_URL` to match that backend setting.

## What To Read First

If you want the shortest path to understanding the app, read files in this order:

1. `store/useCareStore.ts`
2. `components/DashboardShell.tsx`
3. `lib/api.ts`
4. `lib/socket.ts`
5. the page files under `app/dashboard/`
