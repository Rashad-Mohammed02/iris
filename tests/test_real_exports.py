"""Here's reader works on real Instagram downloads, not just our own demo files.

Runs only when data/real_exports exists (python3 scripts/fetch_real_exports.py).
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from data.parse_export import parse  # noqa: E402
from engine.rule import evaluate  # noqa: E402

REAL = ROOT / "data" / "real_exports"


def test_reads_every_real_export():
    if not REAL.exists():
        print("skipped: no real exports (run scripts/fetch_real_exports.py)")
        return
    seen = 0
    for export in sorted(p for p in REAL.iterdir() if p.is_dir()):
        events, profile = parse(export, tz="Europe/Amsterdam")
        assert profile["owner"]["username"], export.name
        assert all(e["type"] != "message_received" or "text" not in e for e in events), "never keep other people's words"
        res = evaluate(events, profile)
        assert all(r["learning"] or not r["off_day"] for r in res[:14]), "nothing is judged in the first two weeks"
        seen += 1
    assert seen >= 10


if __name__ == "__main__":
    test_reads_every_real_export()
    print("real export tests passed")
