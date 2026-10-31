"""The word check: mood words pass, everything private still fails. Offline."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine.voice import lint, phrase_ok  # noqa: E402


def test_mood_words_now_pass():
    for text, interest in [
        ("Arjun's feeling proud today. Two seats at the next F1 race would be a fun way to celebrate.", "F1"),
        ("Arjun's feeling a bit tired today. A quick message about the NBA could make the day.", "the NBA"),
        ("Arjun's feeling a bit low today. How about lunch this week to talk film photography?", "film photography"),
        ("Arjun has a lot on today. Maybe plan a small F1 night this weekend?", "F1"),
        ("Arjun's having a great day. An F1 clip that made you laugh would fit right in.", "F1"),
        ("Arjun's having a good day. Maybe send a song to keep it going?", None),
    ]:
        assert lint(text, interest, person="Arjun") == [], (text, lint(text, interest, person="Arjun"))


def test_house_style_name_once():
    # The name opens the note and is never repeated: the nudge talks like a friend, not a button.
    assert "repeats the name Arjun in the nudge" in lint("Arjun's having a good day. Send Arjun a song?", person="Arjun")
    assert "does not open with Arjun" in lint("A good day for Arjun. Maybe send a song?", person="Arjun")
    assert lint("Arjun's feeling a bit tired today. How about lunch this week?", person="Arjun") == []


def test_opener_reads_right():
    from engine.note import opener
    assert opener("Arjun", "a bit low") == "Arjun's feeling a bit low today."
    assert opener("Arjun", "a great day") == "Arjun's having a great day."
    assert opener("Arjun", "a lot on") == "Arjun has a lot on today."
    assert opener("Arjun", "tired") == "Arjun's feeling a bit tired today."
    assert opener("Arjun", "busy") == "Arjun's busy today."
    assert opener("Arjun", "excited") == "Arjun's feeling excited today."


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
    from engine.note import FALLBACK, opener
    for mood in ("a good day", "a bit low", "a lot on", "tired", "proud"):
        text = FALLBACK.format(opener=opener("Arjun", mood), interest="F1")
        assert lint(text, "F1", person="Arjun") == [], (text, lint(text, "F1", person="Arjun"))


if __name__ == "__main__":
    test_mood_words_now_pass()
    test_house_style_name_once()
    test_opener_reads_right()
    test_private_things_still_fail()
    test_names_and_private_terms()
    test_moment_check()
    test_fallback_passes()
    print("voice tests passed")
