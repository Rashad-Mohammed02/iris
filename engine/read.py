"""Muse reads one person's situation: how the week looks, and any safety concern.

The answer stays with the person. Code (engine/decide.py) turns it into
decisions, so Muse judges and Python enforces.
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine import muse, safety  # noqa: E402

PROMPT = ROOT / "prompts" / "read_v1.txt"
STRETCHES = ["none", "off_normal", "clearly_heavy", "good"]

SCHEMA = {
    "title": "read",
    "type": "object",
    "properties": {
        "stretch": {"type": "string", "enum": STRETCHES},
        "context_explains": {"type": "boolean"},
        "context": {"type": "string"},
        "crisis": {"type": "string", "enum": ["none", "suicide", "self_harm"]},
        "afraid_of": {"type": "array", "items": {"type": "string"}},
        "pressured_on": {"type": "array", "items": {"type": "string"}},
        "good_with": {"type": "array", "items": {"type": "string"}},
        "loop_closed_with": {"type": "array", "items": {"type": "string"}},
        "log_reason": {"type": "string"},
    },
    "required": ["stretch", "context_explains", "context", "crisis", "afraid_of", "pressured_on",
                 "good_with", "loop_closed_with", "log_reason"],
}


def read(situation, effort="medium"):
    user, pattern = situation["user"], situation["pattern"]
    names = [m["name"] for m in situation["circle"]]
    brief = {
        "person": user["name"],
        "circle": [{"name": m["name"], "relation": m.get("relation", ""), "note": m.get("note", "")}
                   for m in situation["circle"]],
        "pattern": pattern,
        "corrections": situation.get("corrections", []),
    }
    r = muse.ask(PROMPT.read_text(), json.dumps(brief, ensure_ascii=False), schema=SCHEMA, effort=effort,
                 label="read")

    # Keep only real circle names, then lay the plain-text backstop on top.
    for key in ("afraid_of", "pressured_on", "good_with", "loop_closed_with"):
        r[key] = [n for n in r.get(key, []) if n in names]
    texts = list(pattern.get("journal", [])) + [m.get("note", "") for m in situation["circle"]]
    flags = safety.scan(texts)
    if r.get("crisis", "none") == "none" and flags["crisis"] != "none":
        r["crisis"] = flags["crisis"]
    r["fear_flag"] = bool(r["afraid_of"]) or flags["fear"]
    r["pressure_flag"] = bool(r["pressured_on"]) or flags["pressure"]
    return r
