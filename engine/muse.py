"""Client for the Meta Model API (Muse models).

This is the only module in Muse Circle that calls an AI model, and the only
service it calls is Meta's. Standard library only.
"""

import json
import os
import random
import ssl
import time
import urllib.error
import urllib.request
from pathlib import Path

BASE_URL = "https://api.meta.ai/v1"
DEFAULT_MODEL = os.environ.get("MUSE_MODEL", "muse-spark-1.3")

ROOT = Path(__file__).resolve().parent.parent
USAGE_LOG = ROOT / "out" / "usage.log"


class MuseError(Exception):
    pass


def _ssl_context():
    # Some Python installs on macOS ship without a CA bundle; fall back to the system one.
    ctx = ssl.create_default_context()
    if not ctx.get_ca_certs():
        for cafile in ("/etc/ssl/cert.pem", "/usr/local/etc/openssl/cert.pem"):
            if os.path.exists(cafile):
                ctx = ssl.create_default_context(cafile=cafile)
                break
    return ctx


_SSL = _ssl_context()


def _load_key():
    key = os.environ.get("MODEL_API_KEY")
    if key:
        return key.strip()
    env_file = ROOT / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if line.startswith("MODEL_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise MuseError("No MODEL_API_KEY found. Put it in muse-circle/.env as MODEL_API_KEY=...")


def _post(path, body, timeout=120):
    req = urllib.request.Request(
        BASE_URL + path,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": "Bearer " + _load_key(),
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout, context=_SSL) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _log_usage(model, usage, label):
    try:
        USAGE_LOG.parent.mkdir(parents=True, exist_ok=True)
        with USAGE_LOG.open("a") as f:
            f.write(json.dumps({"ts": time.time(), "model": model, "label": label, "usage": usage}) + "\n")
    except OSError:
        pass


def ask(system, user, schema=None, model=None, temperature=None, max_tokens=None, effort=None, label=""):
    """Send one request to a Muse model.

    Returns the reply text, or the parsed JSON object when `schema` is given
    (a JSON Schema dict; the reply is constrained to match it).
    `effort` ("low", "medium", "high") sets how long the model thinks first.
    """
    model = model or DEFAULT_MODEL
    body = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }
    if temperature is not None:
        body["temperature"] = temperature
    if max_tokens is not None:
        body["max_tokens"] = max_tokens
    if effort is not None:
        body["reasoning_effort"] = effort
    if schema is not None:
        body["response_format"] = {
            "type": "json_schema",
            "json_schema": {"name": schema.get("title", "result"), "schema": schema},
        }

    last = None
    for attempt in range(2):
        try:
            data = _post("/chat/completions", body)
            break
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", "replace")[:500]
            last = MuseError(f"HTTP {e.code}: {detail}")
            if e.code not in (429, 500, 502, 503, 504):
                raise last
        except (urllib.error.URLError, TimeoutError) as e:
            last = MuseError(f"Network error: {e}")
        time.sleep(1.5 + random.random())
    else:
        raise last

    _log_usage(model, data.get("usage"), label)
    content = data["choices"][0]["message"]["content"]
    if isinstance(content, list):  # content parts
        content = "".join(p.get("text", "") for p in content if isinstance(p, dict))
    if schema is not None:
        return json.loads(content)
    return content
