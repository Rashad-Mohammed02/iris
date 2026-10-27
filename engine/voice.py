"""How lifts may and may not talk, and a plain-text lint that enforces it.

The lint runs on every line before it can be sent. It is deliberately strict:
a false alarm costs one rewrite, a miss can reveal someone's private week.
"""

import re

MAX_WORDS = 30

BANNED = {
    "feeling": [
        "sad", "down", "low", "depressed", "anxious", "anxiety", "stressed", "stress", "lonely", "overwhelmed",
        "struggling", "hurting", "upset", "exhausted", "burnt out", "burnout", "drained", "heartbroken", "rough",
        "hard time", "going through", "not okay", "off lately", "tired", "tough", "heavy", "blue", "scared",
    ],
    "reason or signal": [
        "because", "since", "after", "due to", "scrolling", "up late", "late nights", "reels", "reel",
        "hasn't replied", "quiet lately", "messages", "journal", "pattern", "noticed", "muse saw", "data",
        "instagram", "online", "posting", "lately",
    ],
    "therapy": [
        "support", "self-care", "holding space", "validate", "process", "boundaries", "mental health", "wellbeing",
        "healing", "trauma", "check in on", "check on", "check in", "reach out", "be there for", "lean on",
        "therapy", "counseling", "feelings",
    ],
    "needy": [
        "needs you", "needs someone", "won't ask", "don't let him", "don't let her", "worried", "concerned",
        "fragile", "before it's too late", "urgent", "alone",
    ],
    "ai tell": [
        "crucial", "journey", "delve", "vibrant", "testament", "showcase", "navigate", "amidst", "truly", "deeply",
        "profound", "not just", "not only", "lands big", "elevate", "unwind",
    ],
    # Names only: Muse never guesses anyone's pronouns.
    "pronoun": ["he", "she", "him", "her", "his", "hers", "he's", "she's", "himself", "herself"],
    # A small Spanish list; the Muse leak check covers other languages and paraphrases.
    "feeling (es)": [
        "triste", "estresado", "estresada", "cansado", "cansada", "agotado", "agotada", "deprimido", "deprimida",
        "ansiedad", "preocupado", "preocupada", "porque", "desde", "apoyo", "mensajes",
    ],
}

_PATTERNS = {
    cat: re.compile(r"(?<![\w'])(" + "|".join(re.escape(w) for w in words) + r")(?![\w'])", re.I)
    for cat, words in BANNED.items()
}

PUNCTUATION = {
    "em or en dash": re.compile(r"[—–]|\s-\s"),
    "curly quote": re.compile(r"[‘’“”]"),
    "exclamation mark": re.compile(r"!"),
    "emoji": re.compile(r"[\U0001F000-\U0001FAFF☀-➿]"),
}


def lint(text, interest=None, other_names=(), private_terms=(), language="en"):
    """Return a list of problems; empty means the line passes."""
    problems = []
    for cat, pat in _PATTERNS.items():
        if (cat.endswith("(es)")) != (language == "es"):
            continue  # each language gets its own word list
        for m in pat.finditer(text):
            problems.append(f"{cat} word: {m.group(0)!r}")
    for name, pat in PUNCTUATION.items():
        if pat.search(text):
            problems.append(name)
    words = len(text.split())
    if words > MAX_WORDS:
        problems.append(f"too long: {words} words")
    sentences = [x for x in re.split(r"(?<=[.?])\s+", text.strip()) if x]
    if len(sentences) > 2:
        problems.append(f"{len(sentences)} sentences, at most 2")
    if interest and language == "en" and interest.lower() not in text.lower():  # translated interests are checked by Muse
        problems.append(f"interest {interest!r} not named")
    for n in other_names:
        if n and re.search(r"(?<!\w)" + re.escape(n) + r"(?!\w)", text, re.I):
            problems.append(f"names someone else: {n}")
    for t in private_terms:
        if t and len(t) > 2 and re.search(r"(?<!\w)" + re.escape(t) + r"(?!\w)", text, re.I):
            problems.append(f"private term: {t}")
    return problems
