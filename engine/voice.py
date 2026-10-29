"""How notes may and may not talk, and a plain-text word check that enforces it.

The check runs on every note before it can be sent. It is deliberately strict:
a false alarm costs one rewrite, a miss can reveal something private.

v2 (the everyday notes): a plain mood word is now allowed, in any direction
(happy, proud, tired, stressed, low...), because telling your 5 how you are is
the point. What stays banned: therapy and diagnosis words, crisis words, quotes
from messages, other people's names, health, money, work trouble, relationship
details and where the person is. lint_v1 keeps the v1 rules for the old bench.
"""

import re

MAX_WORDS = 25   # the note is minimal: name, mood, one nudge

BANNED = {
    # Saying how someone is is fine. Labelling it is not.
    "therapy or diagnosis": [
        "depressed", "depression", "anxiety", "anxious", "panic", "burnout", "burnt out", "burned out", "trauma",
        "disorder", "diagnosis", "diagnosed", "mental health", "wellbeing", "therapy", "therapist", "counseling",
        "self-care", "holding space", "validate", "process", "boundaries", "healing", "support", "check in on",
        "check on", "check in", "reach out", "be there for", "lean on", "feelings", "struggling", "not okay",
        "going through",
    ],
    "crisis": [
        "suicide", "suicidal", "self-harm", "self harm", "hurt himself", "hurt herself", "harm", "die", "dying",
        "crisis", "hopeless", "hotline", "988", "emergency", "unsafe",
    ],
    "needy": [
        "needs you", "needs someone", "won't ask", "don't let him", "don't let her", "worried", "concerned",
        "fragile", "before it's too late", "urgent", "alone", "lonely",
    ],
    # Where the read came from stays private: no sources, no phone use.
    "source": [
        "scrolling", "up late", "late nights", "messages", "messaging", "texts", "dms", "chats", "journal",
        "noticed", "muse saw", "data", "instagram", "spotify", "calendar", "online", "posting", "listening to",
        "been listening", "playlist", "lately", "quiet lately",
    ],
    "health": [
        "sick", "ill", "illness", "doctor", "hospital", "clinic", "test results", "biopsy", "scan", "blood test",
        "medical", "medication", "surgery", "symptoms", "pregnant", "pregnancy", "injury", "injured",
        "appointment", "health", "flu", "covid", "cancer",
    ],
    "money or work trouble": [
        "money", "rent", "broke", "debt", "loan", "bills", "paycheck", "salary", "laid off", "layoff", "layoffs",
        "fired", "lost the job", "lost a job", "job loss", "unemployed", "budget",
    ],
    "relationship detail": [
        "breakup", "broke up", "break up", "divorce", "dumped", "cheated", "ex", "split up",
    ],
    "ai tell": [
        "crucial", "journey", "delve", "vibrant", "testament", "showcase", "navigate", "amidst", "truly", "deeply",
        "profound", "not just", "not only", "lands big", "elevate", "unwind",
    ],
    # A good-day note must never hint that things were bad before ("doing well now", "back to himself").
    "recovery": ["back to", "better", "now that", "these days", "anymore", "otra vez", "de nuevo", "de vuelta",
                 "mejor", "va bien", "ya no"],
    # Names only: Muse never guesses anyone's pronouns.
    "pronoun": ["he", "she", "him", "her", "his", "hers", "he's", "she's", "himself", "herself"],
}

PUNCTUATION = {
    "em or en dash": re.compile(r"[\u2014\u2013]|\s-\s"),
    "curly quote": re.compile(r"[\u2018\u2019\u201c\u201d]"),
    "quoted words": re.compile(r"\""),          # a quote is how a message's own words would get through
    "exclamation mark": re.compile(r"!"),
    "emoji": re.compile(r"[\U0001F000-\U0001FAFF☀-➿]"),
}


def _compile(banned):
    return {cat: re.compile(r"(?<![\w'])(" + "|".join(re.escape(w) for w in words) + r")(?![\w'])", re.I)
            for cat, words in banned.items()}


_PATTERNS = _compile(BANNED)


def _common(text, other_names, private_terms, max_words):
    problems = []
    for name, pat in PUNCTUATION.items():
        if pat.search(text):
            problems.append(name)
    words = len(text.split())
    if words > max_words:
        problems.append(f"too long: {words} words")
    sentences = [x for x in re.split(r"(?<=[.?])\s+", text.strip()) if x]
    if len(sentences) > 2:
        problems.append(f"{len(sentences)} sentences, at most 2")
    for n in other_names:
        if n and re.search(r"(?<!\w)" + re.escape(n) + r"(?!\w)", text, re.I):
            problems.append(f"names someone else: {n}")
    for t in private_terms:
        if t and len(t) > 2 and re.search(r"(?<!\w)" + re.escape(t) + r"(?!\w)", text, re.I):
            problems.append(f"private term: {t}")
    return problems


def lint(text, interest=None, other_names=(), private_terms=(), language="en", person=None):
    """v2 note check. Return a list of problems; empty means the note passes.

    With `person`, the note must open with the person's name and use it only
    once: the nudge after it never repeats the name ("Send Arjun a song" reads
    like a button, "A song to keep it going?" reads like a friend)."""
    problems = []
    if person:
        if not re.match(re.escape(person) + r"\b", text.strip()):
            problems.append(f"does not open with {person}")
        if len(re.findall(r"(?<!\w)" + re.escape(person) + r"(?!\w)", text)) > 1:
            problems.append(f"repeats the name {person} in the nudge")
    for cat, pat in _PATTERNS.items():
        for m in pat.finditer(text):
            problems.append(f"{cat} word: {m.group(0)!r}")
    problems += _common(text, other_names, private_terms, MAX_WORDS)
    if interest and language == "en" and interest.lower() not in text.lower():
        problems.append(f"interest {interest!r} not named")
    return problems


def phrase_ok(text, private_terms=(), other_names=()):
    """For the general moment ("big news", "a long week"): banned words, names and private terms. [] means fine."""
    problems = [f"{cat} word: {m.group(0)!r}" for cat, pat in _PATTERNS.items()
                if cat not in ("pronoun", "ai tell") for m in pat.finditer(text)]
    problems += [p for p in _common(text, other_names, private_terms, 6) if not p.endswith("sentences, at most 2")]
    return problems


# ---------------------------------------------------------------------------
# v1 (lifts), kept so the old bench in bench/run_bench_v1.py still runs as it did.

MAX_WORDS_V1 = 30

BANNED_V1 = {
    "feeling": [
        "sad", "down", "low", "depressed", "anxious", "anxiety", "stressed", "stress", "lonely", "overwhelmed",
        "struggling", "hurting", "upset", "exhausted", "burnt out", "burnout", "drained", "heartbroken", "rough",
        "hard time", "going through", "not okay", "off lately", "tired", "tough", "heavy", "blue", "scared",
    ],
    "reason or signal": [
        "because", "since", "after", "due to", "scrolling", "up late", "late nights", "reels", "reel",
        "hasn't replied", "quiet lately", "quiet", "messages", "journal", "pattern", "noticed", "muse saw", "data",
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
    "ai tell": BANNED["ai tell"],
    "recovery": ["again", "back to", "better", "now that", "these days", "anymore", "ahora", "otra vez", "de nuevo",
                 "de vuelta", "mejor", "va bien", "ya no"],
    "pronoun": BANNED["pronoun"],
    "feeling (es)": [
        "triste", "estresado", "estresada", "cansado", "cansada", "agotado", "agotada", "deprimido", "deprimida",
        "ansiedad", "preocupado", "preocupada", "porque", "desde", "apoyo", "mensajes",
    ],
}
EVERY_LANGUAGE_V1 = {"recovery"}
_PATTERNS_V1 = _compile(BANNED_V1)


def lint_v1(text, interest=None, other_names=(), private_terms=(), language="en"):
    """The v1 lift check: no feeling words at all. Return a list of problems."""
    problems = []
    for cat, pat in _PATTERNS_V1.items():
        if cat not in EVERY_LANGUAGE_V1 and cat.endswith("(es)") != (language == "es"):
            continue  # each language gets its own word list
        for m in pat.finditer(text):
            problems.append(f"{cat} word: {m.group(0)!r}")
    problems += [p for p in _common(text, other_names, private_terms, MAX_WORDS_V1) if p != "quoted words"]
    if interest and language == "en" and interest.lower() not in text.lower():
        problems.append(f"interest {interest!r} not named")
    return problems
