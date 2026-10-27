# Demo data: Arjun's 30 days on Instagram

**Everything here is fictional.** Arjun, Maya, Sam, Dev, Priya, Omar and everyone else are invented. Every handle, creator account, caption and message was written for this demo. Handles end in `.mc` or are made-up creator names; if one happens to match a real account, that is a coincidence. No real person's data was used, and nothing here came from a real export.

This folder holds a synthetic 30-day Instagram history for the demo caregiver, Arjun, shaped like the JSON you get from Instagram's "Download your information". The baseline engine runs on it in place of real DM rhythm data, which we cannot get (see `BLUEPRINT.md`, Part 3).

## How to use it

```
python3 generate_demo.py            # rebuilds ./demo_export/ and prints a day-by-day table
python3 generate_demo.py --out DIR  # writes somewhere else
```

The script uses only the Python 3 standard library (3.9 or newer, for `zoneinfo`) and a fixed seed, so every run produces byte-identical files. All the arc settings sit at the top of the script: dates, the strain per day, the days he goes quiet with Dev, the lift day, reel theme mixes, and each person's DM rhythm before and during the drift. Change them and run it again.

## The people

| Key | Name | Who | Instagram handle |
|---|---|---|---|
| owner | Arjun Rao | the caregiver, late 20s, US Eastern time | `arjun.rao.mc` |
| maya | Maya Chen | girlfriend | `maya.chen.mc` |
| sam | Sam Okafor | best friend | `sam.okafor.mc` |
| dev | Dev Rao | brother | `dev.rao.mc` |
| priya | Priya Rao | sister | `priya.rao.mc` |
| omar | Omar Haddad | close friend, college roommate | `omar.haddad.mc` |

Outside the circle there are Tasha and Ravi (in the "pit crew" group chat with Sam and Omar), Jess (a coworker) and Chris (from run club). Arjun's real interests, which give a lift something to work with, are **F1** (strong), **film photography**, **NBA** and **home espresso**.

## The story, day by day

The 30 days run from Monday 5 Oct to Tuesday 3 Nov 2026. "Strain" is the dial the script turns: 0 is his normal and 1 is the most drifted. Per-day numbers use an activity day that runs from 05:00 to 05:00, so a 2 AM scroll counts toward the evening before. US daylight saving time ends on Sunday 1 Nov (day 28), and the timestamps account for it.

| Days | Dates | What happens |
|---|---|---|
| 1-21 | 5-25 Oct | **His normal.** He's a night scroller who is usually done by about 00:20. Around 165 reels a day, mostly F1 (about 21%), comedy, NBA, film photography and coffee. Heavy themes stay under 10%. He sends Sam more reels than anyone else (about 3.4 a day), talks to Maya all day with quick replies (about 4 minutes), trades F1 and NBA clips with Dev, and has a lighter rhythm with Priya and Omar. Sundays run a little heavier. |
| 13 | Sat 17 Oct | **A late night that isn't heavy.** He's up until about 01:40, but it's F1 and comedy. This is a false-positive guard, because late on its own isn't a signal. |
| 22 | Mon 26 Oct | **Maya's hard week starts.** His messages to her turn supportive ("how are you holding up?", "want me to bring dinner over?"). He's up until about 01:30. |
| 23-27 | 27-31 Oct | **He holds her up and drifts.** Messages to Maya go up to about 40 a day, and his replies to her stay fast (about 3 minutes). He's up until 02:00-03:00, and on days 24-26 he wakes and scrolls again around 03:30-04:00. About two thirds of his reels are now burnout, tired/can't sleep, "the strong friend", slow songs and supporting-a-partner content, heaviest after midnight. F1 drops to about 8%. He sends Maya 2 or 3 reels a day, mostly late at night, about being tired and running on empty, sometimes with a note like "this is me today" or "felt this". Replies to Sam slow from about 15 minutes to many hours, often the next day, get shorter ("ya", "sorry man been slammed"), and some go unanswered. Priya and Omar get the same treatment. **Dev:** Arjun's last message to his brother is Sunday lunchtime (25 Oct). From then on Dev keeps messaging and sharing reels, gets no reply, and his story likes stop. |
| 28 | Sun 1 Nov | **The lift lands.** Sam sends something F1 after work. Only Arjun's side is real text: "WAIT. are you serious", "dude. vegas?? you're insane", "i owe you big time". Strain is easing. That evening he watches and saves a "Las Vegas GP: what to know before you go" reel, along with a couple of other F1 reels. |
| 29 | Mon 2 Nov | **He breaks the silence with Dev:** "hey sorry man, been a week", "call this weekend?". He catches up with Priya and Omar. |
| 30 | Tue 3 Nov | **Mostly back to normal.** He's done by about 00:30, and he's replying to Sam within about 15 minutes again. F1 is back to about a quarter of his reels. |

Run the script to print the full day-by-day table. The same numbers are in `demo_export/_simulated/story_arc_truth.json`.

## What's in `demo_export/`

| Path | What it is | Real export or our assumption? |
|---|---|---|
| `your_instagram_activity/messages/inbox/<handle>_<id>/message_1.json` | One file per thread: Maya, Sam, Dev, Priya, Omar, Jess, Chris, plus the group chats "pit crew 🏎" and "rao kids". | **Documented.** Top-level `participants`, `messages`, `title`, `is_still_participant`, `thread_path`, `magic_words`. Each message has `sender_name` (display name), `timestamp_ms`, `content`, optional `share` {`link`, `share_text`, `original_content_owner`}, `reactions` [{`reaction`, `actor`}], and the two `is_*` flags. Messages are listed **newest first**, as in real exports. |
| ↳ reel shares | Arjun's reel shares look like `content: "Arjun Rao sent an attachment."` with `share.link` pointing at the reel URL, `share.original_content_owner` holding the creator handle and `share_text` holding the caption. The recipient is whoever the thread belongs to. | **Documented** field names. Exactly how each share is worded varies between export versions. |
| ↳ `x_placeholder: true` | Set on **every message from someone other than Arjun**. Its content is filler, such as `[PLACEHOLDER: message from Maya Chen. Fictional filler, not analyzed]`. Reels other people share with Arjun keep a link and owner but have no theme. | **Ours.** This field doesn't exist in real exports. It marks text the engine must never analyze. In real data, use `sender_name != owner`. |
| ↳ `reactions[].timestamp` | When Arjun hearted one of Maya's messages. | **Assumed.** `reaction` and `actor` are documented. The timestamp is a guess. |
| `ads_information/ads_and_topics/videos_watched.json` | About 5,000 reel views, each with a timestamp, reel URL and creator (`Owner` → `Username`). | **Documented (v1, the current format).** A bare array of `{timestamp, media, label_values, fbid}`. Set `EXPORT_FORMAT = "v0"` to get the older shape instead (`{"impressions_history_videos_watched": [{string_map_data: {Author, Time}}]}`), which has only the author and time, with no URL. |
| `ads_information/ads_and_topics/posts_viewed.json` | Feed posts seen, from friends and interest accounts. | Documented (v1), same shape. |
| `your_instagram_activity/likes/liked_posts.json` | Posts and reels he liked. Likes on Dev's posts stop during the quiet week. | Documented (v1). v0 mode writes `likes_media_likes`. |
| `your_instagram_activity/story_interactions/story_likes.json` | Likes on his circle's stories. | Documented (v1). |
| `your_instagram_activity/saved/saved_posts.json` | Saves: F1, coffee, film and recipes normally, burnout and "small resets" during the hard week, and F1 again (including a Las Vegas GP guide) in recovery. | Documented: `saved_saved_media` → `title` + `string_map_data["Saved on"]`. |
| `ads_information/instagram_ads_and_businesses/ads_interests.json` | Meta's inferred ad interests (Formula One, Film photography, Basketball, Espresso, plus a few irrelevant ones, as real lists have). | Documented key `inferred_data_ig_interest` → `string_map_data.Interest.value`. Older exports put this file under `information_about_you/`. |
| `preferences/your_topics/your_topics.json` | Topics Meta thinks he likes. | Documented key `topics_your_topics` → `string_map_data.Name.value`. |
| `connections/followers_and_following/close_friends.json`, `following.json`, `followers_1.json` | His Close Friends list (the circle plus Tasha), the accounts he follows, and his followers. | Documented shapes. |
| `personal_information/personal_information/personal_information.json` | Profile: name, handle, bio, date of birth, with an example.com email. | Documented shape (`profile_user` → `string_map_data`). |

### Clearly simulated (not part of any export)

| Path | What it is |
|---|---|
| `_simulated/reel_theme_hints.json` | **SIMULATED.** The theme of every reel, keyed by reel URL, plus a creator-to-theme map so it also works with v0 data that has no URLs. The real export never says what a reel is about. In the concept, this comes from Meta's own understanding of content. It marks each theme as `heavy` and/or `interest`. |
| `_simulated/story_arc_truth.json` | **Ground truth for tests only.** Phase and strain per day, the expected signals, and per-day stats (reels watched, heavy share, last reel time, Arjun's message counts, median reply delay, average words, and reels sent per person). **The engine must not read this file.** Use it to check that the engine finds what was planted. |

## Things the engine must handle (same as real exports)

- **Text encoding quirk.** Meta writes non-ASCII text as UTF-8 bytes read as Latin-1, so an emoji shows up as garbled characters such as `â\u009d¤`. Fix each string with `s.encode("latin-1").decode("utf-8")`. The demo copies this behaviour; set `MIMIC_META_TEXT_ENCODING = False` to turn it off.
- **Newest first.** Messages and activity lists are in reverse time order, so sort before computing reply delays.
- **Times.** `timestamp_ms` in messages is in milliseconds; everything else uses `timestamp` in seconds. All are UTC epochs. Arjun lives on America/New_York time.
- **Your side only.** Base reply delays, message lengths and reels sent only on messages where `sender_name == "Arjun Rao"`. Other people's messages count only as "something arrived at this time", which is what a reply delay is measured from.

## Uncertainty about the real export format

- **The format changes.** Meta moved to the v1 `label_values` shape around 2025, and files keep moving between folders. Older exports used `ads_and_content/` or `information_about_you/` where newer ones use `ads_information/...`. The parser for a real export should try several paths. The paths used here follow the newest documented layout.
- **Sources.** No official Meta schema is published. The structure here comes from open-source parsers and test fixtures that track real exports: [onfabric/context-use](https://github.com/onfabric/context-use) (v0 and v1 Instagram fixtures and schemas), [abrignoni/RLEAPP](https://github.com/abrignoni/RLEAPP) (forensic parsers for messages, videos watched, interests, saved posts), [reagan-pius/watchr](https://github.com/reagan-pius/watchr) (path aliases across export generations), [d3i-infra/ddp-inspector](https://github.com/d3i-infra/ddp-inspector) (ads interests and your topics), and a [University of Mainz course page](https://stats.ifp.uni-mainz.de/ba-ccs-track/befragung-daten.html) that parses a real `posts_viewed.json`.
- **Reel URLs in videos watched.** The legacy v0 format lists only the author and time. The current v1 fixtures include a reel URL and an `Owner` block. We write v1 by default. If a real export turns out to lack URLs, the theme hints still work through the author map.
- **Sample-based details.** `fbid` values, the `"Ad library public URL"` label row, how much a real user's videos_watched actually records, and how labels are localized (a Dutch export says "Interesse" instead of "Interest") all come from samples, not a spec.
- **How reels shared in DMs appear** (exact `content` wording, and whether `share_text` is always present) varies between exports. The field names are documented; the wording is our best match.
