# AI Module

This folder contains the standalone medication parsing pipeline for the project.

It has two jobs:

1. Parse plain-language reminder text such as "give 1 tablet of metformin after dinner for 5 days".
2. Parse prescription images into structured medicines, reminder templates, clarification questions, and resolved reminder schedules.

At the moment, this module is self-contained. The frontend currently simulates AI behavior in its own demo helpers, so this folder is the real parsing engine, but it is not wired into the UI yet.

## High-Level Flow

### Flow A: Text reminder parsing

`parseReminder.js` is the entry point for free-text reminder instructions.

1. Input text is normalized.
2. `parseReminderItems()` asks Groq for structured JSON extraction.
3. If the model response is missing or fails, `fallbackParseReminder()` uses regex and heuristics.
4. Parsed items are normalized with cleanup helpers such as:
   - medicine name cleanup
   - dosage extraction
   - timing and frequency normalization
   - duration and schedule-pattern extraction
5. `compileReminderData()` passes the parsed items into `compilePrescriptionData()` from `ocr.js`.
6. The final output includes:
   - `medicines`
   - `reminder_templates`
   - `reminders`
   - `clarifications`
   - `setup_questions`
   - `preview`
   - simplified `medications` and `clarifications_needed`

This is important: even text reminders reuse the prescription compiler so both text input and OCR input end in the same scheduling format.

### Flow B: Prescription image parsing

`ocr.js` is the entry point for image-based parsing.

1. `extractPrescriptionText()` sends the image to Groq vision and asks for medicine-only OCR text.
2. `parsePrescriptionText()` sends that OCR text back to Groq text for structured extraction.
3. `normalizePrescriptionItems()` cleans and enriches every medicine row:
   - dosage normalization
   - frequency normalization
   - meal relation detection
   - schedule pattern parsing such as `1-0-1`
   - duration parsing
   - conflict detection
4. `buildReminderTemplatesFromPrescriptionItems()` converts parsed medicines into reminder templates.
5. `buildClarifications()` asks follow-up questions when the schedule is missing, ambiguous, or conflicting.
6. `buildSetupQuestions()` asks for global runtime data like:
   - start date
   - breakfast/lunch/dinner times
   - first-dose datetime for interval reminders
7. `resolveReminderTemplates()` converts labels such as `after breakfast` or `night` into actual clock times using `userContext`.
8. `buildSimpleOutput()` creates a UI-friendly summary for quick display.

## Interactive Demo Flow

`demo.js` is the CLI workflow for testing the OCR pipeline end to end.

1. Load saved preferences from `user-preferences.json` if it exists.
2. Build `userContext` from those preferences.
3. Run `extractMedicinesAndReminders(imagePath, { userContext })`.
4. If the result contains `questions`, keep prompting the user in the terminal.
5. Apply answers through `applyClarificationAnswers()`.
6. Recompile until the schedule is fully resolved or no more progress can be made.
7. Save updated preferences back to `user-preferences.json`.
8. Print the final medication list, reminder preview, and schedule context.

## Main Data Shapes

The compiler works around a few core layers:

- Raw extracted items: medicine, dosage, timing, frequency, duration, schedule pattern, instructions.
- Normalized medicines: enriched parsing output with conflicts, meal relation, and schedule metadata.
- Reminder templates: unresolved labels like `after breakfast`, `night`, or `every 8 hours`.
- Resolved reminders: final reminder objects with concrete times or interval settings.
- Questions: missing information the system still needs before it can build safe reminders.

## File Guide

- `parseReminder.js`
  Plain-text reminder parser, Groq request helpers, regex fallback parser, CLI entry for text input, and bridge into the shared prescription compiler.
- `ocr.js`
  Core normalization and scheduling engine. Handles vision OCR, text extraction, schedule parsing, clarification generation, and final reminder resolution.
- `demo.js`
  Interactive CLI demo for prescription images. Persists user preferences and repeatedly asks clarification questions until the output settles.
- `prescription.jpg`
  Sample prescription image for testing.
- `presc3.jpg`
  Sample prescription image for testing.
- `presc5.jpg`
  Sample prescription image for testing.
- `user-preferences.json`
  Not committed by default. Created by `demo.js` to remember meal times and other scheduling preferences.

## Environment

`parseReminder.js` loads a local `.env` file from this folder if it exists.

Useful variables:

- `GROQ_API_KEY`
- `GROQ_TEXT_MODEL`
- `GROQ_VISION_MODEL`

## Running It

Use Node with built-in `fetch` support.

Text reminder parsing:

```bash
cd ai-module
node parseReminder.js "take 1 tablet of metformin after dinner for 5 days"
node parseReminder.js --full "take 1 tablet of metformin after dinner for 5 days"
```

Interactive text input:

```bash
cd ai-module
node parseReminder.js
```

Prescription image demo:

```bash
cd ai-module
node demo.js prescription.jpg
```

## What To Look At First

If you are new to this folder, read files in this order:

1. `demo.js`
2. `ocr.js`
3. `parseReminder.js`

That gives you the user flow first, then the scheduling engine, then the text parser.
