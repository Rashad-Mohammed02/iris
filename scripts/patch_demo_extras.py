"""Add the rule's families, weight, reconnects and shared interests to an existing
web/demo_data.js without calling Muse again. run_demo.py now writes these itself."""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine import daily_page  # noqa: E402
from engine.demo import Demo  # noqa: E402

OUT = ROOT / "web" / "demo_data.js"


def main():
    demo = Demo()
    data = json.loads(OUT.read_text()[len("window.DEMO = "):].rstrip().rstrip(";"))
    data["settings"] = demo.settings
    for i, d in enumerate(data["days"]):
        d["reveal"] = daily_page.reveal(demo, i, demo.settings)
        rule = demo.rule[i]
        d["families"], d["weight"] = rule["families"], rule["weight"]
        d["reconnected"] = [n.split()[0] for n in rule["reconnected_with"]]
        d["shared"] = {m["name"].split()[0]: demo.shared_interests(m["name"], i) for m in demo.settings["circle"]}
    OUT.write_text("window.DEMO = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")
    print("patched", len(data["days"]), "days")


if __name__ == "__main__":
    main()
