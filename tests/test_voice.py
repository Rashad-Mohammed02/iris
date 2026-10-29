"""v2 word check: mood words pass, everything private still fails. Offline."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine.voice import lint, phrase_ok  # noqa: E402


def test_mood_words_now_pass():
    for text, interest in [
        ("Arjun, proud day. Two seats at the next F1 race to celebrate?", "F1"),
        ("Arjun, tired. Your best highlight from the NBA might be just the thing.", "the NBA"),
        ("Arjun, a bit low today. Lunch this week to swap film photography finds?", "film photography"),
        ("Arjun, a bit stressed. A small F1 plan this weekend?", "F1"),
        ("Arjun, a little sad. An F1 clip that made you laugh would fit right in.", "F1"),
        ("Arjun, happy day. A song to keep it going?", None),
    ]:
        assert lint(text, interest, person="Arjun") == [], (text, lint(text, interest, person="Arjun"))


def test_house_style_name_once():
    # The name opens the note and is never repeated: the nudge talks like a friend, not a button.
    assert "repeats the name Arjun in the nudge" in lint("Arjun, happy day. Send Arjun a song?", person="Arjun")
    assert "does not open with Arjun" in lint("Happy day for Arjun. A song to keep it going?", person="Arjun")
    assert lint("Arjun, tired. Lunch this week, your treat?", person="Arjun") == []


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
        assert lint(text, "F1", person="Arjun") == [], (text, lint(text, "F1", person="Arjun"))


if __name__ == "__main__":
    test_mood_words_now_pass()
    test_house_style_name_once()
    test_private_things_still_fail()
    test_names_and_private_terms()
    test_moment_check()
    test_fallback_passes()
    print("voice tests passed")
