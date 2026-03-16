from google import genai
from google.genai import types
import os, base64
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY_IMAGE") or os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=API_KEY)

models_to_try = [
    "gemini-2.5-flash-image",
]

prompt = "A colorful children's book cover about solar system. Cartoon style. No text."

for model in models_to_try:
    print(f"\nTesting: {model}")
    try:
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE", "TEXT"],
            )
        )
        got_image = False
        for part in response.candidates[0].content.parts:
            if hasattr(part, "inline_data") and part.inline_data and part.inline_data.data:
                img_bytes = part.inline_data.data
                b64 = base64.b64encode(img_bytes).decode()
                
                # Save image file
                filename = f"test_cover.png"
                with open(filename, "wb") as f:
                    f.write(img_bytes)
                
                print(f"✅ SUCCESS!")
                print(f"   Image size: {len(img_bytes)} bytes")
                print(f"   Base64 length: {len(b64)} chars")
                print(f"   Base64 preview: data:image/png;base64,{b64[:50]}...")
                print(f"   Saved to: {filename} — open to verify!")
                got_image = True
                break

        if not got_image:
            print(f"⚠️ No inline_data found in response!")
            print(f"   Parts count: {len(response.candidates[0].content.parts)}")
            for i, part in enumerate(response.candidates[0].content.parts):
                print(f"   Part {i}: {type(part)} — {dir(part)}")

    except Exception as e:
        print(f"❌ Error: {str(e)[:200]}")

print("\nDone!")