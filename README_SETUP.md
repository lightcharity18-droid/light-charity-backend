# Chatbot Backend Setup Guide

## Prerequisites

1. Node.js installed on your system
2. A Groq API key (get one from https://console.groq.com/)

## Setup Instructions

1. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file in the backend directory with the following content:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/light-charity
   GROQ_API_KEY=your_groq_api_key_here
   ```

3. **Get Groq API Key**
   - Visit https://console.groq.com/
   - Sign up or log in
   - Navigate to API Keys section
   - Create a new API key
   - Copy the key and paste it in your `.env` file

4. **Start the Server**
   ```bash
   npm run dev
   ```

## API Endpoints

### Chatbot Endpoints

- `POST /api/chatbot/chat` - Non-streaming chat (recommended for frontend)
- `POST /api/chatbot/chat/stream` - Streaming chat (for real-time responses)
- `GET /api/chatbot/health` - Health check endpoint

### Request Format

```json
{
  "message": "Hello, how can I donate blood?",
  "messages": [
    {
      "content": "Previous message content",
      "sender": "user"
    }
  ]
}
```

### Response Format

```json
{
  "success": true,
  "response": "AI generated response",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Testing

You can test the chatbot API using curl:

```bash
curl -X POST http://localhost:5000/api/chatbot/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, I want to donate blood"}'
```

## Notes

- The chatbot is configured specifically for blood donation assistance
- The system prompt is optimized for Light Charity's use case
- The frontend has fallback functionality if the backend is unavailable
- Make sure MongoDB is running if you're using other features of the app 