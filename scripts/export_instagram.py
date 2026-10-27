"""Write web/instagram_data.js: what Arjun's own Instagram looked like each day.

This is the input side of the demo, so the screens can show where Muse's read
comes from. It reads the same fictional export the engine reads. Message text is
never kept by the parser, only who and when, so none appears here either.
No model calls.
"""

import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine.demo import Demo, clock  # noqa: E402

LATEST_REELS = 9
THREADS = 7


def day_view(demo, i):
    day, row = demo.days[i], demo.rows[i]
    events = sorted(demo.by_day.get(day, []), key=lambda e: e["ts"])
    reels = [e for e in events if e["type"] == "reel_watched"]
    label = lambda t: demo.theme_label.get(t, (t or "").replace("_", " "))
    threads = defaultdict(lambda: {"sent": 0, "received": 0, "reels": 0, "ts": 0, "last": ""})
    for e in events:
        if e["type"] in ("message_sent", "reel_sent"):
            name = e["to"]
            t = threads[name]
            t["sent"] += 1
            t["reels"] += e["type"] == "reel_sent"
            t["last"] = "You sent a reel" if e["type"] == "reel_sent" else "You sent a message"
        elif e["type"] == "message_received":
            name = e["thread"]
            t = threads[name]
            t["received"] += 1
            t["last"] = f"{e['frm'].split()[0]} sent a message" if e.get("group") else "New message"
        else:
            continue
        t["ts"], t["time"], t["group"] = e["ts"], clock(e["hour"]), bool(e.get("group"))
    top = sorted(threads.items(), key=lambda kv: -kv[1]["ts"])[:THREADS]
    return {
        "n": i + 1,
        "last_active": clock(row["last_active"]) if row.get("last_active") is not None else None,
        "reels_watched": len(reels),
        "heavy_share": round(row.get("heavy_share") or 0, 2),
        "latest_reels": [{"creator": e["creator"], "theme": label(e.get("theme")), "heavy": bool(e.get("heavy")),
                          "time": clock(e["hour"])} for e in reels[-LATEST_REELS:][::-1]],
        "saved": [{"creator": e["creator"], "theme": label(e.get("theme")), "time": clock(e["hour"])}
                  for e in events if e["type"] == "post_saved"],
        "threads": [{"name": n, "first": n.split()[0] if not t["group"] else n, "group": t["group"],
                     "last": t["last"], "time": t["time"], "sent": t["sent"], "received": t["received"],
                     "reels": t["reels"]} for n, t in top],
    }


def main():
    demo = Demo()
    data = {"days": [day_view(demo, i) for i in range(len(demo.days))]}
    out = ROOT / "web" / "instagram_data.js"
    out.write_text("window.IG = " + json.dumps(data, ensure_ascii=False, indent=0) + ";\n", encoding="utf-8")
    print("wrote", out.relative_to(ROOT), len(data["days"]), "days")


if __name__ == "__main__":
    main()
