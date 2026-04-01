# Remote Care Companion

Demo-ready backend for a healthcare app using Bun, Elysia, TypeScript, Supabase, and Socket.io.

## Stack

- Bun
- Elysia
- TypeScript
- Supabase (PostgreSQL)
- Socket.io

## Project Structure

```text
/backend
  index.ts
  package.json
  tsconfig.json
  .env.example
  supabase-schema.sql
  types.ts
  routes/
    reminder.ts
    status.ts
    sos.ts
    burnout.ts
  services/
    reminderService.ts
    alertService.ts
  db/
    supabase.ts
  socket/
    socket.ts
```

## Setup

```bash
cd backend
bun install
cp .env.example .env
```

Fill in Supabase values if you have them. If not, the app will automatically run in in-memory demo mode.

## Run

```bash
cd backend
bun run dev
```

Production-style start:

```bash
cd backend
bun run start
```

Type-check:

```bash
cd backend
bun run typecheck
```

## Environment Variables

Example `.env`:

```env
PORT=3000
SOCKET_PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Supabase Schema

Run the SQL in [backend/supabase-schema.sql](/C:/Users/aanch/practice/backend/supabase-schema.sql) inside Supabase SQL Editor.

## API Examples

### `POST /api/reminder/add`

Request:

```json
{
  "userId": "7e26d07f-b987-4c2b-98e2-4fb393f68df9",
  "phone": "+919999999999",
  "medicine": "Metformin",
  "time": "08:00",
  "dosage": "500mg",
  "quantity": 1
}
```

Response:

```json
{
  "success": true,
  "message": "Reminder added successfully",
  "mode": "supabase",
  "data": {
    "id": "e0e2a1c6-1c52-4608-a6c6-46dc56442567",
    "user_id": "7e26d07f-b987-4c2b-98e2-4fb393f68df9",
    "medicine": "Metformin",
    "time": "08:00",
    "dosage": "500mg",
    "quantity": 1
  }
}
```

### `GET /api/reminder/list?userId=7e26d07f-b987-4c2b-98e2-4fb393f68df9`

Response:

```json
{
  "success": true,
  "message": "Reminders fetched successfully",
  "mode": "mock",
  "data": [
    {
      "id": "e0e2a1c6-1c52-4608-a6c6-46dc56442567",
      "user_id": "7e26d07f-b987-4c2b-98e2-4fb393f68df9",
      "medicine": "Metformin",
      "time": "08:00",
      "dosage": "500mg",
      "quantity": 1
    }
  ]
}
```

### `POST /api/status/update`

Request:

```json
{
  "userId": "7e26d07f-b987-4c2b-98e2-4fb393f68df9",
  "status": "skip"
}
```

Response:

```json
{
  "success": true,
  "message": "Dose status updated successfully",
  "mode": "mock",
  "data": {
    "log": {
      "id": "9162a557-3ad8-4560-a4e2-88994bc3c3d1",
      "user_id": "7e26d07f-b987-4c2b-98e2-4fb393f68df9",
      "status": "skip",
      "timestamp": "2026-04-01T13:15:00.000Z"
    },
    "alert": {
      "id": "5dad27ab-a0ae-490b-b7fc-a435ba86bd44",
      "type": "missed",
      "message": "Missed medication detected for user 7e26d07f-b987-4c2b-98e2-4fb393f68df9",
      "timestamp": "2026-04-01T13:15:00.000Z"
    }
  }
}
```

### `POST /api/sos`

Request:

```json
{
  "userId": "7e26d07f-b987-4c2b-98e2-4fb393f68df9",
  "message": "Patient needs immediate help"
}
```

Response:

```json
{
  "success": true,
  "message": "SOS alert created successfully",
  "mode": "mock",
  "data": {
    "alert": {
      "id": "f9f11e6c-88bc-462a-b4ca-1788bcc340a1",
      "type": "sos",
      "message": "Patient needs immediate help",
      "timestamp": "2026-04-01T13:15:00.000Z"
    }
  }
}
```

### `POST /api/burnout`

Request:

```json
{
  "userId": "7e26d07f-b987-4c2b-98e2-4fb393f68df9",
  "mood": "overwhelmed"
}
```

Response:

```json
{
  "success": true,
  "message": "Burnout assessment completed",
  "data": {
    "userId": "7e26d07f-b987-4c2b-98e2-4fb393f68df9",
    "mood": "overwhelmed",
    "burnoutLevel": "high",
    "suggestion": "High burnout risk. Encourage rest, check in with a caregiver, and reduce non-essential tasks."
  }
}
```

## Socket.io Events

- `alert:new`
- `dose:update`
- `sos:triggered`

Socket server runs on `SOCKET_PORT` and defaults to `3001`.
