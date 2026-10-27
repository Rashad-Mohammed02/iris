"""Read the older (2020) Instagram "Download your information" layout.

Instagram used to ship one flat folder of files: messages.json (every thread in
one file), seen_content.json (videos watched, posts seen), likes.json and
connections.json (with Close Friends). The newer layout is handled in
parse_export.py. Both produce the same events and profile, with the same rule:
the owner's side in detail, everyone else only as "who and when", never what.

Tested on the Utrecht University set of generated Instagram packages
(Boeschoten, van den Goorbergh and Oberski, 2021, CC BY 4.0,
https://doi.org/10.5281/zenodo.4472606), fetched by scripts/fetch_real_exports.py.
"""

import json
from datetime import datetime
from pathlib import Path

RECONNECT_S = 48 * 3600


def is_2020_layout(export):
    export = Path(export)
    return (export / "messages.json").exists() or (export / "seen_content.json").exists()


def _ts(s):
    try:
        return datetime.fromisoformat(str(s).replace("Z", "+00:00")).timestamp()
    except ValueError:
        return None


def _load(export, name, default):
    p = Path(export) / name
    if not p.exists():
        return default
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except ValueError:
        return default


def parse_2020(export, add, tz):
    """Fill events through `add(ts, kind, **fields)` and return the profile pieces."""
    export = Path(export)
    prof = _load(export, "profile.json", {})
    owner_user = prof.get("username") or export.name.rsplit("_", 1)[0]
    owner_name = prof.get("name") or owner_user

    seen = _load(export, "seen_content.json", {})
    for v in seen.get("videos_watched", []):
        t = _ts(v.get("timestamp"))
        if t:
            add(t, "reel_watched", creator=v.get("author", ""), url="", theme=None, heavy=False)
    likes = _load(export, "likes.json", {})
    for item in likes.get("media_likes", []):
        if isinstance(item, list) and item:
            t = _ts(item[0])
            if t:
                add(t, "post_liked", of=item[1] if len(item) > 1 else "")

    threads = []
    for th in _load(export, "messages.json", []):
        people = th.get("participants", [])
        others = [p for p in people if p != owner_user]
        is_group = len(others) > 1
        title = ", ".join(others) if others else owner_user
        threads.append({"title": title, "group": is_group, "others": others})
        last_other = None
        for m in sorted(th.get("conversation", []), key=lambda c: c.get("created_at", "")):
            t = _ts(m.get("created_at"))
            if not t:
                continue
            if m.get("sender") == owner_user:
                share = m.get("media_share_url") or m.get("story_share") or m.get("link")
                delay = round(t - last_other) if last_other else None
                reconnect = delay is not None and delay > RECONNECT_S
                add(t, "reel_sent" if share and not m.get("text") else "message_sent", to=title, group=is_group,
                    length=len(m.get("text") or ""), reply_delay_s=None if reconnect else delay, reconnect=reconnect,
                    creator=m.get("media_owner") if share else None, url=share if share else None)
                last_other = None
            else:
                add(t, "message_received", frm=m.get("sender", ""), thread=title, group=is_group)
                if last_other is None:
                    last_other = t

    conn = _load(export, "connections.json", {})
    close = list((conn.get("close_friends") or {}).keys())
    one_to_one = {t["title"]: t for t in threads if not t["group"]}
    if not close:
        # No Close Friends list in this package: use the people the owner messages most, as the app would suggest.
        counts = {}
        for th in _load(export, "messages.json", []):
            others = [p for p in th.get("participants", []) if p != owner_user]
            if len(others) == 1:
                counts[others[0]] = sum(1 for c in th.get("conversation", []) if c.get("sender") == owner_user)
        close = [u for u, n in sorted(counts.items(), key=lambda kv: -kv[1]) if n > 0][:5]
    circle = [{"username": u, "name": u, "has_thread": u in one_to_one} for u in close]
    return {"owner": {"name": owner_name, "username": owner_user}, "timezone": tz, "circle": circle, "threads": threads,
            "meta_interests": [], "meta_topics": [], "theme_source": None, "layout": "2020"}
