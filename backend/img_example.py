from google import genai
from google.genai import types
# from PIL import Image

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from google import genai
from google.genai import types
import os, json, re, base64
from dotenv import load_dotenv

load_dotenv()

# ============================================================
# 🔧 CONSTANTS — Change in ONE place!
# ============================================================
GEMINI_API_KEY_IMAGE = os.getenv("GEMINI_API_KEY_IMAGE")
client_image = genai.Client(api_key=GEMINI_API_KEY_IMAGE)
client = genai.Client(api_key=GEMINI_API_KEY_IMAGE)

prompt = ("Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme")
response = client.models.generate_content(
    model="gemini-3.1-flash-image-preview",
    contents=[prompt],
)

for part in response.parts:
    if part.text is not None:
        print(part.text)
    elif part.inline_data is not None:
        image = part.as_image()
        image.save("generated_image.png")