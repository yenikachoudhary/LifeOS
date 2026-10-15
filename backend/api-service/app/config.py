import os

from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "lifeos")
JWT_SECRET = os.getenv("JWT_SECRET", "")
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()]

if len(JWT_SECRET) < 16:
    raise RuntimeError("JWT_SECRET is missing or too short. Copy .env.example to .env and set it (same value as the auth-service).")
