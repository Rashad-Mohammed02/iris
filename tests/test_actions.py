"""Ready actions come only from what the feeds can back. Offline."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine import actions  # noqa: E402
from engine.connectors import Feeds  # noqa: E402

CAL = {"events": [
    {"id": "1", "title": "Standup", "start": "2026-10-21T12:00", "end": "2026-10-21T13:00", "kind": "work"},
    {"id": "2", "title": "Grand Prix night", "start": "2026-10-30T19:00", "end": "2026-10-30T23:00", "kind": "show",
     "public": True, "interest": "F1", "tickets": {"seller": "Ticketmaster"}},
    {"id": "3", "title": "Blood test", "start": "2026-10-25T08:00", "end": "2026-10-25T08:30", "kind": "health"},
    {"id": "4", "title": "Trip", "start": "2026-10-22T06:00", "end": "2026-10-22T22:00", "all_day": True, "kind": "trip"}],
    "free_busy": {"Sam Okafor": [{"start": "2026-10-23T12:00", "end": "2026-10-23T13:00"}]}}
SPOT = {"plays": [{"ts": f"2026-10-{d:02d}T09:00", "master_metadata_track_name": t, "master_metadata_album_artist_name": "A",
                   "ms_played": 1, "x_valence": v, "x_energy": e}
                  for d in range(10, 20) for t, v, e in (("Bright", 0.9, 0.9), ("Warm", 0.55, 0.4))]}
F = Feeds(CAL, SPOT)


def test_lunch_needs_both_free_and_nearby():
    a = actions.build("lunch", "Arjun", "Sam", "F1", "flat", "2026-10-20", F)
    # Wed 21 Arjun has noon to 1, so 1 PM; Thu 22 is a trip
    assert a["type"] == "lunch" and a["when"] == "2026-10-21T13:00" and "OpenTable" in a["detail"]
    assert actions.build("lunch", "Arjun", "Sam", "F1", "flat", "2026-10-20", F, nearby=False) is None
    assert actions.build("lunch", "Arjun", "Maya", "F1", "flat", "2026-10-20", F) is None   # shares no free/busy


def test_tickets_only_for_public_shows_that_fit():
    a = actions.build("tickets", "Arjun", "Sam", "F1", "up", "2026-10-20", F)
    assert a["label"] == "Tickets: Grand Prix night" and "Ticketmaster" in a["detail"]
    assert actions.build("tickets", "Arjun", "Sam", "the NBA", "up", "2026-10-20", F) is None


def test_song_from_usual_favorites():
    assert actions.build("song", "Arjun", "Sam", None, "up", "2026-10-20", F)["detail"] == "Bright by A"
    assert actions.build("song", "Arjun", "Sam", None, "down", "2026-10-20", F)["detail"] == "Warm by A"
    assert actions.build("song", "Arjun", "Sam", None, "up", "2026-10-20", Feeds()) is None


def test_fallback_order_and_surprise():
    a = actions.choose("tickets", "Arjun", "Sam", "the NBA", "up", "2026-10-20", F, surprise=True)
    assert a["type"] == "lunch" and a["suggested"] == "tickets" and a["surprise"] is False
    a = actions.choose("treat", "Arjun", "Sam", "F1", "down", "2026-10-20", Feeds())
    assert a["type"] == "treat" and a["surprise"] is True and "address" in a["detail"]
    a = actions.choose("lunch", "Arjun", "Sam", "F1", "flat", "2026-10-20", Feeds(), nearby=False)
    assert a["type"] == "reel"
    assert actions.choose("song", "Arjun", "Sam", None, "flat", "2026-10-20", Feeds())["type"] == "message"


def test_no_action_ever_shows_private_events():
    for kind in actions.TYPES:
        a = actions.choose(kind, "Arjun", "Sam", "F1", "flat", "2026-10-20", F)
        assert "Blood" not in str(a) and "Trip" not in str(a)


if __name__ == "__main__":
    test_lunch_needs_both_free_and_nearby()
    test_tickets_only_for_public_shows_that_fit()
    test_song_from_usual_favorites()
    test_fallback_order_and_surprise()
    test_no_action_ever_shows_private_events()
    print("action tests passed")
