"""Read an Instagram "Download your information" export (JSON) and keep only
the account owner's own behavior.

Output:
  out/events.jsonl   one event per line, the owner's side only
  out/profile.json   owner, circle (Close Friends), interests

Privacy rule: the text of messages written by anyone other than the owner is
never read into an event. For other people we keep only who and when. The
owner's own words are kept (own_words on message_sent) so Muse can read the
gist of what he talks about.

Usage:
  python3 data/parse_export.py [EXPORT_DIR] [--tz America/New_York]
"""

import argparse
import json
import sys
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

RECONNECT_S = 48 * 3600  # an answer after two days or more counts as reconnecting

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
DEFAULT_EXPORT = ROOT / "data" / "demo_export"
OUT = ROOT / "out"

# Meta moves files between export versions, so each file has several candidate paths.
PATHS = {
    "profile": ["personal_information/personal_information/personal_information.json",
                "personal_information/personal_information.json",
                "account_information/personal_information.json"],
    "inbox": ["your_instagram_activity/messages/inbox", "messages/inbox"],
    "videos_watched": ["ads_information/ads_and_topics/videos_watched.json",
                       "your_instagram_activity/ads_and_topics/videos_watched.json",
                       "ads_and_topics/videos_watched.json"],
    "liked_posts": ["your_instagram_activity/likes/liked_posts.json", "likes/liked_posts.json"],
    "saved_posts": ["your_instagram_activity/saved/saved_posts.json", "saved/saved_posts.json"],
    "story_likes": ["your_instagram_activity/story_interactions/story_likes.json",
                    "story_sticker_interactions/story_likes.json"],
    "ads_interests": ["ads_information/instagram_ads_and_businesses/ads_interests.json",
                      "information_about_you/ads_interests.json"],
    "your_topics": ["preferences/your_topics/your_topics.json", "your_topics/your_topics.json"],
    "close_friends": ["connections/followers_and_following/close_friends.json",
                      "followers_and_following/close_friends.json"],
    # Simulated: stands in for Meta's own understanding of what a reel is about.
    "theme_hints": ["_simulated/reel_theme_hints.json"],
}

DAY_STARTS_AT = 5  # an activity day runs 05:00 to 05:00, so a 2 AM scroll counts toward the evening before


def find(export, key):
    for rel in PATHS[key]:
        p = export / rel
        if p.exists():
            return p
    return None


def load(export, key, default=None):
    p = find(export, key)
    if p is None:
        return default
    with p.open(encoding="utf-8") as f:
        return json.load(f)


def fix_text(s):
    """Meta stores UTF-8 text as if it were Latin-1. Undo that when possible."""
    if not isinstance(s, str):
        return s
    try:
        return s.encode("latin-1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return s


def owner_block(label_values):
    """Pull {name, username} out of a v1 label_values 'Owner' block."""
    for lv in label_values or []:
        if lv.get("title") == "Owner":
            for d in lv.get("dict", []):
                fields = {x.get("label"): x.get("value") for x in d.get("dict", [])}
                return {"name": fix_text(fields.get("Name") or ""), "username": fields.get("Username") or ""}
    return {"name": "", "username": ""}


def url_of(label_values):
    for lv in label_values or []:
        if lv.get("label") == "URL" and lv.get("value"):
            return lv["value"]
    return ""


class Clock:
    def __init__(self, tz):
        self.tz = ZoneInfo(tz)

    def local(self, ts):
        return datetime.fromtimestamp(ts, self.tz)

    def day(self, ts):
        return (self.local(ts) - timedelta(hours=DAY_STARTS_AT)).date().isoformat()


def parse(export, tz="America/New_York"):
    export = Path(export)
    clock = Clock(tz)
    events = []
    names = {}  # username -> display name

    def add(ts, kind, **fields):
        loc = clock.local(ts)
        events.append({"ts": ts, "day": clock.day(ts), "hour": round(loc.hour + loc.minute / 60, 2), "type": kind, **fields})

    # The older flat layout (2020) has its own reader; both give the same events and profile.
    from data.parse_export_2020 import is_2020_layout, parse_2020
    if is_2020_layout(export):
        profile = parse_2020(export, add, tz)
        events.sort(key=lambda e: e["ts"])
        profile["days"] = sorted({e["day"] for e in events})
        return events, profile

    # Owner
    prof = load(export, "profile", {})
    pdata = ((prof.get("profile_user") or [{}])[0]).get("string_map_data", {})
    owner_name = fix_text(pdata.get("Name", {}).get("value", ""))
    owner_user = pdata.get("Username", {}).get("value", "")

    # Theme hints (simulated)
    hints = load(export, "theme_hints", {}) or {}
    theme_info = hints.get("themes", {})
    by_reel = hints.get("reels", {})
    by_author = hints.get("authors", {})

    def theme_for(url, author):
        t = (by_reel.get(url) or {}).get("theme") or (by_author.get(author) or {}).get("theme")
        if not t:
            return None, False
        return t, bool((theme_info.get(t) or {}).get("heavy"))

    # Reels watched (v1: bare list with label_values; v0: impressions_history_videos_watched)
    vw = load(export, "videos_watched", [])
    if isinstance(vw, dict):
        for item in vw.get("impressions_history_videos_watched", []):
            smd = item.get("string_map_data", {})
            author = smd.get("Author", {}).get("value", "")
            ts = smd.get("Time", {}).get("timestamp")
            if ts:
                t, heavy = theme_for("", author)
                add(ts, "reel_watched", creator=author, url="", theme=t, heavy=heavy)
    else:
        for item in vw:
            ts = item.get("timestamp")
            if not ts:
                continue
            o = owner_block(item.get("label_values"))
            url = url_of(item.get("label_values"))
            t, heavy = theme_for(url, o["username"])
            add(ts, "reel_watched", creator=o["username"], url=url, theme=t, heavy=heavy)

    # Likes and story likes (who the owner engages with)
    for key, kind in (("liked_posts", "post_liked"), ("story_likes", "story_liked")):
        data = load(export, key, [])
        if isinstance(data, dict):  # older shapes wrap the list
            data = next((v for v in data.values() if isinstance(v, list)), [])
        for item in data:
            ts = item.get("timestamp")
            o = owner_block(item.get("label_values"))
            if o["username"] and o["name"]:
                names[o["username"]] = o["name"]
            if ts:
                add(ts, kind, of=o["username"])

    # Saved posts (creator + link; used for interests)
    saved = load(export, "saved_posts", {}) or {}
    for item in saved.get("saved_saved_media", []):
        smd = item.get("string_map_data", {}).get("Saved on", {})
        ts = smd.get("timestamp")
        if ts:
            url = smd.get("href", "")
            t, heavy = theme_for(url, item.get("title", ""))
            add(ts, "post_saved", creator=item.get("title", ""), url=url, theme=t, heavy=heavy)

    # Messages: the owner's side in full detail; other people only as "who, when"
    inbox = find(export, "inbox")
    threads = []
    if inbox:
        for mf in sorted(inbox.glob("*/message_*.json")):
            with mf.open(encoding="utf-8") as f:
                th = json.load(f)
            people = [fix_text(p.get("name", "")) for p in th.get("participants", [])]
            others = [p for p in people if p != owner_name]
            is_group = len(others) > 1
            title = fix_text(th.get("title", "")) or ", ".join(others)
            threads.append({"title": title, "group": is_group, "others": others})
            msgs = sorted(th.get("messages", []), key=lambda m: m.get("timestamp_ms", 0))  # exports are newest first
            last_other_ts = None
            for m in msgs:
                ts = m.get("timestamp_ms", 0) / 1000
                sender = fix_text(m.get("sender_name", ""))
                if sender == owner_name:
                    share = m.get("share") or {}
                    is_share = bool(share.get("link"))
                    text = "" if is_share else fix_text(m.get("content") or "")
                    delay = round(ts - last_other_ts) if last_other_ts else None
                    # A reply after days of silence is someone reconnecting, not a slow reply.
                    reconnect = delay is not None and delay > RECONNECT_S
                    add(ts, "reel_sent" if is_share else "message_sent",
                        to=title, group=is_group,
                        length=len(text), reply_delay_s=None if reconnect else delay, reconnect=reconnect,
                        creator=share.get("original_content_owner", "") if is_share else None,
                        url=share.get("link", "") if is_share else None,
                        # v2: his own words only, for the gist of what he talks about. Never anyone else's.
                        own_words=text[:200] if text else None)
                    last_other_ts = None
                else:
                    # Someone else's message: keep who and when, never what.
                    add(ts, "message_received", frm=sender, thread=title, group=is_group)
                    if last_other_ts is None:
                        last_other_ts = ts

    # Interests Meta already infers, and the Close Friends list
    interests = []
    ai = load(export, "ads_interests", {}) or {}
    for it in ai.get("inferred_data_ig_interest", []):
        v = it.get("string_map_data", {}).get("Interest", {}).get("value")
        if v:
            interests.append(fix_text(v))
    topics = []
    yt = load(export, "your_topics", {}) or {}
    for it in yt.get("topics_your_topics", []):
        v = it.get("string_map_data", {}).get("Name", {}).get("value")
        if v:
            topics.append(fix_text(v))
    circle = []
    cf = load(export, "close_friends", {}) or {}
    for it in cf.get("relationships_close_friends", []):
        for s in it.get("string_list_data", []):
            u = s.get("value")
            if u:
                circle.append({"username": u, "name": names.get(u, u)})

    # Keep only circle members who have a one-to-one thread (that's where the rhythm lives)
    one_to_one = {t["title"] for t in threads if not t["group"]}
    for c in circle:
        c["has_thread"] = c["name"] in one_to_one

    events.sort(key=lambda e: e["ts"])
    profile = {
        "owner": {"name": owner_name, "username": owner_user},
        "timezone": tz,
        "circle": circle,
        "threads": threads,
        "meta_interests": interests,
        "meta_topics": topics,
        "theme_source": "simulated" if hints else None,
        "days": sorted({e["day"] for e in events}),
    }
    return events, profile


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("export", nargs="?", default=str(DEFAULT_EXPORT))
    ap.add_argument("--tz", default="America/New_York")
    args = ap.parse_args()
    events, profile = parse(args.export, args.tz)
    OUT.mkdir(exist_ok=True)
    with (OUT / "events.jsonl").open("w", encoding="utf-8") as f:
        for e in events:
            f.write(json.dumps(e, ensure_ascii=False) + "\n")
    (OUT / "profile.json").write_text(json.dumps(profile, indent=1, ensure_ascii=False), encoding="utf-8")
    counts = defaultdict(int)
    for e in events:
        counts[e["type"]] += 1
    print(f"Owner: {profile['owner']['name']}  Days: {profile['days'][0]} to {profile['days'][-1]}")
    print("Events:", dict(counts))
    print("Circle:", ", ".join(f"{c['name']}{'' if c['has_thread'] else ' (no 1:1 thread)'}" for c in profile["circle"]))
    print("Meta interests:", ", ".join(profile["meta_interests"][:8]))


if __name__ == "__main__":
    sys.exit(main())
