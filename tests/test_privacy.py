"""People outside the circle are never named to Muse. Offline: every Muse call is caught, not sent.

Arjun also talks to Jess, Chris and two group chats. Their timing can shape his
own numbers, but their names must never reach the read, the lift writer, the
privacy check, the journal or the Daily Page.
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine import daily_page, journal, lift, muse  # noqa: E402
from engine.demo import Demo  # noqa: E402
from engine.read import read  # noqa: E402

CANNED = {
    "read": {"families_off": [], "off_10_plus_days": False, "stretch": "none", "good_broad": False,
             "context_explains": False, "context": "", "crisis": "none", "afraid_of": [], "pressured_on": [],
             "good_with": [], "loop_closed_with": [], "log_reason": ""},
    "lift_write": {"options": ["Arjun could use a little lift this week. Maybe watch the next F1 race together?"]},
    "lift_check": {"leak": False, "harmless_if_wrong": True, "voice_ok": True, "interest_echoes": False, "reason": ""},
    "journal": {"reply": "Okay.", "step": "listen", "about": [], "about_chip": "", "connection": "", "chips": [],
                "feeling_words": [], "tone": "unclear", "safety": "none"},
    "own_words": {"options": [], "left_out": ""},
    "daily_page": "A full day.",
}


def outsiders(demo):
    """Everyone in his messages who isn't in his Iris circle, and every group chat's name."""
    names = set()
    for t in demo.profile["threads"]:
        names.update(o for o in t["others"] if o not in demo.circle)
        if t["group"]:
            names.add(t["title"])
    words = set()
    for n in names:
        words.add(n)
        if n.split()[0] not in {c.split()[0] for c in demo.circle}:
            words.add(n.split()[0])
    return sorted(w for w in words if w)


def test_no_outside_names_reach_muse():
    sent = []

    def fake_ask(system, user, schema=None, label="", **kw):
        sent.append((label, user))
        return json.loads(json.dumps(CANNED[label]))

    old = muse.ask
    muse.ask = fake_ask
    try:
        demo = Demo()
        hidden = outsiders(demo)
        assert hidden, "the demo should include people outside the circle"
        state = {"lifts_sent": [], "journal": {}}
        for i in range(20, len(demo.days)):
            s = demo.situation(i, state)
            read(s)
            for m in s["circle"]:
                if lift.pick_interest(m, s["pattern"]):
                    lift.write(s, m, "support")
            ctx = demo.journal_context(i)
            history = [{"role": "user", "text": "long day. sent some reels and went to bed late"}]
            journal.turn(history, ctx)
            journal.own_words(history, "Dev", ctx)
            daily_page.write_page(demo.day_facts(i))
    finally:
        muse.ask = old
    labels = {label for label, _ in sent}
    assert {"read", "lift_write", "lift_check", "journal", "own_words", "daily_page"} <= labels, labels
    for label, payload in sent:
        for name in hidden:
            assert not re.search(r"(?<!\w)" + re.escape(name) + r"(?!\w)", payload), (label, name)


if __name__ == "__main__":
    test_no_outside_names_reach_muse()
    print("privacy tests passed")
