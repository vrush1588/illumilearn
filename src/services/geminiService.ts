import { StoryPage, QuizQuestion } from "../types";

// ── Agent URL ────────────────────────────────────────────────
// During development: points to your local Python agent
// After deployment: points to Google Cloud Run URL
const AGENT_URL = process.env.REACT_APP_AGENT_URL || "http://localhost:8000";

// ── Types for streaming ──────────────────────────────────────
export interface StreamUpdate {
  type: "status" | "page" | "quiz" | "complete" | "error";
  message?: string;
  page?: StoryPage;
  pageNumber?: number;
  totalPages?: number;
  quiz?: QuizQuestion[];
}

// ── Main Agent Call (Interleaved Streaming) ──────────────────
// This function calls the Python agent and reads the
// STREAMING response — this is the INTERLEAVED output!
// Pages arrive one by one as Gemini generates them.
export async function generateStorybookStream(
  topic: string,
  onUpdate: (update: StreamUpdate) => void
): Promise<void> {

  const response = await fetch(`${AGENT_URL}/generate-story`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic }),
  });

  if (!response.ok) {
    throw new Error(`Agent error: ${response.status}`);
  }

  // Read the stream line by line
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    // Decode the chunk and split by newlines
    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n").filter(line => line.trim());

    for (const line of lines) {
      try {
        const update: StreamUpdate = JSON.parse(line);
        onUpdate(update);
      } catch {
        // Skip invalid lines
      }
    }
  }
}

// ── Fallback: direct Gemini calls ────────────────────────────
export async function generateStorybook(topic: string): Promise<StoryPage[]> {
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `Generate a 6-page educational storybook for kids aged 6-12 about: "${topic}".
Each page must have a fun title, 2-3 sentences of story teaching through fun characters, and 3 emojis.
Return ONLY valid JSON array of exactly 6 objects, no markdown, no backticks.`,
    config: {
      systemInstruction: "You are a children's educator for IllumiLearn. Return ONLY valid JSON array.",
      responseMimeType: "application/json",
    },
  });

  const raw = response.text?.trim() ?? "";
  const clean = raw.replace(/```json|```/g, "").trim();
  try { return JSON.parse(clean); }
  catch { throw new Error("Could not read the story. Please try again! 🔄"); }
}