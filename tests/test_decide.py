"""Every gate, with fake Muse readings. Offline: no model call is made."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import engine.decide as dec  # noqa: E402
from engine.connectors import Feeds  # noqa: E402
from engine.decide import decide  # noqa: E402


def reading(size="ordinary", mood="happy", crisis="none", fits=None):
    from engine.day import MOODS
    return {"mood": mood, "direction": MOODS[mood], "moment": "an ordinary day", "size": size, "crisis": crisis,
            "why": "x", "fits": fits or {}}


def sit(circle, age=30, use_day=40, own_words=(), settings=None, crisis_content=None, teen=False):
    return {"user": {"name": "Arjun", "age": age, "teen_account": teen},
            "settings": settings or {}, "circle": circle,
            "day": {"date": "2026-10-20", "use_day": use_day,
                    "talk": {"own_words": list(own_words)}, "see": {"crisis_content": crisis_content or {}}},
            "feeds": Feeds()}


def m(name, setting="every_day", mutual=True, age=None, teen=False):
    return {"name": name, "setting": setting, "mutual": mutual, "age": age, "teen_account": teen,
            "allowed_interests": ["F1"]}


def to(out):
    return sorted(n["to"] for n in out["notes"])


def run(s, **kw):
    return decide(s, reading=reading(**kw), write_notes=False)


def test_settings():
    c = [m("E"), m("B", "big_moments"), m("N", "never")]
    assert to(run(sit(c))) == ["E"]                       # an ordinary day still reaches Every day
    assert to(run(sit(c), size="notable")) == ["E"]
    assert to(run(sit(c), size="big")) == ["B", "E"]
    for mood in ("happy", "tired", "low", "calm"):        # any direction counts
        assert to(run(sit(c), mood=mood)) == ["E"]
    assert "Big moments only (today was ordinary)" in [x["why"] for x in run(sit(c))["not_sent"]]
    assert to(run(sit([{"name": "D", "mutual": True, "allowed_interests": ["F1"]}]))) == ["D"]  # every_day is the norm


def test_mutual_adults_pause_learning():
    assert to(run(sit([m("A", mutual=False)]))) == []
    assert to(run(sit([m("A", age=16)]))) == []
    assert to(run(sit([m("A", teen=True)]))) == []
    assert to(run(sit([m("A")], settings={"paused": True}))) == []
    assert to(run(sit([m("A")], use_day=14))) == [] and to(run(sit([m("A")], use_day=15))) == ["A"]


def test_minor_user_gets_nothing_and_no_read():
    for s in (sit([m("A")], age=17), sit([m("A")], teen=True)):
        out = run(s)
        assert to(out) == [] and out["cards"][0]["kind"] == "minor" and out["read"] is None


def test_crisis_sends_nothing():
    c = [m("A"), m("B", "big_moments")]
    out = run(sit(c), size="big", crisis="suicide")
    assert to(out) == [] and out["cards"][0]["kind"] == "crisis" and "988" in out["cards"][0]["text"]


def test_crisis_before_any_model_call():
    def no_model(*a, **k):
        raise AssertionError("the model must not be asked anything here")
    old = dec.read_day
    dec.read_day = no_model
    try:
        out = decide(sit([m("A")], own_words=["honestly i want to end it all"]))
        assert to(out) == [] and out["cards"][0]["kind"] == "crisis"
        out = decide(sit([m("A")], crisis_content={"watched": 3, "chosen": 0}))
        assert to(out) == [] and out["cards"][0]["kind"] == "crisis_content"
        out = decide(sit([m("A")], use_day=3, own_words=["i keep hurting myself"]))   # even while learning
        assert out["cards"][0]["kind"] == "crisis"
    finally:
        dec.read_day = old


def test_never_named_to_muse():
    seen = []

    def fake_read(situation, friends, effort="medium"):
        seen.extend(f["name"] for f in friends)
        return reading()
    old = dec.read_day
    dec.read_day = fake_read
    try:
        decide(sit([m("E"), m("N", "never"), m("U", mutual=False), m("K", age=15)]), write_notes=False)
    finally:
        dec.read_day = old
    assert seen == ["E"]


def test_send_mode_time_and_signature():
    import engine.note as note
    old = note.write
    note.write = lambda situation, member, r, action, recent=(): {"to": member["name"], "interest": "F1",
                                                                  "text": "Arjun, happy day. F1?", "attempts": [],
                                                                  "fallback": False}
    try:
        out = decide(sit([m("A")], settings={"note_time": "19:30"}), reading=reading())
        n = out["notes"][0]
        assert n["status"] == "queued" and n["sends_at"] == "2026-10-20T19:30" and n["cancel_until"] == "2026-10-20T19:40"
        assert n["signature"] == "Suggested by Muse. Arjun didn't ask."
        n = decide(sit([m("A")], settings={"send_mode": "ask"}), reading=reading())["notes"][0]
        assert n["status"] == "waiting_for_ok" and "cancel_until" not in n and n["signature"] == "Suggested by Muse."
        assert n["sends_at"] == "2026-10-20T18:00"   # default time of day
    finally:
        note.write = old


def test_sources_switched_off_never_reach_muse():
    got = {}

    def fake_read(situation, friends, effort="medium"):
        got.update(situation["day"])
        return reading()
    old = dec.read_day
    dec.read_day = fake_read
    try:
        s = sit([m("A")], settings={"sources": {"spotify": False, "calendar": False}})
        s["day"].update(hear={"plays": 3}, happens={"today": []})
        decide(s, write_notes=False)
    finally:
        dec.read_day = old
    assert "hear" not in got and "happens" not in got and "talk" in got


if __name__ == "__main__":
    test_settings()
    test_mutual_adults_pause_learning()
    test_minor_user_gets_nothing_and_no_read()
    test_crisis_sends_nothing()
    test_crisis_before_any_model_call()
    test_never_named_to_muse()
    test_send_mode_time_and_signature()
    test_sources_switched_off_never_reach_muse()
    print("decide tests passed")
