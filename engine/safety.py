"""Serious is never automatic. Plain-text safety net under the Muse read,
and the private cards the person sees instead of any lift.

The regexes are a backstop, not the main detector: Muse reads the private
writing too. Either one flagging is enough.
"""

import re

CRISIS = re.compile(
    r"(kill(ing)? myself|end (it all|my life|things)|want(ed)? to die|better off without me|"
    r"(don't|do not) want to (be here|wake up|live)|no reason to live|suicid)",
    re.I,
)
SELF_HARM = re.compile(r"(hurt(ing)? myself|cut(ting)? myself|self[- ]?harm|harm(ing)? myself)", re.I)
FEAR = re.compile(r"(scared of|afraid of|terrified of|hits me|hit me|hurts me|threaten|locked myself)", re.I)
PRESSURE = re.compile(r"(made me (switch|change|turn|set)|forced me|while (he|she|they) watched|make me share)", re.I)

CARDS = {
    "suicide": "This sounds like a lot. You don't have to carry it alone. You can call or text 988 anytime, "
               "day or night. Nothing was shared with anyone.",
    "self_harm": "This sounds like a lot. You don't have to carry it alone. You can call or text 988, or text "
                 "HOME to 741741, anytime. Nothing was shared with anyone.",
    "fear": "You deserve to feel safe. If you want to talk to someone, the National Domestic Violence Hotline "
            "is free and private: call 1-800-799-7233 or text START to 88788. Nobody was notified of anything.",
    "pressure": "Quick check, just for you: is anyone pushing you to share more than you want to? Your earlier "
                "settings stay as they were until you confirm here, privately.",
    "minor": "Muse Circle is for adults only, so it isn't running on your account. Nothing about you was saved.",
}


def scan(texts):
    """Backstop flags from the person's own private writing."""
    blob = " ".join(t for t in texts if t)
    return {
        "crisis": "suicide" if CRISIS.search(blob) else ("self_harm" if SELF_HARM.search(blob) else "none"),
        "fear": bool(FEAR.search(blob)),
        "pressure": bool(PRESSURE.search(blob)),
    }


def is_minor(user, pattern):
    age = user.get("age")
    if isinstance(age, (int, float)) and age < 18:
        return True
    acct = str(pattern.get("account", ""))
    m = re.search(r"shows (\d{1,2})\b", acct)
    return bool(m and int(m.group(1)) < 18)
