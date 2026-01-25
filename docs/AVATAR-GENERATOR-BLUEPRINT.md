# SoulPrint AI Avatar Generator - Blueprint

## Overview
Generate unique AI profile pictures based on each user's SoulPrint personality data using kie.ai image generation APIs (Ideogram or Flux-2).

## Status: PARTIALLY IMPLEMENTED (Not Tested)

---

## Files Created

### 1. API Route: `/app/api/generate-avatar/route.ts`
Handles three actions:
- `generate-prompt`: Uses OpenAI to analyze soulprint data and create an image prompt
- `generate-image`: Sends prompt to kie.ai (Ideogram or Flux-2) and polls for result
- `save-avatar`: Downloads generated image, uploads to Supabase storage, updates user profile

### 2. Component: `/components/avatar/AvatarGenerator.tsx`
React component with these states:
- idle → Show "Generate Avatar" button
- generating-prompt → Loading while LLM creates prompt
- editing-prompt → User can edit the prompt before generating
- generating-image → Loading while kie.ai creates image (30-60 sec)
- preview → Show generated image with "Use This" or "Regenerate" options
- saving → Saving to profile

### 3. Test Page: `/app/test-avatar/page.tsx`
Test page to try the avatar generator with existing soulprints.

### 4. Integration: `/app/questionnaire/complete/page.tsx`
Modified to show avatar generator after user names their SoulPrint.

---

## Environment Variables
```
KIE_API_KEY=your_kie_api_key
```
Get your API key from the KIE.AI dashboard and add to `.env.local`.

---

## How It Works

### Flow:
1. User completes questionnaire → SoulPrint generated
2. User names their SoulPrint
3. Avatar Generator appears
4. Click "Generate Avatar" → LLM analyzes personality and creates image prompt
5. User can EDIT the prompt to customize
6. Choose model: Ideogram (artistic) or Flux-2 (photorealistic)
7. Click "Generate Image" → kie.ai creates the image
8. Preview → Accept or Regenerate
9. Save → Image uploaded to Supabase, set as profile avatar

### Prompt Generation Logic:
The LLM analyzes these SoulPrint fields:
- Archetype (e.g., "Visionary Maverick")
- Identity Signature
- 6 Pillars (communication, emotional, decision, social, cognitive, conflict)
- Voice Vectors (cadence, warmth, structure)
- Flinch Warnings

Then creates an abstract art prompt matching:
- Color palette based on personality warmth
- Patterns based on cognitive style (geometric vs organic)
- Mood based on assertiveness
- NO human faces - abstract only

---

## TODO To Complete

1. **Test the full flow** - Start dev server, go to /test-avatar, generate an image
2. **Refine the prompt template** - Once you approve a good prompt, update the LLM instructions
3. **Add Supabase Storage bucket** - Create "soulprint-assets" bucket if it doesn't exist
4. **Handle edge cases** - Timeout, failed generation, rate limits

---

## API Reference (kie.ai)

### Create Task
```
POST https://api.kie.ai/api/v1/jobs/createTask
Authorization: Bearer <KIE_API_KEY>

// Ideogram
{
  "model": "ideogram/v3-text-to-image",
  "input": {
    "prompt": "...",
    "image_size": "square_hd",
    "style": "AUTO"
  }
}

// Flux-2
{
  "model": "flux-2/pro-text-to-image",
  "input": {
    "prompt": "...",
    "aspect_ratio": "1:1",
    "resolution": "1K"
  }
}
```

### Query Task
```
GET https://api.kie.ai/api/v1/jobs/recordInfo?taskId={taskId}
Authorization: Bearer <KIE_API_KEY>
```

---

## When You're Ready to Test

1. Start dev server: `npm run dev -- -p 3000`
2. Log in with your dev account (configure DEV_LOGIN_EMAIL in .env.local)
3. Go to http://localhost:3000/test-avatar
4. Select "Visionary Maverick" soulprint
5. Click "Generate Avatar"
6. Edit the prompt as desired
7. Generate image and evaluate

Once you find a prompt style you like, let me know and I'll update the LLM instructions to use that as the template!
