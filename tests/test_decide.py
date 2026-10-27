"""Every permission and safety gate, with fake Muse readings. Offline."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine.decide import decide  # noqa: E402

BASE_READ = {"stretch": "clearly_heavy", "context_explains": False, "context": "", "crisis": "none",
             "afraid_of": [], "pressured_on": [], "good_with": [], "loop_closed_with": [], "log_reason": "x",
             "fear_flag": False, "pressure_flag": False, "good_broad": False}


def sit(circle, age=30, day=40, journal=(), settings=None):
    return {"user": {"name": "Arjun", "age": age}, "circle": circle,
            "pattern": {"learning_day": day, "signals": {}, "journal": list(journal), "settings": settings or {}}}


def m(name, level, mutual=True, lifts=0, used=False):
    return {"name": name, "permission": level, "mutual": mutual, "lifts_last_7_days": lifts,
            "just_this_once_used": used, "allowed_interests": ["F1"]}


def to(out):
    return sorted(l["to"] for l in out["lifts"])


def run(s, **read):
    return decide(s, reading=dict(BASE_READ, **read), write_lifts=False)


def test_permissions():
    c = [m("A", "Always"), m("W", "When it matters"), m("O", "Just this once"), m("N", "Never")]
    assert to(run(sit(c))) == ["A", "O", "W"]
    assert to(run(sit(c), stretch="off_normal")) == ["A", "O"]
    assert to(run(sit(c), stretch="none")) == []
    assert to(run(sit(c), stretch="good", good_broad=True)) == ["A"]
    assert to(run(sit(c), stretch="good", good_broad=False)) == []
    assert to(run(sit([m("O", "Just this once", used=True)]))) == []


def test_limits_and_mutual():
    assert to(run(sit([m("A", "Always", lifts=1)]))) == []
    assert to(run(sit([m("A", "Always", mutual=False)]))) == []
    assert to(run(sit([m("A", "Always")], settings={"pause": "all lifts paused"}))) == []
    assert to(run(sit([m("A", "Always")], day=5))) == []
    assert to(run(sit([m("A", "Always")]), context_explains=True)) == []


def test_safety():
    c = [m("A", "Always"), m("W", "When it matters")]
    out = run(sit(c), crisis="suicide")
    assert to(out) == [] and out["cards"][0]["kind"] == "crisis" and "988" in out["cards"][0]["text"]
    out = run(sit(c), fear_flag=True, afraid_of=["A"])
    assert to(out) == [] and out["state_after"]["A"] == {"in_circle": False, "notified": False}
    out = run(sit(c), pressure_flag=True, pressured_on=["A"], afraid_of=["A"], fear_flag=True)
    assert to(out) == [] and out["state_after"]["A"]["effective_permission"] == "Never"
    out = run(sit(c, age=17))
    assert to(out) == [] and out["cards"][0]["kind"] == "minor" and out["read"] is None


if __name__ == "__main__":
    test_permissions()
    test_limits_and_mutual()
    test_safety()
    print("decide tests passed")
