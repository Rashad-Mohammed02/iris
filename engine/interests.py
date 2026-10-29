"""What the owner is into, for notes. Muse merges and names; Python guards.

A note may carry one allowed interest ("he's deep into F1 lately"). Anything
heavy, private or risky is filtered out twice: before Muse sees the list, and
again on what Muse returns. A tester told us a note must never suggest
alcohol, so that is on the never list along with health, money and the rest.
"""

import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine import muse  # noqa: E402
from engine.baseline import load_events, load_profile  # noqa: E402

OUT = ROOT / "out"
PROMPT = ROOT / "prompts" / "interests.txt"
RECENT_DAYS = 14
MAX_PICKS = 4

# Never crosses to a friend, whatever Muse says.
NEVER = re.compile(
    # whole words only (so "Barcelona" and "Sadie" pass)
    r"\b(beers?|wines?|bars?|pubs?|drinks?|drinking|drugs?|vape|vaping|cigars?|sad|gym|body|diet|"
    r"smoke|smoking|smoker|smokes|rum|gin|sake|soju|ipas?|booze|liquor|happy hour|"
    r"stocks?|loans?|budget|debt|sex|faith|temple)\b"
    # word starts
    r"|\b(alcohol|whisk|vodka|cocktail|barhop|brew|weed|cannabis|marijuana|nicotine|gambl|casino|betting|"
    r"mezcal|tequila|bourbon|scotch|margarita|sangria|mixolog|winer|vineyard|sommelier|"
    r"health|wellness|medical|therap|mental|anxi|depress|sleep|burnout|exhaust|tired|"
    r"fitness|weight|calori|finance|financial|money|invest|crypto|"
    r"religio|church|mosque|politic|election|dating|relationship|couple|partner|romanc)",
    re.I,
)


def candidates(events, profile, recent_days=RECENT_DAYS):
    """Everything the owner might be into, with counts, minus heavy themes."""
    days = sorted({e["day"] for e in events})
    recent = set(days[-recent_days:])
    watched, watched_recent, saved, sent = Counter(), Counter(), Counter(), Counter()
    url_theme = {}
    for e in events:
        t = e.get("theme")
        if e["type"] == "reel_watched" and t and not e.get("heavy"):
            watched[t] += 1
            if e["day"] in recent:
                watched_recent[t] += 1
            if e.get("url"):
                url_theme[e["url"]] = t
        elif e["type"] == "post_saved" and t and not e.get("heavy"):
            saved[t] += 1
    for e in events:
        if e["type"] == "reel_sent" and url_theme.get(e.get("url")):
            sent[url_theme[e["url"]]] += 1

    total, total_recent = sum(watched.values()) or 1, sum(watched_recent.values()) or 1
    out = []
    for t, n in watched.most_common():
        out.append({
            "key": "reel:" + t, "kind": "reel theme", "name": t.replace("_", " "),
            "watched": n, "saved": saved[t], "sent": sent[t],
            "share": round(n / total, 3), "recent_share": round(watched_recent[t] / total_recent, 3),
        })
    for name in profile.get("meta_interests", []):
        out.append({"key": "meta:" + name, "kind": "inferred by Meta", "name": name})
    for name in profile.get("meta_topics", []):
        out.append({"key": "topic:" + name, "kind": "topic followed", "name": name})
    return [c for c in out if not NEVER.search(c["name"])]


SCHEMA = {
    "title": "interests",
    "type": "object",
    "properties": {
        "interests": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "lately": {"type": "boolean"},
                    "from": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["name", "lately", "from"],
            },
        },
    },
    "required": ["interests"],
}


def guard(picks, cands):
    """Drop anything on the never list, anything not traced to a real candidate, and duplicates."""
    keys = {c["key"] for c in cands}
    kept, seen = [], set()
    for p in picks:
        name = (p.get("name") or "").strip()
        src = [k for k in p.get("from", []) if k in keys]
        if not name or not src or NEVER.search(name) or name.lower() in seen:
            continue
        seen.add(name.lower())
        kept.append({"name": name, "lately": bool(p.get("lately")), "from": src})
    return kept[:MAX_PICKS]


def find_interests(events=None, profile=None):
    events = events if events is not None else load_events()
    profile = profile if profile is not None else load_profile()
    cands = candidates(events, profile)
    reply = muse.ask(PROMPT.read_text(), json.dumps({"candidates": cands}), schema=SCHEMA, label="interests")
    return guard(reply.get("interests", []), cands)


def main():
    picks = find_interests()
    OUT.mkdir(exist_ok=True)
    (OUT / "interests.json").write_text(json.dumps(picks, indent=1), encoding="utf-8")
    for p in picks:
        print(f"{p['name']:<20} {'lately' if p['lately'] else '':<7} from {', '.join(p['from'])}")


if __name__ == "__main__":
    main()
