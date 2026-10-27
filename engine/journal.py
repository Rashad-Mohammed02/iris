"""The private journal: Muse listens, works out who and what you mean from your
own Instagram context, and helps you name what you feel, one gentle step at a
time (what happened, body, urge, then the word).

The method follows the research in our framework notes: Lane's levels of
emotional awareness (body, then urge, then a named feeling, then blends),
Yale's RULER ("recognize, understand, label"), Barrett's emotional
granularity, and Lieberman's affect labeling. It never diagnoses.

Only the person sees any of this. What the journal learns (the feeling they
named, who it was about) feeds their Daily Page and the private read; their
words never reach a lift.
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine import muse, safety  # noqa: E402

PROMPT = ROOT / "prompts" / "journal_v1.txt"
DRAFT_PROMPT = ROOT / "prompts" / "own_words_v1.txt"
STEPS = ["listen", "notice", "body", "urge", "name", "share", "close", "safety"]

SCHEMA = {
    "title": "journal_turn",
    "type": "object",
    "properties": {
        "reply": {"type": "string"},
        "step": {"type": "string", "enum": STEPS},
        "about": {"type": "array", "items": {"type": "string"}},
        "about_chip": {"type": "string"},
        "connection": {"type": "string"},
        "chips": {"type": "array", "items": {"type": "string"}},
        "feeling_words": {"type": "array", "items": {"type": "string"}},
        "tone": {"type": "string", "enum": ["pleasant", "unpleasant", "mixed", "unclear"]},
        "safety": {"type": "string", "enum": ["none", "suicide", "self_harm", "fear"]},
    },
    "required": ["reply", "step", "about", "about_chip", "connection", "chips", "feeling_words", "tone", "safety"],
}

DRAFT_SCHEMA = {
    "title": "own_words",
    "type": "object",
    "properties": {"options": {"type": "array", "items": {"type": "string"}}, "left_out": {"type": "string"}},
    "required": ["options", "left_out"],
}


def turn(history, context, effort="medium"):
    """One journal reply.

    history: [{"role": "user"|"muse", "text": ...}], newest last.
    context: {"person", "circle": [{name, relation, facts}], "week": [plain facts], "interests", "named_before"}.
    """
    mine = [h["text"] for h in history if h["role"] == "user"]
    flags = safety.scan(mine)
    if flags["crisis"] != "none":
        # Never wait on a model for this.
        return {"reply": safety.CARDS[flags["crisis"]], "step": "safety", "about": [], "about_chip": "",
                "connection": "", "chips": [], "feeling_words": [], "tone": "unpleasant",
                "safety": flags["crisis"]}

    names = [c["name"] for c in context.get("circle", [])]
    first_names = {n.split()[0]: n for n in names}
    brief = {"context": context, "entry_so_far": history,
             "questions_asked_so_far": sum(1 for h in history if h["role"] == "muse" and "?" in h["text"])}
    r = muse.ask(PROMPT.read_text(), json.dumps(brief, ensure_ascii=False), schema=SCHEMA, effort=effort,
                 label="journal")
    r["about"] = [first_names.get(n.split()[0], n) for n in r.get("about", []) if n.split()[0] in first_names]

    if r["safety"] in ("suicide", "self_harm"):
        r["reply"], r["step"] = safety.CARDS[r["safety"]], "safety"
    elif r["safety"] == "fear" or flags["fear"]:
        r["safety"], r["step"] = "fear", "safety"
        r["reply"] = r["reply"].rstrip() + " " + safety.CARDS["fear"]
    return r


def own_words(history, to, context, effort="medium"):
    """Help them say it themselves, short and in their voice. Never sent by Muse."""
    brief = {"to": to, "person": context.get("person"), "entry": history,
             "relation": next((c.get("relation") for c in context.get("circle", []) if c["name"] == to), "")}
    return muse.ask(DRAFT_PROMPT.read_text(), json.dumps(brief, ensure_ascii=False), schema=DRAFT_SCHEMA,
                    effort=effort, label="own_words")
