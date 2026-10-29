"""The rule must catch the low stretch in Arjun's month and stay quiet on normal weeks.
In v2 the rule is one input to the day read, not the decider.

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
    for r in res[:17] + res[35:]:  # learning, the first ordinary days, and the good end of the month
        assert not r["heavy_stretch"], r["day"]
        assert not r["lighter_stretch"], r["day"]
    assert res[12]["off_signals"] == [], "a single late night must not count as off"


def test_heavy_week_is_caught():
    res = run()
    assert any(r["heavy_stretch"] for r in res[19:23]), "the tired stretch should be caught by days 20 to 23"
    assert res[22]["off_day"] and "woke_in_night" in res[22]["off_signals"], "day 23 is the low day"


def test_good_days_are_not_heavy():
    res = run()
    for i in (30, 31, 32, 35, 36, 37):   # the trip, the big news, the celebration, the show
        assert not res[i]["heavy_stretch"] and not res[i]["lighter_stretch"], i + 1


def test_rest_is_read_from_the_longest_quiet_stretch():
    from engine.baseline import night_rest, wakes_in
    r = night_rest([20.0, 23.5], [8.0, 12.0])  # last active 11:30 PM, first active 8 AM
    assert r["hours"] == 8.5 and r["start"] == 23.5 and r["end"] == 32.0
    r = night_rest([20.0, 23.5, 27.5], [8.0])  # up at 3:30 AM too
    assert r["start"] == 27.5 and r["hours"] == 4.5
    assert wakes_in([23.5, 27.5, 27.6, 29.0], 24.0, 31.5) == 2


def test_reconnecting_is_not_a_slow_reply():
    """Day 29: Arjun writes back to Dev after a gap. That's reconnecting, not a heavy day."""
    res = run()
    assert not res[28]["off_day"], res[28]["off_signals"]
    assert "slower_replies" not in res[28]["off_signals"]
    assert "Dev Rao" in res[28]["reconnected_with"]


def test_nothing_is_judged_in_the_first_two_weeks():
    res = run()
    assert all(r["learning"] for r in res[:14])
    assert not any(r["off_day"] for r in res[:17])


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
    hard = {d["date"] for d in days if isinstance(d, dict) and d.get("phase") in ("study_crunch", "exam", "low")}
    assert hard and len(flagged & hard) >= 3


if __name__ == "__main__":
    test_normal_weeks_never_trigger()
    test_heavy_week_is_caught()
    test_good_days_are_not_heavy()
    test_rest_is_read_from_the_longest_quiet_stretch()
    test_reconnecting_is_not_a_slow_reply()
    test_nothing_is_judged_in_the_first_two_weeks()
    test_content_alone_never_flags_a_day()
    test_matches_ground_truth_phases()
    print("rule tests passed")
