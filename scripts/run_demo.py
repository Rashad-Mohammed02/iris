"""Play Arjun's 30 days through the real engine and save what each screen shows.

Every Daily Page, read, lift and journal reply below is a live Muse call. The
output (web/demo_data.js) lets the screens run offline for the video.

Usage: python3 scripts/run_demo.py
"""

import json
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine import daily_page, journal  # noqa: E402
from engine.decide import decide  # noqa: E402
from engine.demo import Demo  # noqa: E402
from engine.read import read  # noqa: E402

OUT = ROOT / "web" / "demo_data.js"

SIGNAL_WORDS = {
    "later_to_sleep": "getting to sleep later than usual",
    "shorter_rest": "shorter nights than usual",
    "longer_rest": "sleeping much longer than usual",
    "woke_in_night": "up in the middle of your usual rest",
    "daytime_binge": "a lot more scrolling during the day",
    "more_sessions": "picking up your phone more often",
    "more_reels": "more reels than usual",
    "heavier_reels": "heavier reels than usual",
    "interest_fading": "less of what you usually love",
    "sending_heavy_reels": "sending heavier reels",
    "slower_replies": "slower replies",
    "shorter_replies": "shorter replies",
    "fewer_messages": "fewer messages to your people",
    "more_messages": "a lot more messages than usual",
    "fewer_starts": "starting fewer conversations",
    "gone_quiet": "gone quiet with someone",
}

# What Arjun types into his journal in the demo (fictional), and on which day.
JOURNAL_SCRIPT = {
    25: ["another night on the phone with her till 3. i'm not even mad. i just keep thinking nobody asks how i'm doing",
         "and i still haven't texted D back. idk why",
         "chest feels tight. kind of heavy",
         "honestly just want to disappear into my phone and not deal",
         "stretched thin. and kind of left out i guess",
         "not maya. dev. i owe him a text"],
    27: ["sam just sent me vegas tickets. VEGAS. i didn't even tell him anything",
         "honestly made my whole week"],
}
LIFT_LANDS_DAY = 27  # index of day 28, when Sam acts on his lift (story_arc_truth.json)


def run_journal(demo, i):
    ctx = demo.journal_context(i)
    h, turns = [], []
    for line in JOURNAL_SCRIPT[i]:
        h.append({"role": "user", "text": line})
        r = journal.turn(h, ctx)
        h.append({"role": "muse", "text": r["reply"]})
        turns.append({"user": line, **r})
    named = next((t["user"] for t in reversed(turns) if t["step"] in ("share", "close")), None)
    about = sorted({a for t in turns for a in t["about"]})
    words = None
    if i == 25:
        words = journal.own_words(h, "Dev", ctx)
    return {"turns": turns, "about": about, "own_words": words, "named": named}


def journal_only():
    """Rerun just the journal days and patch them into the existing web/demo_data.js."""
    demo = Demo()
    data = json.loads(OUT.read_text()[len("window.DEMO = "):].rstrip().rstrip(";"))
    for i in JOURNAL_SCRIPT:
        data["days"][i]["journal"] = run_journal(demo, i)
    OUT.write_text("window.DEMO = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")
    print("patched journal days", [i + 1 for i in JOURNAL_SCRIPT])


def pages_only():
    """Rewrite just the private pages and reveals and patch them into the existing web/demo_data.js."""
    demo = Demo()
    data = json.loads(OUT.read_text()[len("window.DEMO = "):].rstrip().rstrip(";"))

    def page(i):
        j = data["days"][i].get("journal")
        jt = {"named": j.get("named")} if j else None
        return daily_page.write_page(demo.day_facts(i), jt) if i >= 2 else None

    with ThreadPoolExecutor(6) as ex:
        pages = list(ex.map(page, range(len(demo.days))))
    for i, d in enumerate(data["days"]):
        d["page"] = pages[i]
        d["reveal"] = daily_page.reveal(demo, i, demo.settings)
    OUT.write_text("window.DEMO = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")
    print("patched pages and reveals")


def main():
    if "--journal" in sys.argv:
        return journal_only()
    if "--pages" in sys.argv:
        return pages_only()
    demo = Demo()
    n = len(demo.days)
    print(f"{demo.first}: {n} days")

    # Journal first, so what he wrote can feed that day's page and read.
    journals = {i: run_journal(demo, i) for i in JOURNAL_SCRIPT}
    print("journal done")

    def page(i):
        j = journals.get(i)
        jt = {"wrote": [t["user"] for t in j["turns"]][:1], "named": j["named"]} if j else None
        return daily_page.write_page(demo.day_facts(i), jt) if i >= 2 else None

    with ThreadPoolExecutor(6) as ex:
        pages = list(ex.map(page, range(n)))
    print("pages done")

    shown = set()  # a private prompt shows once, never again (no nagging)
    state = {"lifts_sent": [], "journal": {i: [t["user"] for t in j["turns"]] for i, j in journals.items()}}
    days = []
    for i in range(n):
        sit = demo.situation(i, state)
        if i == LIFT_LANDS_DAY:
            for m in sit["circle"]:
                if m["name"] == "Sam":  # in the story, Sam is the one who acts on his lift
                    m["note"] = "Answered your lift: sent you something F1 (simulated receiver side)."
        decision = decide(sit) if i + 1 > 14 else decide(sit, reading={"stretch": "none"})
        decision["prompts"] = [p for p in decision["prompts"] if (p["kind"], p["about"]) not in shown]
        shown.update((p["kind"], p["about"]) for p in decision["prompts"])
        for l in decision["lifts"]:
            state["lifts_sent"].append({"to": l["to"], "day": i, "text": l["text"]})
        rule = demo.rule[i]
        days.append({
            "n": i + 1, "date": demo.days[i], "weekday": demo.day_facts(i)["day"].split(",")[0],
            "reveal": daily_page.reveal(demo, i, demo.settings),
            "page": pages[i],
            "orbit": demo.orbit(i),
            "signals": [SIGNAL_WORDS[s] for s in rule["off_signals"]],
            "families": rule.get("families", []), "weight": rule.get("weight", 0),
            "reconnected": [n.split()[0] for n in rule.get("reconnected_with", [])],
            "shared": {m["name"].split()[0]: demo.shared_interests(m["name"], i) for m in demo.settings["circle"]},
            "rule": "heavy" if rule["heavy_stretch"] else ("lighter" if rule["lighter_stretch"] else
                    ("learning" if rule["learning"] else "normal")),
            "stretch": decision["stretch"],
            "why": (decision.get("read") or {}).get("log_reason", ""),
            "families_off": (decision.get("read") or {}).get("families_off", []),
            "lifts": [dict({k: l[k] for k in ("to", "kind", "interest", "text", "fallback")},
                           tries=len(l["attempts"]), check=(l["attempts"][-1].get("check") if l["attempts"] else None),
                           lint=(l["attempts"][-1]["lint"] if l["attempts"] else []))
                      for l in decision["lifts"]],
            "not_sent": decision["not_sent"],
            "prompts": decision["prompts"],
            "cards": decision["cards"],
            "log": decision["log"],
            "journal": journals.get(i),
        })
        flag = days[-1]["rule"]
        print(f"{i + 1:>2} {flag:<8} {decision['stretch']:<14}" +
              "; ".join(f"{l['to']}: {l['text']}" for l in decision["lifts"]))

    data = {"owner": demo.first, "interests": demo.interests, "settings": demo.settings, "days": days}
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text("window.DEMO = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")
    print("wrote", OUT.relative_to(ROOT))


if __name__ == "__main__":
    main()
