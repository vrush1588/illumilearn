from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from google import genai
from google.genai import types
import os, json, re, base64, io, asyncio
from PIL import Image
from dotenv import load_dotenv

load_dotenv()

# ============================================================
# 🔧 CONSTANTS
# ============================================================

GEMINI_API_KEY_IMAGE = os.getenv("GEMINI_API_KEY_IMAGE")
GEMINI_API_KEY_TEXT  = os.getenv("GEMINI_API_KEY_TEXT")

MODEL_STORY = "gemini-3-flash-preview"
MODEL_IMAGE = "gemini-2.5-flash-image"

APP_NAME    = "IllumiLearn"
APP_TAGLINE = "Illuminate Every Concept"

STORY_PAGES = 6
TARGET_AGE  = "6-12"

# ============================================================
# 🧪 DEV MODE (Prevents image API quota usage)
# ============================================================

DEV_MODE = True

def log(msg: str):
    print(msg)

BASE64_FILE = "cover_base64.txt"  # default fallback

# ── Smart cover picker by topic first letter ─────────────────
def get_cover_file(topic: str) -> str:
    first = topic.strip()[0].lower() if topic.strip() else "d"
    filename = f"cover_base64_{first}.txt"
    if os.path.exists(filename):
        return filename
    return BASE64_FILE  # fallback to default


# ============================================================

client_text  = genai.Client(api_key=GEMINI_API_KEY_TEXT)
client_image = genai.Client(api_key=GEMINI_API_KEY_IMAGE)

app = FastAPI()



app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================

class TopicRequest(BaseModel):
    topic: str

# ============================================================

def clean_json(text: str) -> str:
    return re.sub(r"```json\s?|\s?```", "", text).strip()

# ============================================================

def compress_image(image_bytes: bytes, max_size: int = 250, quality: int = 75) -> str:
    """Compress image to JPEG and return base64 string"""
    try:
        img = Image.open(io.BytesIO(image_bytes))
        # Convert to RGB if needed (PNG with alpha channel)
        if img.mode in ("RGBA", "P", "LA"):
            img = img.convert("RGB")
        img.thumbnail((max_size, max_size), Image.LANCZOS)
        output = io.BytesIO()
        img.save(output, format='JPEG', quality=quality, optimize=True)
        compressed = output.getvalue()
        return f"data:image/jpeg;base64,{base64.b64encode(compressed).decode()}"
    except Exception as e:
        print(f"❌ Compression failed: {e}")
        # Return original without compression as fallback
        return f"data:image/png;base64,{base64.b64encode(image_bytes).decode()}"

def get_cover_prompt(topic: str) -> str:

    topic_lower = topic.lower()

    if any(w in topic_lower for w in ["math", "number", "algebra", "geometry"]):
        theme = "colorful numbers, geometric shapes, calculator, math symbols"

    elif any(w in topic_lower for w in ["science", "chemistry", "atom", "lab"]):
        theme = "bubbling test tubes, atoms, microscope, colorful reactions"

    elif any(w in topic_lower for w in ["space", "planet", "star", "galaxy", "rocket"]):
        theme = "colorful planets, stars, rocket ship, astronaut in space"

    elif any(w in topic_lower for w in ["animal", "nature", "forest", "ocean"]):
        theme = "friendly animals in colorful nature, trees, flowers"

    elif any(w in topic_lower for w in ["history", "ancient", "egypt", "rome"]):
        theme = "ancient ruins, historical maps, scrolls, timeline"

    elif any(w in topic_lower for w in ["computer", "coding", "robot", "ai"]):
        theme = "friendly robot, glowing computer, colorful code, circuits"

    elif any(w in topic_lower for w in ["volcano", "earthquake", "weather", "earth"]):
        theme = "dramatic volcano, colorful earth layers, weather patterns"

    elif any(w in topic_lower for w in ["body", "human", "biology", "heart", "brain"]):
        theme = "colorful human body, heart, brain, cells"

    else:
        theme = f"magical educational world about {topic}, colorful and exciting"

    return f"""
Children's book cover about {topic}.
Theme: {theme}.
Bright watercolor cartoon style.
Child friendly ages {TARGET_AGE}.
No text in image.
"""

# ============================================================

@app.get("/")
def read_root():
    return {
        "status": f"{APP_NAME} running! 📚",
        "story_model": MODEL_STORY,
        "image_model": MODEL_IMAGE
    }

# ============================================================

@app.post("/generate-story")
async def generate_story(request: TopicRequest):

    topic = request.topic

    story_prompt = f"""
You are a creative educational storyteller for "{APP_NAME}" — "{APP_TAGLINE}".

Create a {STORY_PAGES}-page storybook for kids aged {TARGET_AGE}
about: "{topic}"

For each page:
1. A fun page title
2. 2-3 sentences teaching the concept through fun characters
3. Exactly 3 emojis as illustration

After pages, create 3 quiz questions.

Return ONLY valid JSON:

{{
  "pages": [
    {{
      "title": "string",
      "text": "string",
      "illustration": "🌱🌿🍃"
    }}
  ],
  "quiz": [
    {{
      "question": "string",
      "options": ["A","B","C","D"],
      "correct": 0
    }}
  ]
}}
"""

    async def stream_storybook():

        try:

            # ==================================================
            # STEP 1 — COVER IMAGE
            # ==================================================

            yield json.dumps({
                "type": "status",
                "message": "🎨 Designing book cover..."
            }) + "\n"

            cover_url = ""

            # DEV MODE → skip Gemini image API
            if DEV_MODE:
                cover_file = get_cover_file(topic)
                if os.path.exists(cover_file):
                    with open(cover_file, "r") as f:
                        saved_b64 = f.read().strip()
                    saved_b64 = saved_b64.replace("\n", "").replace("\r", "").strip()
                    cover_url = f"data:image/jpeg;base64,{saved_b64}"
                    #log(f"🧪 DEV MODE: Loaded cover from {cover_file} ✅")
                else:
                    cover_url = ""
                    print(f"⚠️ DEV MODE: {cover_file} not found!")

            else:

                try:

                    img_response = await asyncio.to_thread(
                        client_image.models.generate_content,
                        model=MODEL_IMAGE,
                        contents=get_cover_prompt(topic),
                        config=types.GenerateContentConfig(
                            response_modalities=["IMAGE"],
                        )
                    )

                    got_image = False

                    cover_parts = (
                        img_response.candidates[0].content.parts
                        if img_response.candidates else []
                    )

                    for part in cover_parts:

                        if hasattr(part, "inline_data") and part.inline_data and part.inline_data.data:

                            image_bytes = part.inline_data.data

                            # ✅ Compress image before sending!
                            cover_url = compress_image(image_bytes)

                            # ⭐ Save compressed base64 to file for DEV mode
                            compressed_b64 = cover_url.split(",")[1]
                            with open(BASE64_FILE, "w") as f:
                                f.write(compressed_b64)
                            #log("💾 Compressed base64 saved to cover_base64.txt")

                            got_image = True
                            break


                    if not got_image:
                        print("⚠️ No image returned — using emoji cover")

                except Exception as img_err:

                    print(f"⚠️ Cover generation failed: {img_err}")

                    cover_url = ""

            # Send cover to frontend
            yield json.dumps({
                "type": "cover",
                "coverUrl": cover_url,
                "topic": topic
            }) + "\n"

           

            # ==================================================
            # STEP 2 — GENERATE STORY
            # ==================================================

            yield json.dumps({
                "type": "status",
                "message": "✍️ Writing your story..."
            }) + "\n"
            
             # ⏳ Small delay so frontend renders cover before story starts
            await asyncio.sleep(1.0)  # Adjusted to 1.0s for faster transition

            response =await asyncio.to_thread(
                client_text.models.generate_content,
                model=MODEL_STORY,
                contents=story_prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.8,
                    max_output_tokens=4096,
                )
            )

            

            try:
                story_data = json.loads(clean_json(response.text))
            except json.JSONDecodeError as e:  # Fixed: Added 'as e' to define the exception variable
                print("❌ STORY ERROR:", e)
                yield json.dumps({
                    "type": "error",
                    "message": f"Story generation failed: {str(e)}"
                }) + "\n"
                return

            pages = story_data.get("pages", [])
            quiz  = story_data.get("quiz", [])
            

            # ==================================================
            # STEP 3 — STREAM PAGES
            # ==================================================

            yield json.dumps({
                "type": "status",
                "message": "📖 Preparing pages..."
            }) + "\n"

            for i, page in enumerate(pages):

                yield json.dumps({

                    "type": "page",

                    "page": {
                        "title": page.get("title", f"Page {i+1}"),
                        "text": page.get("text", ""),
                        "illustration": page.get("illustration", "📖✨🌟"),
                        "imageUrl": ""
                    },

                    "pageNumber": i + 1,
                    "totalPages": len(pages)

                }) + "\n"


            # ==================================================
            # STEP 4 — QUIZ
            # ==================================================

            yield json.dumps({
                "type": "status",
                "message": "🧠 Creating quiz..."
            }) + "\n"

            yield json.dumps({
                "type": "quiz",
                "quiz": quiz
            }) + "\n"

            yield json.dumps({
                "type": "complete",
                "message": "📚 Your storybook is ready!"
            }) + "\n"

        except Exception as e:

            print("❌ Unexpected error:", e)

            yield json.dumps({
                "type": "error",
                "message": f"❌ Something went wrong: {str(e)[:100]}"
            }) + "\n"

    return StreamingResponse(
        stream_storybook(),
        media_type="text/plain",
        headers={"X-Content-Type-Options": "nosniff"}
    )

# ============================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)