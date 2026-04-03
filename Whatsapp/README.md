# WhatsApp Bot

This folder contains the WhatsApp reminder bot for the project.

It uses Baileys to connect to WhatsApp Web, sends reminder messages on a schedule, accepts simple patient replies, and forwards important actions to the backend API.

## What It Currently Does

- sends scheduled medicine reminders to a configured WhatsApp JID
- accepts the commands `taken`, `later`, `skip`, and `sos`
- posts dose-status updates to the backend
- triggers SOS alerts through the backend
- sends a passive safety SOS if a patient does not reply for a long time

One important limitation: reminder schedules are currently defined locally in `scheduler.js` through `demoPatients`. The bot is not yet pulling reminder times from the backend reminder list or from the AI module.

## Runtime Flow

### 1. Startup

`bot.js` is the entry point.

On startup it:

1. loads or creates Baileys auth state in `WA_AUTH_DIR`
2. fetches the latest supported WhatsApp protocol version
3. creates the WhatsApp socket
4. creates in-memory patient state with `createPatientState()`
5. creates the scheduler with `createScheduler()`

### 2. QR login and connection lifecycle

Still in `bot.js`:

- when Baileys emits a QR code, it is printed to the terminal
- when the connection opens, the scheduler starts
- when the connection closes, the scheduler stops
- if the disconnection was not a logout, the bot reconnects automatically

### 3. Reminder scheduling

`scheduler.js` owns reminder timing and passive safety logic.

For each patient in `demoPatients`:

1. a cron job is registered from `state.cron`
2. when the cron fires, `sendReminder()` sends a WhatsApp message
3. the patient state is updated with:
   - `awaitingReply`
   - `lastReminderAt`
   - `waitingSinceAt`

The reminder message tells the user to reply with `taken` or `later`.

### 4. Incoming message handling

`messageHandler.js` processes WhatsApp replies.

Flow:

1. extract text from the Baileys message object
2. normalize it to lowercase
3. ignore unknown users, bot-originated messages, and unsupported messages
4. validate the command against:
   - `taken`
   - `later`
   - `skip`
   - `sos`
5. run the matching handler

If the patient is currently expected to reply and sends something else, the bot reminds them of the valid commands.

### 5. Command behavior

#### `taken`

- `POST /api/status/update` with status `taken`
- mark the patient as replied
- clear waiting state
- reply in WhatsApp with `Noted`

#### `later`

- `POST /api/status/update` with status `later`
- mark the patient as replied for now
- keep `awaitingReply` true
- send a postponed message
- schedule a snooze reminder after `REMINDER_SNOOZE_MINUTES`

#### `skip`

- `POST /api/status/update` with status `skip`
- backend may create a missed-dose alert
- clear waiting state
- reply in WhatsApp with `Noted`

#### `sos`

- `POST /api/sos`
- clear waiting state
- store `lastAlertAt`
- reply in WhatsApp with `Emergency alert sent`

### 6. Passive safety check

`scheduler.js` also runs a periodic safety cron.

For each patient it checks:

- are we still waiting for a reply?
- has the waiting time exceeded `SAFETY_WINDOW_HOURS`?
- was an alert already sent recently?

If the patient is overdue and not recently alerted:

1. trigger backend SOS through `triggerSos()`
2. record `lastAlertAt`
3. send a WhatsApp message confirming that an emergency alert was sent

## File Guide

- `bot.js`
  App entry point, WhatsApp socket setup, QR output, reconnect logic, scheduler startup, and inbound message wiring.
- `scheduler.js`
  In-memory patient state, cron reminder jobs, snooze reminders, and passive safety escalation.
- `messageHandler.js`
  Extracts text from messages, validates commands, calls backend APIs, and updates per-patient runtime state.
- `api.js`
  Small HTTP client for backend calls.
- `handler.js`
  Thin re-export of `handleIncomingMessage()`. Useful if another module imports the handler through the shorter path.
- `package.json`
  Scripts and package dependencies for the bot.

## Backend Integration

The bot currently calls these endpoints:

- `POST /api/status/update`
- `POST /api/sos`

That means the backend remains the source for:

- stored dose logs
- missed-dose alert creation
- SOS alert creation
- any frontend live updates driven by those alerts

## Environment Variables

Supported runtime variables include:

- `WA_AUTH_DIR`
- `API_BASE_URL`
- `LOG_LEVEL`
- `REMINDER_SNOOZE_MINUTES`
- `SAFETY_WINDOW_HOURS`
- `SAFETY_CHECK_INTERVAL_MINUTES`
- `DEMO_PATIENT_JID`
- `DEMO_USER_ID`
- `DEMO_PHONE`
- `DEMO_MEDICINE`
- `DEMO_DOSAGE`
- `REMINDER_CRON`

## Running It

```bash
cd Whatsapp
npm install
npm run dev
```

Or:

```bash
cd Whatsapp
npm start
```

On first run, scan the QR code shown in the terminal.

## What To Read First

If you want to understand the bot quickly, read files in this order:

1. `bot.js`
2. `scheduler.js`
3. `messageHandler.js`
4. `api.js`

That gives you the connection lifecycle first, then the reminder engine, then the reply handling.
