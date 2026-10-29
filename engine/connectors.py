"""The two connector feeds besides Instagram: calendar (what happens to you) and
Spotify (what you hear).

SIMULATED. In the demo and on the bench both feeds are fictional JSON files in
the simple format below (see data/README.md, "Connector feeds"). No real
calendar or Spotify account is read anywhere in this repo. A real build would
fill the same shape from the person's own connected accounts.

calendar.json
  {"owner": "Arjun Rao", "timezone": "America/New_York",
   "events": [{"id", "title", "start": "2026-10-14T19:00", "end": "2026-10-14T22:00", "all_day": false,
               "kind": "exam|results|study|work|deadline|trip|show|social|health|routine",
               "with": ["Maya Chen"], "location": "...", "status": "confirmed|tentative|cancelled",
               "public": true, "interest": "F1", "tickets": {"seller": "Ticketmaster"}}],
   "free_busy": {"Maya Chen": [{"start": "...", "end": "..."}]}}     # friends share busy times only, never titles

spotify.json (field names follow Spotify's extended streaming history; x_ fields are simulated)
  {"plays": [{"ts": "2026-10-14T08:12", "master_metadata_track_name", "master_metadata_album_artist_name",
              "ms_played", "x_valence": 0.0-1.0, "x_energy": 0.0-1.0}]}

Plain Python, no AI.
"""

import json
from datetime import date, datetime, timedelta
from pathlib import Path
from statistics import mean, median

ROOT = Path(__file__).resolve().parent.parent
DEMO_DIR = ROOT / "data" / "demo_connectors"

LUNCH = (12 * 60, 14 * 60)   # lunch slots are looked for between noon and 2 PM
LUNCH_MINUTES = 60
BUSY_ALL_DAY = {"trip"}      # an all-day trip blocks lunch; an all-day deadline does not


def _dt(s):
    return datetime.fromisoformat(s)


def _day(s):
    return s[:10]


def first(name):
    return (name or "").split()[0]


def _same_person(a, b):
    return a == b or first(a) == first(b)


class Feeds:
    def __init__(self, calendar=None, spotify=None):
        self.calendar = calendar or {"events": [], "free_busy": {}}
        self.spotify = spotify or {"plays": []}
        self.events = sorted(self.calendar.get("events", []), key=lambda e: e["start"])
        self.plays = sorted(self.spotify.get("plays", []), key=lambda p: p["ts"])
        self._plays_by_day = {}
        for p in self.plays:
            self._plays_by_day.setdefault(_day(p["ts"]), []).append(p)

    @classmethod
    def demo(cls):
        cal, sp = DEMO_DIR / "calendar.json", DEMO_DIR / "spotify.json"
        return cls(json.loads(cal.read_text()) if cal.exists() else None,
                   json.loads(sp.read_text()) if sp.exists() else None)

    # ---- calendar -------------------------------------------------------
    def events_on(self, day):
        """Events touching this day (a 3-day trip shows on each of its days)."""
        return [e for e in self.events if _day(e["start"]) <= day <= _day(e["end"])]

    def busy(self, day, friend=None):
        """Busy blocks for the owner (friend=None) or a friend, as (start, end) minutes on this day."""
        out = []
        if friend is None:
            for e in self.events_on(day):
                if e.get("status") == "cancelled":
                    continue
                if e.get("all_day"):
                    if e.get("kind") in BUSY_ALL_DAY:
                        out.append((0, 24 * 60))
                    continue
                s, t = _dt(e["start"]), _dt(e["end"])
                out.append((s.hour * 60 + s.minute if _day(e["start"]) == day else 0,
                            t.hour * 60 + t.minute if _day(e["end"]) == day else 24 * 60))
            return out
        fb = next((v for k, v in self.calendar.get("free_busy", {}).items() if _same_person(k, friend)), None)
        if fb is None:
            return None  # this friend shares no free/busy, so no lunch can be offered
        for b in fb:
            if _day(b["start"]) == day:
                s, t = _dt(b["start"]), _dt(b["end"])
                out.append((s.hour * 60 + s.minute, t.hour * 60 + t.minute))
        return out

    def free_lunch(self, friend, day, days=3):
        """The first hour between noon and 2 PM, in the next `days` days, when both are free."""
        d0 = date.fromisoformat(day)
        for k in range(1, days + 1):
            d = (d0 + timedelta(days=k)).isoformat()
            mine, theirs = self.busy(d), self.busy(d, friend)
            if theirs is None:
                return None
            blocks = mine + theirs
            for start in range(LUNCH[0], LUNCH[1] - LUNCH_MINUTES + 1, 30):
                end = start + LUNCH_MINUTES
                if all(end <= a or start >= b for a, b in blocks):
                    return {"day": d, "start": start, "end": end}
        return None

    def show_for(self, interest, day, within=30):
        """An upcoming public event with tickets that fits this interest."""
        d0 = date.fromisoformat(day)
        last = (d0 + timedelta(days=within)).isoformat()
        for e in self.events:
            if (day < _day(e["start"]) <= last and e.get("public") and e.get("tickets")
                    and e.get("status") != "cancelled" and (e.get("interest") or "").lower() == (interest or "").lower()):
                return e
        return None

    # ---- Spotify --------------------------------------------------------
    def plays_on(self, day):
        return self._plays_by_day.get(day, [])

    def listening(self, day, history=28):
        """Today's listening against his own usual: how much, and how bright or slow it sounds."""
        today = self.plays_on(day)
        d0 = date.fromisoformat(day)
        past = [(d0 - timedelta(days=k)).isoformat() for k in range(1, history + 1)]
        past = [d for d in past if d in self._plays_by_day]
        if not today and not past:
            return None
        counts = {}
        for p in today:
            key = (p["master_metadata_track_name"], p["master_metadata_album_artist_name"])
            counts[key] = counts.get(key, 0) + 1
        top = sorted(counts.items(), key=lambda kv: -kv[1])[:3]
        usual_val = median(mean(p["x_valence"] for p in self.plays_on(d)) for d in past) if past else None
        usual_en = median(mean(p["x_energy"] for p in self.plays_on(d)) for d in past) if past else None
        val = round(mean(p["x_valence"] for p in today), 2) if today else None
        en = round(mean(p["x_energy"] for p in today), 2) if today else None
        return {
            "plays": len(today),
            "usual_plays": round(median(len(self.plays_on(d)) for d in past)) if past else None,
            "brightness": val, "usual_brightness": round(usual_val, 2) if usual_val is not None else None,
            "energy": en, "usual_energy": round(usual_en, 2) if usual_en is not None else None,
            "top_tracks": [{"track": t, "artist": a, "plays": n} for (t, a), n in top],
            "on_repeat": top[0][0][0] if top and top[0][1] >= 4 else None,
        }

    def favorite_song(self, day, direction, history=28):
        """A song from his own usual favorites (never today's), bright for good days, warm and calm otherwise."""
        d0 = date.fromisoformat(day)
        counts, feel = {}, {}
        for k in range(1, history + 1):
            for p in self.plays_on((d0 - timedelta(days=k)).isoformat()):
                key = (p["master_metadata_track_name"], p["master_metadata_album_artist_name"])
                counts[key] = counts.get(key, 0) + 1
                feel[key] = (p["x_valence"], p["x_energy"])
        if not counts:
            return None
        if direction == "up":
            fits = [k for k in counts if feel[k][0] >= 0.65]
        else:
            fits = [k for k in counts if 0.4 <= feel[k][0] < 0.75 and feel[k][1] < 0.6]
        pool = fits or list(counts)
        best = max(pool, key=lambda k: (counts[k], k))
        return {"track": best[0], "artist": best[1]}
