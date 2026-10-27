"""The Daily Page: a two-to-three line private entry that writes itself, plus
the slow reveal that unlocks a little more each day.
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine import muse  # noqa: E402

PROMPT = ROOT / "prompts" / "daily_page_v1.txt"


def write_page(facts, journal_today=None, effort="low"):
    brief = {"facts": facts, "journal_today": journal_today or {}}
    return muse.ask(PROMPT.read_text(), json.dumps(brief, ensure_ascii=False), effort=effort,
                    label="daily_page").strip()


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
        return {"day": n, "title": "Your first page", "text": "Your first page is ready. It wrote itself."}
    if n == 5:
        rows = demo.rows[:n]
        latest = max(rows, key=lambda r: r["last_active"] or 0)
        from engine.demo import weekday
        return {"day": n, "title": "The shape of your week",
                "text": f"{weekday(latest['day'])} nights run later for you. Muse compares each night with "
                        "nights like it, so a late weekend is never a signal by itself."}
    if n == settings.get("lifts_switch_on_day", 7):
        return {"day": n, "title": "Lifts switch on",
                "text": "I know your normal now. Choose, person by person, when they may get a little lift "
                        "from you. Nobody can see what you chose."}
    if n == 10:
        return {"day": n, "title": "What your reels say",
                "text": "Lately your reels are mostly " + ", ".join(demo.themes(demo.days[max(0, i - 6):i + 1])) +
                        ". Only you see this."}
    if n == 14:
        noticed = [r for r in demo.rule[:n] if r["off_day"]]
        return {"day": n, "title": "What Muse notices",
                "text": "Nothing has looked off your normal so far. When something does, you'll see it here first."
                if not noticed else "One day so far looked a little off your normal. You'll always see it here first."}
    if n == 21:
        return {"day": n, "title": "Your orbit, three weeks in",
                "text": "Here's your circle over three weeks. Closer means more recent, never better."}
    return None
