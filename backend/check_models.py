from google import genai
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY_TEXT") # or os.getenv("GEMINI_API_KEY")

client = genai.Client(api_key=API_KEY)

print("\n🔍 ALL available models:\n")
for m in client.models.list():
    print(f"  {m.name}")

print("\n🎨 Image-related models:\n")
for m in client.models.list():
    if any(x in m.name.lower() for x in ["image", "imagen", "vision"]):
        print(f"  ✅ {m.name}")

print("\n✅ Done!")
