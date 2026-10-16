import os
from pathlib import Path
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="Karbar AI API", version="0.1.0")
origins = [x.strip() for x in os.getenv("CORS_ORIGINS", "*").split(",") if x.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins or ["*"], allow_credentials=False,
                   allow_methods=["GET", "POST", "OPTIONS"], allow_headers=["*"])

class ChatInput(BaseModel):
    message: str = Field(min_length=1, max_length=12000)
    country: str = Field(default="Afghanistan", max_length=80)
    language: str = Field(default="fa", max_length=20)
    business_type: str | None = Field(default=None, max_length=100)

@app.get("/api/health")
def health():
    return {"ok": True, "app": "Karbar AI"}

@app.post("/api/chat")
async def chat(body: ChatInput):
    key = os.getenv("GROQ_API_KEY", "").strip()
    if not key:
        return {"demo": True, "reply": "سرور آماده است، اما کلید GROQ_API_KEY هنوز در تنظیمات محرمانهٔ Render ثبت نشده است. کلید را فقط در Environment سرویس API قرار بده، نه در سایت یا چت."}
    model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b").strip()
    system = ("You are Karbar AI, a practical business assistant for Afghanistan and Türkiye. "
              "Reply in the requested language. Do not claim tools were run if they were not. "
              f"Country: {body.country}; language: {body.language}; business: {body.business_type or 'general'}.")
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post("https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                json={"model": model, "messages": [{"role":"system","content":system},
                      {"role":"user","content":body.message}], "temperature":0.6})
        if r.status_code >= 400:
            raise HTTPException(status_code=502, detail="سرویس هوش مصنوعی فعلاً پاسخ نداد؛ مدل و اعتبار API را در تنظیمات سرور بررسی کن.")
        return {"demo": False, "reply": r.json()["choices"][0]["message"]["content"]}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=502, detail="ارتباط با سرویس هوش مصنوعی برقرار نشد. کمی بعد تلاش کن.")
