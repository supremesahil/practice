# Android Gemini Integration Guide

This guide explains how to integrate the gemini-module with your Android app to enable voice queries about medicines.

## Quick Setup

### Option 1: Direct Backend Integration (Recommended for MVP)

Your Android app directly calls the backend endpoint:

```
Android Device
    ↓ (Voice Input)
Convert to text using Android Speech Recognition
    ↓
POST to /api/reminder/voice-query
    ↓
Backend processes and returns response
    ↓
Text-to-Speech to speak response
```

### Option 2: Google Actions Integration (Advanced)

Set up a custom Google Action that routes through your backend.

---

## Implementation Guides

### **JavaScript/TypeScript (React Native)**

```typescript
// services/medicineVoiceService.ts

import axios from 'axios';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';

const API_BASE_URL = 'http://your-backend-url/api';

export async function queryMedicinesWithVoice(userId: string) {
  try {
    // Step 1: Record user voice
    const audioUri = await recordAudio();

    // Step 2: Convert speech to text using device API
    const transcribedQuery = await transcribeSpeech(audioUri);
    console.log('User asked:', transcribedQuery);

    // Step 3: Send to backend
    const response = await axios.post(
      `${API_BASE_URL}/reminder/voice-query`,
      {
        userId,
        query: transcribedQuery
      }
    );

    // Step 4: Speak the response
    const responseText = response.data.message;
    await Speech.speak(responseText, {
      language: 'en-US',
      rate: 0.9
    });

    return response.data;
  } catch (error) {
    console.error('Voice query failed:', error);
    Speech.speak('Sorry, I could not process your request', { language: 'en-US' });
  }
}

async function recordAudio(): Promise<string> {
  const { granted } = await Audio.requestPermissionsAsync();
  if (!granted) throw new Error('Audio permissions denied');

  const recording = new Audio.Recording();
  await recording.prepareToRecordAsync({
    android: {
      extension: '.wav',
      outputFormat: 'PCM',
      audioEncoder: 'PCM'
    },
    ios: {
      outputFormat: 'PCM',
      audioEncoder: 'linear',
      numberOfChannels: 1,
      sampleRate: 44100
    }
  });

  await recording.startAsync();
  // Let user speak for up to 10 seconds
  setTimeout(() => recording.stopAndUnloadAsync(), 10000);

  return recording.getURI() || '';
}

async function transcribeSpeech(audioUri: string): Promise<string> {
  // Use Google Cloud Speech-to-Text API
  // Or use device's built-in speech recognition
  const response = await axios.post('https://speech.googleapis.com/v1/speech:recognize', {
    config: {
      encoding: 'LINEAR16',
      languageCode: 'en-US'
    },
    audio: {
      uri: audioUri
    }
  });

  return response.data.results[0].alternatives[0].transcript;
}
```

### **Usage in React Native Component**

```typescript
// screens/VoiceQueryScreen.tsx

import { useState } from 'react';
import { View, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { queryMedicinesWithVoice } from '../services/medicineVoiceService';

export function VoiceQueryScreen({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState('');

  const handleVoiceQuery = async () => {
    setLoading(true);
    try {
      const result = await queryMedicinesWithVoice(userId);
      setResponse(result.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <TouchableOpacity
        onPress={handleVoiceQuery}
        disabled={loading}
        style={{
          backgroundColor: '#007AFF',
          paddingHorizontal: 32,
          paddingVertical: 16,
          borderRadius: 8
        }}
      >
        <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
          🎤 Ask About My Medicines
        </Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />}
      {response && <Text style={{ marginTop: 20, fontSize: 18 }}>{response}</Text>}
    </View>
  );
}
```

---

### **Kotlin (Native Android)**

```kotlin
// MedicineVoiceManager.kt

import android.content.Context
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import okhttp3.*
import org.json.JSONObject
import java.util.*

class MedicineVoiceManager(private val context: Context, private val userId: String) {
    private lateinit var speechRecognizer: SpeechRecognizer
    private lateinit var textToSpeech: TextToSpeech
    private val httpClient = OkHttpClient()
    private val apiBaseUrl = "http://your-backend-url/api"

    fun startVoiceQuery(onResponse: (String) -> Unit) {
        // Initialize TTS
        textToSpeech = TextToSpeech(context) { status ->
            if (status == TextToSpeech.SUCCESS) {
                textToSpeech.language = Locale.US
            }
        }

        // Initialize Speech Recognition
        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context)
        val recognitionListener = object : RecognitionListener {
            override fun onResults(results: Bundle?) {
                val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                val query = matches?.get(0) ?: "unknown"
                
                sendVoiceQuery(query, onResponse)
            }

            override fun onError(error: Int) {
                onResponse("Error: Could not understand. Try again.")
            }

            // Implement other listener methods...
        }

        speechRecognizer.setRecognitionListener(recognitionListener)

        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-US")
            putExtra(RecognizerIntent.EXTRA_PROMPT, "Ask about your medicines...")
        }

        speechRecognizer.startListening(intent)
    }

    private fun sendVoiceQuery(query: String, onResponse: (String) -> Unit) {
        val jsonBody = JSONObject().apply {
            put("userId", userId)
            put("query", query)
        }

        val request = Request.Builder()
            .url("$apiBaseUrl/reminder/voice-query")
            .post(RequestBody.create(MediaType.parse("application/json"), jsonBody.toString()))
            .build()

        httpClient.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                onResponse("Failed to process request")
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val responseBody = response.body?.string() ?: ""
                    val jsonResponse = JSONObject(responseBody)
                    val message = jsonResponse.getString("message")
                    
                    // Speak the response
                    textToSpeech.speak(message, TextToSpeech.QUEUE_FLUSH, null)
                    onResponse(message)
                } catch (e: Exception) {
                    onResponse("Error parsing response")
                }
            }
        })
    }

    fun destroy() {
        speechRecognizer.destroy()
        textToSpeech.shutdown()
    }
}
```

### **Usage in Android Activity**

```kotlin
// MainActivity.kt

import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle
import android.widget.Button
import android.widget.TextView

class MainActivity : AppCompatActivity() {
    private lateinit var voiceManager: MedicineVoiceManager
    private lateinit var responseText: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        responseText = findViewById(R.id.response_text)
        val voiceButton = findViewById<Button>(R.id.voice_button)

        voiceManager = MedicineVoiceManager(this, "patient-123")

        voiceButton.setOnClickListener {
            voiceManager.startVoiceQuery { response ->
                runOnUiThread {
                    responseText.text = response
                }
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        voiceManager.destroy()
    }
}
```

---

## API Endpoint Reference

### Voice Query Endpoint

**URL**: `POST /api/reminder/voice-query`

**Request Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "userId": "patient-123",
  "query": "When should I take aspirin?"
}
```

**Response**:
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
  "mode": "supabase"
}
```

---

## Permissions Required

### Android (AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.INTERNET" />
```

### React Native (App.json)
```json
{
  "plugins": [
    [
      "expo-speech",
      {
        "microphonePermission": "Allow $(PRODUCT_NAME) to access your microphone for voice queries about medicines."
      }
    ],
    [
      "@react-native-voice/voice",
      {
        "microphonePermission": "Allow $(PRODUCT_NAME) to access your microphone."
      }
    ]
  ]
}
```

---

## Testing Checklist

- [ ] Backend is running on port 3000
- [ ] Patient records are created in database
- [ ] Reminder records exist for the patient
- [ ] Voice query endpoint is accessible
- [ ] Android app can record audio
- [ ] Network calls succeed
- [ ] Text-to-speech is working
- [ ] Response is spoken back to patient

---

## Example Conversations

### Example 1: Medicine List
```
Patient: "Hey Google, what medicines am I taking?"
Backend: "You have 3 medicines. Aspirin - 500mg at 8 AM. Paracetamol - 650mg at 2 PM. Ibuprofen - 400mg at 8 PM"
```

### Example 2: Specific Medicine
```
Patient: "When should I take paracetamol?"
Backend: "Take Paracetamol 650mg at 2 PM every day."
```

### Example 3: Next Dose
```
Patient: "What's my next medicine?"
Backend: "Your next medicine is Aspirin (500mg) at 8 AM."
```

### Example 4: Schedule
```
Patient: "Show me my daily schedule"
Backend: "Your daily medicine schedule is: 8 AM: Aspirin 500mg, 2 PM: Paracetamol 650mg, 8 PM: Ibuprofen 400mg"
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "No reminders found" | Ensure patient record exists in database with medicine records |
| "Connection refused" | Check backend is running and API URL is correct |
| "Medicine not recognized" | Ensure medicine name matches exactly in database |
| "Audio permission denied" | Verify app has microphone permission in settings |
| "TTS not working" | Check device has text-to-speech engine installed |

---

## Next Steps

1. ✅ Set up your Android development environment
2. ✅ Add dependencies (okhttp3, speech-to-text)
3. ✅ Implement MedicineVoiceManager class
4. ✅ Add UI button to trigger voice query
5. ✅ Test with patient records in your database
6. ✅ Deploy backend to production URL
7. ✅ Update API_BASE_URL in app code

## Support

For issues or questions, check the main [README.md](./README.md) in the gemini-module folder.
