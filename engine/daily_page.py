"""The Daily Page: a two-to-three line private entry that writes itself, plus
the slow reveal that unlocks a little more each day.
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine import muse  # noqa: E402

PROMPT = ROOT / "prompts" / "daily_page_v2.txt"


# Testers found a whole night laid out, with other people's chats in it, "too much" and "creepy".
# The page keeps to the person: their rest, their day, their reels, their interests. No one else.
# No clock times: the night is one fact among others, never the headline.
ABOUT_YOU = ("day", "rest", "scrolled_more_in_the_day", "reel_themes_today", "interests_today")


def write_page(facts, journal_today=None, effort="low"):
    facts = {k: v for k, v in facts.items() if k in ABOUT_YOU}
    if journal_today:
        journal_today = {"named": journal_today.get("named")}  # the word they chose, not what they wrote
    brief = {"facts": facts, "journal_today": journal_today or {}}
    return muse.ask(PROMPT.read_text(), json.dumps(brief, ensure_ascii=False), effort=effort,
                    label="daily_page").strip()


def _join(items):
    items = [t if t[:1].isupper() and t.split()[0] in ("Formula", "NBA") else t.lower() for t in items]
    return items[0] if len(items) == 1 else ", ".join(items[:-1]) + " and " + items[-1]


def reveal(demo, i, settings):
    """What unlocks on day i+1. Day 1 asks, it doesn't tell (a tester felt watched by a day-1 fact)."""
    n = i + 1
    circle = [c["name"].split()[0] for c in settings["circle"]]
    if n == 1:
        return {"day": n, "title": "Your circle",
                "text": "Who are the five people you'd want in your corner? Muse suggests them from your Close "
                        "Friends. You choose, and they say yes too.",
                "suggested": circle}
    if n == 2:
        return {"day": n, "title": "What you're into",
                "text": "You're into " + ", ".join(demo.interests[:-1]) + " and " + demo.interests[-1] +
                        ". Pick which ones your circle may ever hear about.",
                "interests": demo.interests}
    if n == 3:
        return {"day": n, "title": "Your page", "text": "A two-line page about your day is ready when you want it. "
                "It's only about you, and it writes itself."}
    if n == 5:
        rows = demo.rows[:n]
        latest = max(rows, key=lambda r: r["last_active"] or 0)
        from engine.demo import weekday
        return {"day": n, "title": "The shape of your week",
                "text": f"Your week has a rhythm: {weekday(latest['day'])}s run later for you. Muse compares each day with "
                        "days like it, so a late weekend is never a signal by itself."}
    if n == settings.get("lifts_switch_on_day", 7):
        return {"day": n, "title": "Lifts switch on",
                "text": "I know your normal now. Choose, person by person, when they may get a little lift "
                        "from you. Nobody can see what you chose."}
    if n == 10:
        return {"day": n, "title": "What your reels say",
                "text": "Lately your reels are mostly " + _join(demo.themes(demo.days[max(0, i - 6):i + 1])) +
                        ". Only you see this."}
    if n == 14:
        noticed = [r for r in demo.rule[:n] if r["off_day"]]
        return {"day": n, "title": "What Muse notices",
                "text": "Nothing has looked off your normal so far. When something does, you'll see it here first."
                if not noticed else "One day so far looked a little off your normal. You'll always see it here first."}
    if n in (12, 17):
        # Small, fun facts about you: a reason to open it on a good day (a tester's ask).
        from collections import Counter
        from engine.demo import weekday
        theme = "f1" if n == 12 else "comedy"
        label = demo.theme_label.get(theme, theme)
        seen = [e for d in demo.days[:n] for e in demo.by_day.get(d, [])
                if e["type"] == "reel_watched" and e.get("theme") == theme]
        if not seen:
            return None
        if n == 12:
            top = Counter(weekday(e["day"]) for e in seen).most_common(1)[0][0]
            text = f"{top} is your biggest {label} day of the week."
        else:
            hour = Counter(int(e["hour"]) for e in seen).most_common(1)[0][0]
            when = "midnight" if hour == 0 else ("noon" if hour == 12 else f"{(hour % 12) or 12} {'AM' if hour < 12 else 'PM'}")
            text = f"Your {label.lower()} reels peak around {when}."
        return {"day": n, "title": "A little fact about you", "text": text}
    if n == 21:
        return {"day": n, "title": "Your orbit, three weeks in",
                "text": "Here's your circle over three weeks. Closer means more recent, never better."}
    return None
