# Clarity — Customer Support RAG

A polished, responsive customer-support chatbot with **FastAPI + Gemini + FAISS** and a static HTML/CSS/JavaScript frontend. Designed for a single Vercel project, with no Node build or separate frontend deployment required.

## Architecture

Browser → FastAPI `/api/ask` → Gemini embedding (question) → FAISS similarity retrieval (top 3 FAQ entries) → Gemini answer generation → JSON with answer, sources, latency.

The FAQ is embedded with Gemini's `RETRIEVAL_DOCUMENT` task type; questions use `RETRIEVAL_QUERY`. The FAISS index is cached in memory per warm serverless instance and rebuilt after a cold start. Both embedding and generation calls use the same Google AI Studio API key.

## Local setup (PowerShell)

```powershell
cd customer-support-rag-vercel
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
# Edit .env and add your real Gemini API key.
pip install python-dotenv
uvicorn app:app --reload
```

**Note:** `uvicorn` does not automatically load `.env`. Either run `uvicorn app:app --reload --env-file .env` (requires `python-dotenv`) or set `$env:GEMINI_API_KEY="..."` in PowerShell. Never commit `.env`.

Open http://127.0.0.1:8000 and http://127.0.0.1:8000/api/docs.

## Deploy on Vercel

1. Push this folder to GitHub.
2. Vercel → Add New Project → Import Git Repository.
3. Set Root Directory to the repository root and Framework Preset to **FastAPI** (or let Vercel detect it).
4. Set `GEMINI_API_KEY` in Project Settings → Environment Variables. Optionally set `GEMINI_MODEL=gemini-3.5-flash-lite` and `GEMINI_EMBEDDING_MODEL=gemini-embedding-001`.
5. Deploy. Visit `/` for the frontend, `/api/health` for status, and `/api/docs` for API docs.

## Notes

- The supplied FAQ is fictional demo content; replace it with your actual policy text before a real launch.
- The model is instructed to use only FAQ context, but prompt-based grounding is not a formal hallucination guarantee. Source chips identify retrieved FAQ entries, not independently verified citations.
- Gemini embedding calls are billed/rate-limited according to your Google account. Cold starts rebuild the index; a precomputed index or external vector database is better for production scale.
- The `/api/health` endpoint checks process/configuration only, not Gemini connectivity.
- Do not store API keys in frontend code. No user chat history is stored server-side.
