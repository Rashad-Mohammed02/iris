"""The ready action on a note: what the friend can do with one tap.

Built in plain code from the connector feeds, never by a model, so an action
can only point at something real: a lunch hour when both are free, a show on
sale that fits what they share, a song from his own usual favorites.

Every action is {type, label, detail, surprise} plus `when` for lunch and tickets.
"""

from datetime import date

TYPES = ("song", "reel", "lunch", "tickets", "treat", "message")
# If the type Muse suggested can't be made today, try these in order. Message always works.
FALLBACK = {
    "up": ["tickets", "lunch", "song", "reel", "message"],
    "flat": ["reel", "song", "lunch", "message"],
    "down": ["treat", "song", "lunch", "reel", "message"],
}
SURPRISE_OK = {"treat", "tickets", "song", "reel"}   # lunch and a message need the person in on it


def _hm(minutes):
    h, m = divmod(minutes, 60)
    return f"{(h % 12) or 12}:{m:02d}" + (" PM" if h >= 12 else " AM")


def _weekday(day):
    return date.fromisoformat(day).strftime("%A")


def _short(day):
    d = date.fromisoformat(day)
    return f"{d.strftime('%a')} {d.day} {d.strftime('%b')}"


def build(kind, person, friend, interest, direction, day, feeds, nearby=True):
    """One action of this type, or None if the feeds can't back it today."""
    if kind == "song":
        s = feeds.favorite_song(day, direction) if feeds else None
        if not s:
            return None
        return {"type": "song", "label": f"Send {person} a song", "detail": f"{s['track']} by {s['artist']}"}
    if kind == "reel":
        if not interest:
            return None
        return {"type": "reel", "label": f"Send {person} a {interest} reel",
                "detail": "Iris lines up a few fresh ones. You pick one and send it."}
    if kind == "lunch":
        slot = feeds.free_lunch(friend, day) if feeds and nearby else None
        if not slot:
            return None
        return {"type": "lunch", "label": f"Lunch with {person}, {_weekday(slot['day'])} {_hm(slot['start'])}",
                "detail": f"You're both free {_weekday(slot['day'])} from {_hm(slot['start'])} to {_hm(slot['end'])}. "
                          "Book a table on OpenTable.",
                "when": f"{slot['day']}T{slot['start'] // 60:02d}:{slot['start'] % 60:02d}"}
    if kind == "tickets":
        e = feeds.show_for(interest, day) if feeds and interest else None
        if not e:
            return None
        seller = (e.get("tickets") or {}).get("seller", "Ticketmaster")
        return {"type": "tickets", "label": f"Tickets: {e['title']}",
                "detail": f"{_short(e['start'][:10])}. {seller} has seats for two.", "when": e["start"]}
    if kind == "treat":
        return {"type": "treat", "label": f"Send {person} a small treat",
                "detail": "Ice cream, coffee or something sweet, delivered. Iris fills in the address, so you never see it."}
    if kind == "message":
        return {"type": "message", "label": f"Message {person}", "detail": f"Opens your chat with {person}."}
    return None


def choose(wanted, person, friend, interest, direction, day, feeds, nearby=True, surprise=False):
    """The suggested action if it can be made, else the first one in the fallback order that can."""
    order = [wanted] + [k for k in FALLBACK.get(direction, FALLBACK["flat"]) if k != wanted]
    for kind in order:
        a = build(kind, person, friend, interest, direction, day, feeds, nearby)
        if a:
            a["surprise"] = (bool(surprise) and kind in SURPRISE_OK) or kind == "treat"  # a treat is always a surprise
            a["suggested"] = wanted
            return a
    return None
