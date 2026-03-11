from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from google import genai
from google.genai import types
import os, json
from dotenv import load_dotenv

load_dotenv()

# ============================================================
# 🔧 CONSTANTS — Change models here in ONE place!
# ============================================================
GEMINI_API_KEY      = os.getenv("GEMINI_API_KEY")
MODEL_STORY         = "gemini-3-flash-preview"                        # For story + quiz text
MODEL_IMAGE         = "gemini-2.5-flash-image" # For illustrations
APP_NAME            = "IllumiLearn"
APP_TAGLINE         = "Illuminate Every Concept"
STORY_PAGES         = 6
QUIZ_QUESTIONS      = 3
TARGET_AGE          = "6-12"
# ============================================================

# ── Setup ────────────────────────────────────────────────────
app = FastAPI()
client = genai.Client(api_key=GEMINI_API_KEY)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class TopicRequest(BaseModel):
    topic: str

# ── Health check ─────────────────────────────────────────────
@app.get("/")
def read_root():
    return {
        "status": f"{APP_NAME} Agent is running! 📚",
        "models": {
            "story": MODEL_STORY,
            "image": MODEL_IMAGE,
        }
    }

# ── Main Agent Endpoint ──────────────────────────────────────
@app.post("/generate-story")
async def generate_story(request: TopicRequest):
    topic = request.topic

    prompt = f"""
You are a creative educational storyteller agent for "{APP_NAME}".
Tagline: "{APP_TAGLINE}"
Create a {STORY_PAGES}-page illustrated storybook for kids aged {TARGET_AGE} about: "{topic}"

For each page:
1. Write a fun page title
2. Write 2-3 sentences of story text that teaches the concept through fun characters
3. Write a short image description for illustration
4. Add exactly 3 relevant emojis as illustration field

After all {STORY_PAGES} pages, create {QUIZ_QUESTIONS} multiple choice quiz questions for kids.
Each quiz question must have 4 options and the index (0-3) of the correct answer.

Return ONLY valid JSON with this exact structure, no extra text:
{{
  "pages": [
    {{
      "title": "Page title here",
      "text": "Story text here",
      "illustration": "🌱🌿🍃",
      "imagePrompt": "Detailed description for illustration"
    }}
  ],
  "quiz": [
    {{
      "question": "Question here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0
    }}
  ]
}}
"""

    async def stream_storybook():
        try:
            # ── Step 1: Generate story + quiz ────────────────
            yield json.dumps({"type": "status", "message": "🔍 Understanding your topic..."}) + "\n"

            response = client.models.generate_content(
                model=MODEL_STORY,   # ← uses constant
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.8,
                    max_output_tokens=4096,
                )
            )

            story_data = json.loads(response.text)
            pages = story_data.get("pages", [])
            quiz  = story_data.get("quiz", [])

            yield json.dumps({"type": "status", "message": "✍️ Story crafted! Generating illustrations..."}) + "\n"

            # ── Step 2: Generate image for each page ─────────
            result_pages = []
            for i, page in enumerate(pages):
                yield json.dumps({
                    "type": "status",
                    "message": f"🎨 Painting illustration {i+1} of {len(pages)}..."
                }) + "\n"

                image_prompt = f"""
Create a vibrant, friendly, children's book style illustration.
App: {APP_NAME} — {APP_TAGLINE}
Topic: {topic}
Scene: {page.get('title', '')}. {page.get('imagePrompt', page.get('text', ''))}
Style: Colorful watercolor, cartoon, friendly characters, safe for kids aged {TARGET_AGE}.
"""
                try:
                    img_response = client.models.generate_content(
                        model=MODEL_IMAGE,   # ← uses constant
                        contents=image_prompt,
                        config=types.GenerateContentConfig(
                            response_modalities=["IMAGE", "TEXT"],
                        )
                    )

                    image_data = ""
                    for part in img_response.candidates[0].content.parts:
                        if part.inline_data:
                            image_data = f"data:{part.inline_data.mime_type};base64,{part.inline_data.data}"
                            break

                    result_pages.append({
                        "title":        page["title"],
                        "text":         page["text"],
                        "illustration": page.get("illustration", "🎨✨📖"),
                        "imageUrl":     image_data,
                    })

                except Exception as img_err:
                    print(f"⚠️ Image failed for page {i+1}: {img_err}")
                    result_pages.append({
                        "title":        page["title"],
                        "text":         page["text"],
                        "illustration": page.get("illustration", "🎨✨📖"),
                        "imageUrl":     "",
                    })

                # ✅ Stream each page as it's ready — INTERLEAVED output!
                yield json.dumps({
                    "type":       "page",
                    "page":       result_pages[-1],
                    "pageNumber": i + 1,
                    "totalPages": len(pages),
                }) + "\n"

            # ── Step 3: Stream quiz ───────────────────────────
            yield json.dumps({"type": "status", "message": "🧠 Creating quiz questions..."}) + "\n"
            yield json.dumps({"type": "quiz", "quiz": quiz}) + "\n"

            # ── Step 4: Done! ─────────────────────────────────
            yield json.dumps({"type": "complete", "message": "📚 Your storybook is ready!"}) + "\n"

        except Exception as e:
            yield json.dumps({"type": "error", "message": str(e)}) + "\n"

    return StreamingResponse(
        stream_storybook(),
        media_type="text/plain",
        headers={"X-Content-Type-Options": "nosniff"}
    )

# ── Run ──────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)