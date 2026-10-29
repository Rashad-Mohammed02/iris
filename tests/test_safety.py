"""Help lines follow the person's country, and nothing else changes. Offline."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine import safety  # noqa: E402
from engine.decide import decide  # noqa: E402
from tests.test_decide import BASE_READ, m, sit  # noqa: E402


def test_help_line_by_country():
    for country, number in [("US", "988"), ("CA", "988"), ("GB", "116 123"), ("IE", "116 123"),
                            ("AU", "13 11 14"), ("IN", "14416"), ("gb", "116 123")]:
        for kind in ("suicide", "self_harm", "crisis_content"):
            assert number in safety.card(kind, country), (country, kind)
    assert "988" in safety.card("suicide") and "741741" in safety.card("self_harm")  # the demo defaults to the US
    for kind in ("suicide", "self_harm", "crisis_content", "fear"):
        text = safety.card(kind, "FR")
        assert "findahelpline.com" in text and "988" not in text and "1-800" not in text, text
    assert "1-800-799-7233" in safety.card("fear", "US") and "1-800" not in safety.card("fear", "GB")
    assert "741741" not in safety.card("self_harm", "CA")
    assert safety.card("minor", "GB") == safety.CARDS["minor"]


def test_decide_uses_the_persons_country():
    s = sit([m("A", "Always")])
    s["user"]["country"] = "GB"
    out = decide(s, reading=dict(BASE_READ, crisis="suicide"), write_lifts=False)
    assert "116 123" in out["cards"][0]["text"] and "988" not in out["cards"][0]["text"]
    s["user"]["country"] = "IN"
    s["pattern"]["signals"] = {"crisis_content": {"watched": 3}}
    assert "14416" in decide(s, write_lifts=False)["cards"][0]["text"]


if __name__ == "__main__":
    test_help_line_by_country()
    test_decide_uses_the_persons_country()
    print("safety tests passed")
