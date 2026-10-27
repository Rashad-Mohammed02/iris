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
FAMILIES = ["late_scroll", "reel_themes_heavy", "reels_sent_heavy", "reply_rhythm", "withdrawal", "interest_drop"]

SCHEMA = {
    "title": "read",
    "type": "object",
    "properties": {
        "families_off": {"type": "array", "items": {"type": "string", "enum": FAMILIES}},
        "off_10_plus_days": {"type": "boolean"},
        "stretch": {"type": "string", "enum": STRETCHES},
        "good_broad": {"type": "boolean"},
        "context_explains": {"type": "boolean"},
        "context": {"type": "string"},
        "crisis": {"type": "string", "enum": ["none", "suicide", "self_harm"]},
        "afraid_of": {"type": "array", "items": {"type": "string"}},
        "pressured_on": {"type": "array", "items": {"type": "string"}},
        "good_with": {"type": "array", "items": {"type": "string"}},
        "loop_closed_with": {"type": "array", "items": {"type": "string"}},
        "log_reason": {"type": "string"},
    },
    "required": ["families_off", "off_10_plus_days", "stretch", "good_broad", "context_explains", "context", "crisis", "afraid_of", "pressured_on",
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

    # Muse names which families are off; the policy itself is applied here, in code.
    fam = set(r.get("families_off", []))
    if len(fam) >= 3 or ("reels_sent_heavy" in fam and len(fam) >= 2) or (r.get("off_10_plus_days") and len(fam) >= 2):
        policy = "clearly_heavy"
    elif len(fam) >= 2:
        policy = "off_normal"
    else:
        policy = "good" if r["stretch"] == "good" else "none"
    r["muse_stretch"], r["stretch"] = r["stretch"], policy

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
