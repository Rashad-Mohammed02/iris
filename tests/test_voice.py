"""v2 word check: mood words pass, everything private still fails. Offline."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine.voice import lint, phrase_ok  # noqa: E402


def test_mood_words_now_pass():
    for text, interest in [
        ("Arjun, proud day. Grab two seats with Arjun for the next F1 race?", "F1"),
        ("Arjun, tired today. Send Arjun your best NBA highlight?", "NBA"),
        ("Arjun, a bit low. Lunch with Arjun this week to swap film photography finds?", "film photography"),
        ("Arjun, stressed today. A small F1 plan with Arjun this weekend?", "F1"),
        ("Arjun, a bit sad. Send Arjun an F1 clip that made you laugh?", "F1"),
    ]:
        assert lint(text, interest) == [], (text, lint(text, interest))


def test_private_things_still_fail():
    cases = [
        "Arjun, depressed today. Check on Arjun with an F1 clip?",          # diagnosis, therapy
        "Arjun, low today. Arjun said \"not my best day\", so send F1?",    # quoting his messages
        "Arjun, tired. The blood test went fine, F1 night?",                # health
        "Arjun, stressed. Rent is due, so maybe an F1 night?",              # money
        "Arjun, sad after the breakup. F1 night?",                          # relationship detail
        "Arjun, low after the layoff. F1 night?",                           # work trouble
        "Arjun, low. Arjun has been up late scrolling. F1?",                # source, three sentences
        "Arjun, low today. He needs you, F1 night?",                        # pronoun, needy
        "Arjun, happy day! F1 night?",                                      # exclamation
        "Arjun, happy day — F1 night?",                               # dash
        "Arjun, low today. Arjun is feeling suicidal, F1?",                 # crisis
    ]
    for text in cases:
        assert lint(text, "F1"), text


def test_names_and_private_terms():
    assert "names someone else: Maya" in lint("Arjun, happy. Maya says F1 night?", "F1", other_names=["Maya"])
    assert lint("Arjun, happy. Chicago was fun, F1 night?", "F1", private_terms=["Chicago"])


def test_moment_check():
    assert phrase_ok("exam tomorrow") == [] and phrase_ok("back from a trip") == []
    assert phrase_ok("a weekend in chicago", private_terms=["Chicago"])
    assert phrase_ok("a blood test") and phrase_ok("the breakup") and phrase_ok("a very long and hard week at work")


def test_fallback_passes():
    from engine.note import FALLBACK
    for mood in ("happy", "tired", "low", "okay", "proud"):
        text = FALLBACK.format(name="Arjun", mood=mood, interest="F1")
        assert lint(text, "F1") == [], (text, lint(text, "F1"))


if __name__ == "__main__":
    test_mood_words_now_pass()
    test_private_things_still_fail()
    test_names_and_private_terms()
    test_moment_check()
    test_fallback_passes()
    print("voice tests passed")
