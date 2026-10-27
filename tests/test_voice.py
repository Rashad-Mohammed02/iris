"""The lint must pass good lifts and catch every kind of bad one. Offline."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine.voice import lint  # noqa: E402


def test_good_lifts_pass():
    for text, interest in [
        ("Arjun could use a little lift this week. Arjun's deep into F1 lately. Surprise Arjun with race tickets.", "F1"),
        ("Maya's had a full week. Pasta recipes are Maya's thing right now. Dinner's on you?", "pasta recipes"),
        ("Priya is due for something good. A roll of film for the film photography kick would make the week.", "film photography"),
    ]:
        assert lint(text, interest) == [], (text, lint(text, interest))


def test_bad_lifts_fail():
    cases = [
        "Arjun seems sad lately. He's into F1. Check on him.",          # feeling, pronoun, therapy
        "Arjun has been up late scrolling reels. Send F1 stuff.",        # signals
        "Arjun needs you right now — F1 tickets?",                  # needy, dash
        "Arjun could use a lift! F1 night?",                             # exclamation
        "Arjun could use a lift because of work. F1 night?",             # reason
    ]
    for text in cases:
        assert lint(text, "F1"), text


def test_whole_words_only():
    assert lint("Follow the F1 race with Arjun this weekend.", "F1") == []   # "low" inside "follow"
    assert lint("Arjun could use a lift. Down the street there's an F1 bar.", "F1")


def test_other_names_and_private_terms():
    assert "names someone else: Maya" in lint("Arjun could use a lift. Maya says F1.", "F1", other_names=["Maya"])
    assert lint("Arjun could use a lift. Halvorsen fans love F1.", "F1", private_terms=["Halvorsen"])


if __name__ == "__main__":
    test_good_lifts_pass()
    test_bad_lifts_fail()
    test_whole_words_only()
    test_other_names_and_private_terms()
    print("voice tests passed")
