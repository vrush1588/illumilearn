import { StoryPage, QuizQuestion } from "../types";

// ── Agent URL ────────────────────────────────────────────────
// const AGENT_URL = process.env.REACT_APP_AGENT_URL || "http://localhost:8000";

const AGENT_URL = process.env.REACT_APP_AGENT_URL || "https://illumilearn-agent-1011177533066.us-central1.run.app";

// ── Types for streaming ──────────────────────────────────────
export interface StreamUpdate {
  type: "status" | "cover" | "page" | "quiz" | "complete" | "error";
  message?: string;
  coverUrl?: string;
  topic?: string;
  page?: StoryPage;
  pageNumber?: number;
  totalPages?: number;
  quiz?: QuizQuestion[];
}

// ── Main Agent Call ──────────────────────────────────────────
export async function generateStorybookStream(
  topic: string,
  onUpdate: (update: StreamUpdate) => void
): Promise<void> {
  console.log(AGENT_URL);
  const response = await fetch(`${AGENT_URL}/generate-story`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic }),
  });

  if (!response.ok) {
    throw new Error(`Agent error: ${response.status}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n").filter(line => line.trim());

    for (const line of lines) {
      try {
        const update: StreamUpdate = JSON.parse(line);

        // 🔍 DEBUG LOG
        console.log("📦 Update:", update.type,
          update.type === "cover"  ? `coverUrl length: ${update.coverUrl?.length}, hasImage: ${!!update.coverUrl}` :
          update.type === "page"   ? `page: ${update.page?.title}` :
          update.type === "error"  ? `❌ ${update.message}` :
          update.message || "");

        onUpdate(update);
      } catch (e) {
        console.warn("⚠️ Failed to parse line:", line, e);
      }
    }
  }
}