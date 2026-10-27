"""Nothing risky or heavy may ever become an interest. Runs offline, no Muse call."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from data.parse_export import parse, DEFAULT_EXPORT  # noqa: E402
from engine.interests import NEVER, candidates, guard  # noqa: E402


def test_heavy_themes_never_reach_muse():
    events, profile = parse(DEFAULT_EXPORT)
    names = " ".join(c["key"] for c in candidates(events, profile))
    for bad in ("burnout", "exhaustion", "sad_music", "strong_friend", "relationship_support", "wellness",
                "Personal finance", "fitness", "couple"):
        assert bad not in names, bad
    assert "reel:f1" in names


def test_guard_drops_risky_and_untraced_picks():
    cands = [{"key": "reel:f1", "name": "f1"}, {"key": "reel:coffee", "name": "coffee"}]
    picks = [
        {"name": "F1", "lately": True, "from": ["reel:f1"]},
        {"name": "craft beer", "lately": False, "from": ["reel:coffee"]},
        {"name": "wine bars", "lately": False, "from": ["reel:coffee"]},
        {"name": "skydiving", "lately": False, "from": ["reel:made_up"]},
        {"name": "f1", "lately": False, "from": ["reel:f1"]},
    ]
    assert [p["name"] for p in guard(picks, cands)] == ["F1"]


def test_never_list_spot_checks():
    for word in ("Cocktails", "home brewing", "gym", "investing", "mental health", "vape", "mezcal tasting",
                 "tequila", "smoking"):
        assert NEVER.search(word), word
    for word in ("F1", "film photography", "home espresso", "the NBA", "Barcelona", "smoked wings", "ginger cookies"):
        assert not NEVER.search(word), word


if __name__ == "__main__":
    test_heavy_themes_never_reach_muse()
    test_guard_drops_risky_and_untraced_picks()
    test_never_list_spot_checks()
    print("interest tests passed")
