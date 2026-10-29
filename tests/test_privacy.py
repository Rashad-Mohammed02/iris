"""People outside Arjun's 5 are never named to Muse, and the note writer stays blind.
Offline: every Muse call is caught, not sent.

Arjun also talks to Jess, Chris and two group chats, and his calendar has a 1:1
with Jess and run club with Chris. Their timing can shape his own numbers, but
their names must never reach the day read, the note writer or the privacy check.
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine import muse  # noqa: E402
from engine.decide import decide  # noqa: E402
from engine.demo import Demo  # noqa: E402

CANNED = {
    "day": {"mood": "tired", "moment": "a long week", "size": "big", "crisis": "none", "why": "x",
            "fits": [{"name": n, "interest": "F1", "action": "song", "surprise": False}
                     for n in ("Maya", "Sam", "Dev", "Omar", "Priya")]},
    "note_write": {"options": ["Arjun, tired today. A song for tonight?"]},
    "note_check": {"leak": False, "harmless_if_wrong": True, "voice_ok": True, "interest_echoes": False, "reason": ""},
}


def catch():
    sent = []

    def fake_ask(system, user, schema=None, label="", **kw):
        sent.append((label, user))
        return json.loads(json.dumps(CANNED[label]))
    return sent, fake_ask


def test_no_outside_names_reach_muse():
    sent, fake = catch()
    old = muse.ask
    muse.ask = fake
    try:
        demo = Demo()
        hidden = demo.outsiders()
        assert {"Jess", "Chris", "Tasha", "Ravi"} <= set(hidden), hidden
        for i in range(14, len(demo.days)):
            decide(demo.situation(i))
    finally:
        muse.ask = old
    labels = {label for label, _ in sent}
    assert {"day", "note_write", "note_check"} <= labels, labels
    for label, payload in sent:
        for name in hidden:
            assert not re.search(r"(?<!\w)" + re.escape(name) + r"(?!\w)", payload), (label, name)


def test_note_writer_is_blind():
    """The writer sees only the name, relation, mood, one interest and the action type. Never the day."""
    sent, fake = catch()
    old = muse.ask
    muse.ask = fake
    try:
        demo = Demo()
        decide(demo.situation(40))     # the blood-test day
    finally:
        muse.ask = old
    writes = [json.loads(p) for label, p in sent if label == "note_write"]
    assert writes
    for w in writes:
        assert set(w) <= {"person", "relation", "mood", "interest", "action", "language",
                          "recent_notes_to_this_friend", "avoid_these_problems"}, set(w)
        blob = json.dumps(w).lower()
        for private in ("blood", "lab", "moment", "long week", "maya", "sam", "omar", "priya", "dev"):
            assert private not in blob, private


if __name__ == "__main__":
    test_no_outside_names_reach_muse()
    test_note_writer_is_blind()
    print("privacy tests passed")
