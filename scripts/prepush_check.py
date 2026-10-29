"""Run before making the repo public: python scripts/prepush_check.py

Checks that the key and private files stay out, the product names no other AI
company, and the license is there. Prints what it finds and exits 1 on a problem."""
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PRODUCT = ["engine", "prompts", "web", "bench", "data", "scripts", "tests"]
problems = []

tracked = subprocess.run(["git", "ls-files"], cwd=ROOT, capture_output=True, text=True, check=True).stdout.split()

if any(p == ".env" or p.endswith("/.env") for p in tracked):
    problems.append(".env is tracked by git")
if subprocess.run(["git", "log", "--all", "--format=%H", "--", ".env"], cwd=ROOT, capture_output=True, text=True).stdout.strip():
    problems.append(".env appears in git history")
if not (ROOT / "LICENSE").exists():
    problems.append("LICENSE is missing")

# Meta's own press images of its mascot and the Charm were kept private, for reference only.
for p in tracked:
    if re.search(r"jolly|press", p, re.I):
        problems.append(f"possible Meta press image: {p}")

# The product runs on Meta models only. The README may credit the coding assistant; product files may not.
other_ai = re.compile(r"\b(anthropic|claude|openai|gpt-\d|gemini)\b", re.I)
key_like = re.compile(r"(sk-[A-Za-z0-9]{20,}|LLM\|[A-Za-z0-9|_-]{20,}|api[_-]?key\s*=\s*['\"][A-Za-z0-9|_-]{16,}['\"])", re.I)
for p in tracked:
    path = ROOT / p
    if not path.is_file() or path.suffix in {".png", ".jpg", ".jpeg", ".webp", ".gif", ".zip"}:
        continue
    text = path.read_text(errors="ignore")
    if p.split("/")[0] in PRODUCT and p != "scripts/prepush_check.py" and other_ai.search(text):
        problems.append(f"another AI company named in a product file: {p}")
    if key_like.search(text):
        problems.append(f"something that looks like a key: {p}")

if problems:
    print("Not ready to go public:")
    for x in problems:
        print(" -", x)
    sys.exit(1)
print(f"Ready: {len(tracked)} tracked files checked. No key, no press images, Meta models only in product files, license present.")
