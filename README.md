# 📚 IllumiLearn — AI-Powered Educational Storybook

> **Illuminate Every Concept, One Story at a Time**

[![Google Gemini](https://img.shields.io/badge/Powered%20by-Gemini%20AI-blue?style=for-the-badge&logo=google)](https://ai.google.dev)
[![Google Cloud](https://img.shields.io/badge/Hosted%20on-Google%20Cloud-orange?style=for-the-badge&logo=googlecloud)](https://cloud.google.com)
[![React](https://img.shields.io/badge/Frontend-React%20+%20TypeScript-61dafb?style=for-the-badge&logo=react)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20+%20Python-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)

---

## 🌟 What is IllumiLearn?

IllumiLearn is an **AI-powered interactive storybook generator** that helps kids aged 6-12 learn educational concepts through beautiful, personalized stories with AI-generated illustrations and quizzes.

Kids simply type any topic → Gemini AI creates a **6-page illustrated storybook** → followed by a **quiz** to test what they learned!

---

## ✨ Features

- 📖 **AI Storybook Generation** — 6-page personalized stories on any educational topic
- 🎨 **AI Illustrations** — Gemini generates colorful child-friendly images for every page
- 🧠 **Interactive Quiz** — 3 questions after each story to reinforce learning
- 🌊 **Live Streaming** — Pages appear one by one as Gemini generates them (interleaved output!)
- 🎨 **Beautiful UI** — Colorful storybook interface with page-flip animations
- 📱 **Responsive** — Works on desktop and mobile

---

## 🏗️ Architecture

```
React UI (Firebase Hosting)
        ↕ HTTP Stream
Python Agent (Google Cloud Run)
        ↕ Gemini API
Gemini 1.5 Flash (Story + Quiz)
Gemini Image Generation (Illustrations)
```

See full architecture diagram in `/architecture.html`

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript + Vite |
| Backend Agent | Python + FastAPI |
| AI Model | Gemini 1.5 Flash |
| Image Generation | Gemini Image Generation |
| Frontend Hosting | Firebase Hosting |
| Backend Hosting | Google Cloud Run |
| Security | Google Secret Manager |

---

## 🚀 How to Run Locally

### Prerequisites
- Node.js v20+
- Python 3.12+
- Gemini API key from [Google AI Studio](https://aistudio.google.com)

### 1. Clone the repo
```bash
git clone https://github.com/YOURUSERNAME/illumilearn.git
cd illumilearn
```

### 2. Setup Frontend
```bash
npm install
```

### 3. Setup Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate       # Windows
source venv/bin/activate    # Mac/Linux
pip install -r requirements.txt
```

### 4. Add your API key
Create `backend/.env`:
```
GEMINI_API_KEY=your_gemini_api_key_here
```

### 5. Run both servers

**Terminal 1 — Backend:**
```bash
cd backend
venv\Scripts\activate
python main.py
```
Agent running at `http://localhost:8000` ✅

**Terminal 2 — Frontend:**
```bash
npm run dev
```
App running at `http://localhost:3000` ✅

---

## ☁️ Google Cloud Deployment

### Deploy Backend to Cloud Run
```bash
cd backend
gcloud run deploy illumilearn-agent \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your_key_here
```

### Deploy Frontend to Firebase
```bash
npm run build
firebase deploy
```

---

## 🎯 Hackathon

Built for the **Google Gemini Live Agent Challenge 2026**
- Track: Creative Storyteller ✍️
- Uses: Gemini interleaved/mixed output
- Hosted on: Google Cloud Run + Firebase

---

## 📁 Project Structure

```
illumilearn/
├── src/
│   ├── App.tsx                 # Main React app
│   ├── services/
│   │   └── geminiService.ts    # Agent API calls
│   ├── types.ts                # TypeScript types
│   └── constants.ts            # App constants
├── backend/
│   ├── main.py                 # FastAPI agent
│   ├── requirements.txt        # Python packages
│   └── .env                    # API keys (not in repo!)
├── architecture.html           # Architecture diagram
└── README.md
```

---

## 👨‍💻 Made with ❤️ using Gemini AI + Google Cloud