"""Who gets a note today, if anyone. Muse reads; this file enforces.

Every gate below is plain code, in a fixed order, so no model output can talk
its way past a setting, a pause or a safety stop.

A "situation" is one person's day:
  user      {name, age, country, teen_account}
  settings  {note_time "18:00", send_mode "auto" | "ask", paused, sources {instagram, spotify, calendar}}
  circle    up to 5 people: {name, relation, setting "every_day" | "big_moments" | "never", mutual, age,
            teen_account, nearby, allowed_interests, language}
  day       the day Muse reads (see engine/day.py), with date and use_day (days since Iris started)
  feeds     an engine.connectors.Feeds for the ready actions (not sent to Muse)
The bench cases use the same shape, and engine/demo.py builds one per day from the export.
"""

import sys
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine import actions, note as note_writer, safety  # noqa: E402
from engine.connectors import Feeds  # noqa: E402
from engine.day import read_day  # noqa: E402

LEARNING_DAYS = 14   # matches engine/baseline.py: the first two weeks only learn your normal
CANCEL_MINUTES = 10
SEND_MODES = ("auto", "ask")   # "auto" (send on its own, 10 minutes to cancel) is the default
SETTINGS = ("every_day", "big_moments", "never")
DEFAULT_SETTING = "every_day"   # the norm: your 5 see how you are every day
DEFAULT_TIME = "18:00"
SOURCE_PARTS = {"instagram": ("see", "talk"), "spotify": ("hear",), "calendar": ("happens",)}


def signature(name, send_mode):
    return f"Suggested by Muse. {name} didn't ask." if send_mode == "auto" else "Suggested by Muse."


def is_adult(person):
    age = person.get("age")
    return not person.get("teen_account") and not (isinstance(age, (int, float)) and age < 18)


def sources_on(situation):
    """The day and feeds with any source the person switched off taken out, before Muse sees anything."""
    src = situation.get("settings", {}).get("sources", {})
    day = dict(situation["day"])
    for source, parts in SOURCE_PARTS.items():
        if src.get(source) is False:
            for p in parts:
                day.pop(p, None)
    feeds = situation.get("feeds") or Feeds()
    feeds = Feeds(feeds.calendar if src.get("calendar") is not False else None,
                  feeds.spotify if src.get("spotify") is not False else None)
    return day, feeds


def why_not(member, size):
    """Why this friend gets nothing today, or None if the setting allows a note."""
    setting = member.get("setting", DEFAULT_SETTING)
    if setting not in SETTINGS or setting == "never":
        return "Set to Never"
    if not member.get("mutual", False):
        return "Not mutual yet"
    if not is_adult(member):
        return "Adults only"
    if size is not None and setting == "big_moments" and size != "big":
        return f"Big moments only (today was {size})"
    return None


def decide(situation, reading=None, write_notes=True):
    user, settings, circle = situation["user"], situation.get("settings", {}), situation["circle"]
    country = user.get("country")
    out = {"user": user["name"], "date": situation["day"].get("date"), "notes": [], "not_sent": [],
           "cards": [], "prompts": [], "log": [], "read": None, "size": None, "mood": None}

    def skip_all(why):
        out["not_sent"] += [{"name": m["name"], "why": why} for m in circle]
        return out

    # 1. Adults only: no reading at all. Teen Accounts are never eligible.
    if not is_adult(user):
        out["cards"].append({"kind": "minor", "text": safety.card("minor", country)})
        return skip_all("Adults only")

    day, feeds = sources_on(situation)

    # 2. Crisis, before any model call: from what they watch, or their own words. Help for them, nothing to anyone.
    if safety.watched_crisis((day.get("see") or {}).get("crisis_content")):
        out["cards"].append({"kind": "crisis_content", "text": safety.card("crisis_content", country)})
        out["log"].append({"kind": "safety", "text": "Crisis-themed reels: help shown to the person only."})
        return skip_all("Serious is never shared")
    flags = safety.scan((day.get("talk") or {}).get("own_words", []))
    if flags["crisis"] != "none":
        out["cards"].append({"kind": "crisis", "text": safety.card(flags["crisis"], country)})
        return skip_all("Serious is never shared")

    # 3. Still learning their normal.
    if situation["day"].get("use_day", 99) <= LEARNING_DAYS:
        return skip_all("Still learning your normal")

    # 4. Pause wins over every setting.
    if settings.get("paused"):
        return skip_all("Pause is on")

    # 5. Who could get a note today, before Muse reads: settings, mutual, adults. People set to Never,
    #    not mutual or under 18 are never named to Muse.
    friends = [m for m in circle if why_not(m, None) is None]
    for m in circle:
        w = why_not(m, None)
        if w:
            out["not_sent"].append({"name": m["name"], "why": w})
    if not friends:
        return out

    r = reading or read_day(dict(situation, day=day), friends)
    out["read"], out["size"], out["mood"] = r, r["size"], r["mood"]

    # 6. Crisis from the read: no notes to anyone, help to the person only.
    if r["crisis"] != "none":
        out["cards"].append({"kind": "crisis", "text": safety.card(r["crisis"], country)})
        out["not_sent"] += [{"name": m["name"], "why": "Serious is never shared"} for m in friends]
        return out

    # 7. Per friend: the size gate, an interest, a ready action, then the note.
    send_mode = settings.get("send_mode", "auto")
    send_mode = send_mode if send_mode in SEND_MODES else "auto"
    when = datetime.fromisoformat(f"{situation['day']['date']}T{settings.get('note_time', DEFAULT_TIME)}")
    written_today = []
    for m in friends:
        w = why_not(m, r["size"])
        if w:
            out["not_sent"].append({"name": m["name"], "why": w})
            continue
        fit = r["fits"].get(m["name"]) or {"interest": None, "action": "message", "surprise": False}
        interest = fit["interest"] or next(iter(note_writer.interests_for(m)), None)
        if not interest:
            out["not_sent"].append({"name": m["name"], "why": "No shared interest chosen yet"})
            out["prompts"].append({"kind": "choose_interests", "about": m["name"],
                                   "text": f"Choose what you and {m['name']} share, so a note can reach them."})
            continue
        args = (user["name"], m["name"])
        action = actions.choose(fit["action"], *args, interest, r["direction"], situation["day"]["date"], feeds,
                                nearby=m.get("nearby", True), surprise=fit["surprise"])
        if not write_notes:
            out["notes"].append({"to": m["name"], "interest": interest, "action": action})
            continue
        recent = situation.get("recent_notes", {}).get(m["name"], []) + written_today
        n = note_writer.write(dict(situation, day=day), m, dict(r, fits={m["name"]: dict(fit, interest=interest)}),
                              action, recent)
        if n is None:
            out["not_sent"].append({"name": m["name"], "why": "No interest was safe to mention today"})
            continue
        if n["interest"] != interest and action["type"] in ("reel", "tickets"):
            # The note moved to another interest, so the action follows it.
            action = actions.choose(action["type"], *args, n["interest"], r["direction"],
                                    situation["day"]["date"], feeds, nearby=m.get("nearby", True),
                                    surprise=action["surprise"])
        written_today.append(n["text"])
        n.update(action=action, mood=r["mood"], signature=signature(user["name"], send_mode),
                 sends_at=when.isoformat(timespec="minutes"))
        if send_mode == "auto":
            n.update(status="queued", cancel_until=(when + timedelta(minutes=CANCEL_MINUTES)).isoformat(timespec="minutes"))
        else:
            n.update(status="waiting_for_ok")  # nothing leaves until the person taps Send
        out["notes"].append(n)
        out["log"].append({"kind": "note", "to": m["name"], "text": n["text"], "why": r.get("why", "")})
    return out
