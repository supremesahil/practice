# Gemini Voice Module

This module handles voice queries from Android devices using Google's Gemini, allowing patients to ask about their medicines naturally using voice commands like "Hey Google, where is my medicine?"

## Features

- 🎤 Natural language voice query processing
- 💊 Medication information retrieval
- 🤖 Intent parsing (medication list, specific medicine, schedule, next dose)
- 📱 Android Gemini integration ready
- 🎯 Context-aware responses

## Architecture

```
Patient (Android Device)
    ↓
"Hey Google, when should I take aspirin?"
    ↓
Google Speech-to-Text
    ↓
POST /api/reminder/voice-query
    ↓
gemini-module/intentParser → Understands intent
    gemini-module/responseFormatter → Formats natural response
    ↓
"Take Aspirin 500mg at 8 AM daily"
    ↓
Google Text-to-Speech
    ↓
Patient hears response
```

## Setup

### 1. Install Dependencies

```bash
cd gemini-module
npm install
```

### 2. Environment Variables

Create a `.env` file in the gemini-module folder:

```
GEMINI_API_KEY=your_google_api_key
BACKEND_BASE_URL=http://localhost:3000/api
NODE_ENV=development
```

### 3. Start the Backend Service

The gemini-module is integrated with the main backend, so just start the backend:

```bash
cd backend
bun run dev
```

## API Endpoints

### Voice Query Endpoint

**POST** `/api/reminder/voice-query`

Send a voice query and get a natural language response about medicines.

#### Request Body
```json
{
  "userId": "patient-123",
  "query": "When should I take aspirin?"
}
```

#### Response
```json
{
  "success": true,
  "message": "Take Aspirin 500mg at 8 AM daily",
  "data": {
    "success": true,
    "text": "Take Aspirin 500mg at 8 AM daily",
    "medicines": [
      {
        "name": "Aspirin",
        "dosage": "500mg",
        "time": "8 AM"
      }
    ]
  },
  "mode": "supabase|mock"
}
```

## Supported Queries

The module understands various natural language patterns:

### 1. Medicine List
- "Show me my medicines"
- "List all my medicines"
- "Where are my medicines?"
- "What medicines am I taking?"

**Response**: "You have 3 medicines. Aspirin - 500mg at 8 AM. Paracetamol - 650mg at 2 PM. Ibuprofen - 400mg at 8 PM"

### 2. Specific Medicine
- "When should I take aspirin?"
- "How much paracetamol?"
- "Dosage of ibuprofen"
- "When is my aspirin?"

**Response**: "Take Aspirin 500mg at 8 AM every day."

### 3. Next Dose
- "What's next?"
- "When is my next medicine?"
- "What should I take now?"

**Response**: "Your next medicine is Aspirin (500mg) at 8 AM."

### 4. Daily Schedule
- "What's my schedule?"
- "Show me my daily medicines"
- "Tell me my routine"

**Response**: "Your daily medicine schedule is: 8 AM: Aspirin 500mg, 2 PM: Paracetamol 650mg, 8 PM: Ibuprofen 400mg"

## File Structure

```
gemini-module/
├── index.ts                          # Main Elysia routes
├── types.ts                          # TypeScript interfaces
├── package.json                      # Dependencies
├── tsconfig.json                     # TypeScript config
├── .env.example                      # Environment template
├── services/
│   ├── intentParser.ts              # NLP intent recognition
│   ├── responseFormatter.ts         # Natural language formatting
│   └── geminiService.ts             # Core processing logic
└── controllers/
    └── voiceController.ts            # Route handlers
```

## Integration Steps

### 1. Backend Already Integrated
The routes are already imported in `backend/index.ts`:
- ✅ `/api/voice/query` - Direct voice query endpoint
- ✅ `/api/reminder/voice-query` - Integrated endpoint with reminder fetching

### 2. Android App Integration

In your Android app, use Google's Gemini API with a custom webhook:

```kotlin
// Pseudo-code for Android
val voiceQuery = "When should I take aspirin?"
val userId = "patient-123"

// Get user's medicines first
val remindersResponse = api.get("/api/reminder/list?userId=$userId")
val reminders = remindersResponse.data

// Send voice query to backend
val voiceResponse = api.post("/api/reminder/voice-query", 
  mapOf(
    "userId" to userId,
    "query" to voiceQuery
  )
)

// Get the natural language response
val response = voiceResponse.data.message
// "Take Aspirin 500mg at 8 AM daily"

// Use Google Gemini's Text-to-Speech to speak the response
tts.speak(response)
```

### 3. Google Actions Console Setup (Optional)

If you want direct integration with Google Assistant:

1. Go to [console.actions.google.com](https://console.actions.google.com)
2. Create a new project
3. Set webhook URL to: `https://your-api.com/api/voice/query`
4. Configure authentication with your userId

## Testing

### Test with cURL

```bash
curl -X POST http://localhost:3000/api/reminder/voice-query \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "query": "What medicines am I taking?"
  }'
```

### Example Responses

**Query**: "What medicines am I taking?"
```json
{
  "success": true,
  "message": "You have 3 medicines. Aspirin - 500mg at 8 AM. Paracetamol - 650mg at 2 PM. Ibuprofen - 400mg at 8 PM"
}
```

**Query**: "When should I take paracetamol?"
```json
{
  "success": true,
  "message": "Take Paracetamol 650mg at 2 PM every day."
}
```

**Query**: "My schedule"
```json
{
  "success": true,
  "message": "Your daily medicine schedule is: 8 AM: Aspirin 500mg, 2 PM: Paracetamol 650mg, 8 PM: Ibuprofen 400mg"
}
```

## How It Works

1. **Intent Parsing**: The `intentParser.ts` analyzes the query to determine what the patient is asking (medication list, specific medicine, schedule, etc.)

2. **Database Lookup**: Fetches the patient's medicines from Supabase

3. **Response Formatting**: The `responseFormatter.ts` generates a natural, conversational response based on the intent

4. **Text-to-Speech**: Android's Gemini converts the response back to speech

5. **Voice Output**: Patient hears the answer

## Extending the Module

To add more intent types:

1. Update `QueryIntent` type in `types.ts`
2. Add pattern matching in `intentParser.ts`
3. Create formatter function in `responseFormatter.ts`
4. Add case in `geminiService.ts` switch statement

Example - Adding "Refill" Intent:
```typescript
// In intentParser.ts
if (/\b(refill|low|need|order)\b.*\b(medicine|medicines)\b/.test(q)) {
  return { type: 'refill_request', original: query };
}

// In responseFormatter.ts
export function formatRefillResponse(reminders: MedicineReminder[]): string {
  return `Contact your pharmacy to refill: ${reminders.map(r => r.medicine).join(', ')}`;
}
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "text": "I couldn't find that medicine in your records.",
  "message": "Error message details"
}
```

## Security Considerations

- ✅ Always validate `userId` before querying medicines
- ✅ Use authenticated requests in production
- ✅ Implement rate limiting for voice queries
- ✅ Sanitize user input before processing
- ✅ Log voice queries for audit trails

## Performance

- Intent parsing: < 10ms
- Database lookup: < 100ms (depends on Supabase)
- Response formatting: < 5ms
- **Total latency**: ~100-150ms

## Troubleshooting

**Issue**: "Query processing failed"
- Check if userId is in the database
- Verify user has reminders created

**Issue**: "I couldn't find that medicine"
- Ensure medicine name matches database record
- Check medicine name spelling

**Issue**: Module not loading
- Verify all dependencies installed: `npm install`
- Check TypeScript compilation: `npm run build`

## License

Part of Remote Care Companion system
