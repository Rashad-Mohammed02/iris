"""The parser must never carry other people's words into events. Only his own (own_words, v2)."""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from data.parse_export import parse, DEFAULT_EXPORT  # noqa: E402


def test_no_other_people_text():
    events, profile = parse(DEFAULT_EXPORT)
    blob = json.dumps(events)
    assert "PLACEHOLDER" not in blob
    for e in events:
        if e["type"] == "message_received":
            assert set(e) <= {"ts", "day", "hour", "type", "frm", "thread", "group"}
        assert "content" not in e and "text" not in e
        if e.get("own_words"):
            assert e["type"] == "message_sent", e   # his own words only, never anyone else's


def test_shapes():
    events, profile = parse(DEFAULT_EXPORT)
    types = {e["type"] for e in events}
    assert {"reel_watched", "reel_sent", "message_sent", "message_received"} <= types
    assert profile["owner"]["name"] == "Arjun Rao"
    names = {c["name"] for c in profile["circle"]}
    assert {"Maya Chen", "Sam Okafor", "Dev Rao"} <= names


if __name__ == "__main__":
    test_no_other_people_text()
    test_shapes()
    print("parser tests passed")
