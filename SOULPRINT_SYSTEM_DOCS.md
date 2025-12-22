# SoulPrint & Vibe Code System Architecture

## 1. Overview
The SoulPrint system is a psychological profiling engine designed to capture not just *who* a user is, but *how* they move through the world. It combines explicit user responses (text/sliders) with implicit behavioral signals (voice prosody/cadence) to generate a "SoulPrint"—a structured identity profile that an AI can embody.

## 2. User Flow

1.  **Authentication:** User logs in via Google (Supabase Auth).
2.  **Questionnaire:** User progresses through a gamified interface ("The Terminal") answering questions across 6 psychological pillars.
    *   **Input Types:**
        *   **Sliders:** 0-100 scale (e.g., "Defend your stance" vs "Engage discussion").
        *   **Text:** Open-ended responses.
        *   **Voice:** Audio recordings answering specific prompts.
3.  **Vibe Code Analysis:** While the user speaks, their audio is analyzed for "Vibe Code" metrics (prosody, cadence, energy).
4.  **Synthesis:** Once all data is collected, it is sent to the SoulPrint Synthesis Engine (Gemini).
5.  **Generation:** The system generates a JSON SoulPrint profile.
6.  **Storage:** The profile is saved to Supabase.
7.  **Activation:** The user can interact with their SoulPrint (or an AI embodying it) in the Dashboard.

## 3. Inputs

The system collects data across **6 Psychological Pillars**:
1.  **Communication Style:** How the user speaks and listens.
2.  **Emotional Alignment:** How the user processes and shows emotion.
3.  **Decision-Making & Risk:** How the user chooses under pressure.
4.  **Social & Cultural Identity:** Belonging, code-switching, and cultural anchors.
5.  **Cognitive Processing:** Learning style and sense-making.
6.  **Assertiveness & Conflict:** How the user handles tension and boundaries.

### Data Types
*   **Slider Values (0-100):** Mapped to semantic meanings:
    *   `0-15`: Anchored Left (Core Identity)
    *   `16-35`: Leaning Left (Default Mode)
    *   `36-65`: Adaptive (Context Dependent)
    *   `66-85`: Leaning Right (Default Mode)
    *   `86-100`: Anchored Right (Core Identity)
*   **Text Responses:** Analyzed for sentiment, keywords, and linguistic patterns.
*   **Audio Recordings:** Source for Vibe Code analysis.

## 4. Vibe Code (Voice Analysis)

The "Vibe Code" is the system's ability to read *how* something is said. It uses a hybrid approach:

### Frontend Analysis (`voice-analyzer-v2.ts`)
*   **Cadence Metrics:**
    *   **Tempo:** Words per minute, syllables per second.
    *   **Pauses:** Frequency, duration, and placement of silence.
    *   **Rhythm:** Consistency of speech patterns.
*   **Energy Dynamics:**
    *   **Volume:** Average energy, peak moments.
    *   **Variance:** Dynamic range (monotone vs. expressive).

### Backend Analysis (`run_prosody.py`)
*   **Pitch Tracking:** Fundamental frequency (F0) analysis using Praat/Parselmouth.
*   **Spectral Features:** Deeper acoustic analysis for emotional coloring.

### Output: Emotional Signature Curve
The system generates a "Curve" describing the user's presence:
*   `averageTempo`: slow | measured | moderate | brisk | rapid
*   `pausePattern`: minimal | natural | deliberate | frequent | hesitant
*   `energyProfile`: subdued | even | dynamic | intense
*   `confidenceLevel`: uncertain | tentative | grounded | assertive

## 5. SoulPrint Generation (The "Brain")

The **SoulPrint Synthesis Engine** (powered by Gemini) takes all inputs and applies the **Imprint Architecture Protocol**.

### System Prompt Logic
The AI is instructed to:
1.  **Interpret Sliders:** Convert numerical values into behavioral traits based on the semantic mapping.
2.  **Synthesize Pillars:** Combine text, slider, and voice data for each of the 6 pillars.
3.  **Identify Archetype:** Assign a 2-4 word identity label (e.g., "Strategic Diplomat").
4.  **Draft Instructions:** Create specific instructions for *other* AIs on how to interact with this user.

## 6. Outputs (The SoulPrint JSON)

The final output is a structured JSON object stored in Supabase.

```json
{
  "soulprint_version": "2.0",
  "generated_at": "ISO timestamp",
  "identity_signature": "The felt sense of the person.",
  "archetype": "Identity Label",
  "pillars": {
    "communication_style": {
      "summary": "...",
      "voice_markers": ["...", "..."],
      "ai_instruction": "How to speak TO this person."
    },
    // ... other 5 pillars
  },
  "flinch_warnings": ["Triggers to avoid"],
  "full_system_prompt": "A comprehensive prompt for an AI to BECOME this person."
}
```

### Usage
*   **AI Persona:** The `full_system_prompt` allows any LLM to "become" the user.
*   **Personalized UX:** The UI can adapt based on `ai_instruction` (e.g., faster pacing for "brisk" users).
*   **Matching:** Users can be matched based on compatible SoulPrints.
