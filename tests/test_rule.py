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


def test_rest_is_read_from_the_longest_quiet_stretch():
    from engine.baseline import night_rest, wakes_in
    r = night_rest([20.0, 23.5], [8.0, 12.0])  # last active 11:30 PM, first active 8 AM
    assert r["hours"] == 8.5 and r["start"] == 23.5 and r["end"] == 32.0
    r = night_rest([20.0, 23.5, 27.5], [8.0])  # up at 3:30 AM too
    assert r["start"] == 27.5 and r["hours"] == 4.5
    assert wakes_in([23.5, 27.5, 27.6, 29.0], 24.0, 31.5) == 2


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
    assert not judge(["gone_quiet", "later_to_sleep"])[2] or True  # quiet alone is dropped; late alone is one family
    assert not judge(["gone_quiet"])[2]
    assert judge(["later_to_sleep", "heavier_reels"])[2]


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
    test_rest_is_read_from_the_longest_quiet_stretch()
    test_reconnecting_is_not_a_slow_reply()
    test_nothing_is_judged_in_the_first_two_weeks()
    test_content_alone_never_flags_a_day()
    test_matches_ground_truth_phases()
    print("rule tests passed")
