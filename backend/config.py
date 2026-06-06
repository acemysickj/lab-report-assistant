"""Application configuration."""
import os
from pathlib import Path
from dotenv import load_dotenv

# Project root (lab-assistant/)
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Load .env file
load_dotenv(PROJECT_ROOT / "backend" / ".env")

# Paths
RULES_DIR = PROJECT_ROOT / "rules"
REFERENCE_DIR = PROJECT_ROOT / "reference"
OUTPUT_DIR = PROJECT_ROOT / "output"
SKILLS_DIR = PROJECT_ROOT / ".claude" / "skills"

# Claude API
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

# Auto-detect provider from key prefix
# sk-ant-... → Anthropic  |  sk-... (other) → DeepSeek
if ANTHROPIC_API_KEY.startswith("sk-ant-"):
    API_PROVIDER = "anthropic"
    DEFAULT_MODEL = os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-6")
else:
    API_PROVIDER = "deepseek"
    DEFAULT_MODEL = os.environ.get("CLAUDE_MODEL", "deepseek-chat")

# Server
HOST = os.environ.get("HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT", "8000"))
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")

# Generation limits
MAX_REVIEW_ROUNDS = 2
