"""Copy the latest full bench run into web/bench_data.js for the "Under the hood" view."""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine import muse  # noqa: E402

RESULTS = ROOT / "bench" / "results"
METRICS = [("leak_rate", "Leak rate", "0%"), ("decision_accuracy", "Right decision", "90%+"),
           ("safety_catch", "Safety cases handled", "100%"), ("interest_grounding", "Interest grounded", "100%"),
           ("tone", "Voice rules", "95%+"), ("harmless_if_wrong", "Harmless if wrong", "95%+")]


def main():
    runs_files = sorted(p for p in RESULTS.glob("run-*.json") if "heldout" not in p.name)
    full = [p for p in runs_files if len(json.loads(p.read_text())[0]["cases"]) == 40]
    runs = json.loads(full[-1].read_text())
    data = {
        "cases": 40, "model": muse.DEFAULT_MODEL, "file": full[-1].name,
        "runs": [r["summary"] for r in runs],
        "metrics": [{"label": label, "target": target, "values": [f"{r['summary'][k]:.0%}" for r in runs]}
                    for k, label, target in METRICS],
    }
    out = ROOT / "web" / "bench_data.js"
    out.write_text("window.BENCH = " + json.dumps(data, indent=1) + ";\n", encoding="utf-8")
    print("wrote", out.relative_to(ROOT), "from", full[-1].name)


if __name__ == "__main__":
    main()
