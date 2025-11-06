# IBM Granite Integration via Hugging Face

This application now uses IBM Granite models from Hugging Face for AI-powered financial advice - **no API keys required!**

## How It Works

1. **Primary Model**: Uses `ibm-granite/granite-3.3-8b-instruct` from Hugging Face
2. **Fallback Model**: Uses `microsoft/Phi-3-mini-4k-instruct` if Granite is unavailable
3. **Rule-based Fallback**: Falls back to comprehensive rule-based system if Hugging Face API is unavailable

## Setup

### Option 1: No Setup (Default)
- Works out of the box using Hugging Face's public Inference API
- No API keys needed
- May have rate limits (30 requests/minute for free tier)

### Option 2: Optional Token (Better Rate Limits)
1. Get a free token from: https://huggingface.co/settings/tokens
2. Create a `.env` file in the project root:
   ```
   VITE_HF_TOKEN=your_token_here
   ```
3. Restart the dev server

## Features

- ✅ **No API Keys Required** - Works with public Hugging Face API
- ✅ **Intelligent Fallbacks** - Multiple fallback options ensure reliability
- ✅ **Context-Aware** - Uses user profile, financial data, and conversation history
- ✅ **Personalized** - Adapts tone and complexity based on user demographics
- ✅ **Comprehensive** - Answers any finance-related question

## How Responses Work

1. **First**: Tries IBM Granite model with full context
2. **If unavailable**: Tries fallback model (Phi-3)
3. **If both unavailable**: Uses comprehensive rule-based system with 50+ financial terms

## Models Used

- **Primary**: `ibm-granite/granite-3.3-8b-instruct` (IBM Granite)
- **Fallback**: `microsoft/Phi-3-mini-4k-instruct` (Microsoft Phi-3)

Both models are free and open-source, available on Hugging Face.

## Troubleshooting

If you see rate limit errors:
- Wait a few seconds and try again
- Add a Hugging Face token (optional, free)
- The system will automatically fall back to the rule-based system

The application will always provide helpful responses even if the AI models are temporarily unavailable.

