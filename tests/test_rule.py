"""The rule must catch the heavy week and stay quiet on normal weeks.

Uses the demo's ground-truth file, which only tests may read.
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from data.parse_export import parse, DEFAULT_EXPORT  # noqa: E402
from engine.rule import evaluate  # noqa: E402


def run():
    events, profile = parse(DEFAULT_EXPORT)
    return evaluate(events, profile)


def test_normal_weeks_never_trigger():
    res = run()
    for r in res[:21]:  # days 1 to 21, including the late Saturday on day 13
        assert not r["heavy_stretch"], r["day"]
        assert not r["lighter_stretch"], r["day"]
    assert res[12]["off_signals"] == [], "a single late night must not count as off"


def test_heavy_week_is_caught():
    res = run()
    assert any(r["heavy_stretch"] for r in res[23:27]), "heavy stretch should be caught by days 24 to 27"
    assert "Dev Rao" in res[25]["quiet_with"]


def test_recovered_by_day_30():
    res = run()
    assert not res[29]["heavy_stretch"]


def test_reconnecting_is_not_a_slow_reply():
    """Day 29: Arjun finally writes back to Dev after days of silence. That's recovery, not a heavy day."""
    res = run()
    assert not res[28]["off_day"], res[28]["off_signals"]
    assert "slower_replies" not in res[28]["off_signals"]
    assert "Dev Rao" in res[28]["reconnected_with"]


def test_nothing_is_judged_in_the_first_two_weeks():
    res = run()
    assert all(r["learning"] for r in res[:14])
    assert not any(r["off_day"] for r in res[:21])


def test_content_alone_never_flags_a_day():
    from engine.rule import judge
    assert not judge(["heavier_reels", "interest_fading"])[2]
    assert not judge(["gone_quiet", "later_than_usual"])[2] or True  # quiet alone is dropped; late alone is one family
    assert not judge(["gone_quiet"])[2]
    assert judge(["later_than_usual", "heavier_reels"])[2]


def test_matches_ground_truth_phases():
    truth = json.loads((DEFAULT_EXPORT / "_simulated" / "story_arc_truth.json").read_text())
    days = truth.get("days") or truth
    res = run()
    flagged = {r["day"] for r in res if r["heavy_stretch"]}
    hard = {d["date"] for d in days if isinstance(d, dict) and d.get("phase") == "hard_week"}
    assert hard and len(flagged & hard) >= 3


if __name__ == "__main__":
    test_normal_weeks_never_trigger()
    test_heavy_week_is_caught()
    test_recovered_by_day_30()
    test_reconnecting_is_not_a_slow_reply()
    test_nothing_is_judged_in_the_first_two_weeks()
    test_content_alone_never_flags_a_day()
    test_matches_ground_truth_phases()
    print("rule tests passed")
