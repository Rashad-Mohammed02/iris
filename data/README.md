# Demo data: Arjun's 42 days on Instagram, plus his simulated calendar and Spotify

**Everything here is fictional.** Arjun, Maya, Sam, Dev, Priya, Omar and everyone else are invented. Every handle, creator account, caption and message was written for this demo. Handles end in `.mc` or are made-up creator names; if one happens to match a real account, that is a coincidence. No real person's data was used, and nothing here came from a real export.

This folder holds a synthetic 42-day Instagram history for the demo caregiver, Arjun, shaped like the JSON you get from Instagram's "Download your information". The baseline engine runs on it in place of real DM rhythm data, which we cannot get (see `BLUEPRINT.md`, Part 3).

## How to use it

```
python3 generate_demo.py            # rebuilds ./demo_export/ and prints a day-by-day table
python3 generate_demo.py --out DIR  # writes somewhere else
```

The script uses only the Python 3 standard library (3.9 or newer, for `zoneinfo`) and a fixed seed, so every run produces byte-identical files. All the arc settings sit at the top of the script: dates, the story days, the strain per day, the scripted lines, reel theme mixes, and each person's DM rhythm before and during the drift. Change them and run it again.

## The people

| Key | Name | Who | Instagram handle |
|---|---|---|---|
| owner | Arjun Rao | the caregiver, late 20s, US Eastern time | `arjun.rao.mc` |
| maya | Maya Chen | girlfriend | `maya.chen.mc` |
| sam | Sam Okafor | best friend | `sam.okafor.mc` |
| dev | Dev Rao | brother | `dev.rao.mc` |
| priya | Priya Rao | sister | `priya.rao.mc` |
| omar | Omar Haddad | close friend, college roommate | `omar.haddad.mc` |

Outside the circle there are Tasha and Ravi (in the "pit crew" group chat with Sam and Omar), Jess (a coworker) and Chris (from run club). Arjun's real interests, which give a note something to work with, are **F1** (strong), **film photography**, **NBA** and **home espresso**.

## The story, day by day

The 42 days run from Wednesday 23 Sep to Tuesday 3 Nov 2026. Days 1 to 14 are the two weeks Iris only learns his normal. Days 15 to 42 are his month: mostly ordinary days, with a few that stand out in every direction. "Strain" is the dial the script turns for the Instagram side (0 is his normal). Per-day numbers use an activity day that runs from 05:00 to 05:00.

| Days | Dates | What happens |
|---|---|---|
| 1-14 | 23 Sep-6 Oct | **His normal.** A night scroller, usually done by about 00:20, around 160 reels a day, mostly F1, comedy, NBA, film photography and coffee. He sends Sam the most reels and talks to Maya all day. Day 13 is a late but upbeat F1 night (late alone is not a signal). |
| 15-17 | 7-9 Oct | Ordinary days. |
| 18-21 | 10-13 Oct | **A tired stretch.** Study blocks for the PMP exam every evening and a work deck due on day 20. Later nights, more heavy reels, shorter replies, focus music. |
| 22 | Wed 14 Oct | **Exam day.** |
| 23 | Thu 15 Oct | **A low, sad day** (not tired). He cancels dinner with Omar, plays slow sad songs on repeat, watches sad-day reels, is up late and wakes in the night, and his own words say it: "honestly just a sad day", "nothing's wrong exactly, just low". |
| 24-25 | 16-17 Oct | Easing. |
| 26-30 | 18-22 Oct | Ordinary days. |
| 31-33 | 23-25 Oct | **A weekend away** in Chicago with Maya. Late but upbeat; road-trip music. |
| 34 | Mon 26 Oct | Back home, a little tired. |
| 35 | Tue 27 Oct | **A friend's secret.** His side mentions Priya's private job news. No note may carry it. |
| 36 | Wed 28 Oct | **Big news: he passed.** "I PASSED", bright music on repeat, far more messages. |
| 37 | Thu 29 Oct | Celebration dinner with Maya and Sam. |
| 38 | Fri 30 Oct | **A gig** with Omar (The Low Lanterns). |
| 39-40 | 31 Oct-1 Nov | A slow weekend after the show. |
| 41 | Mon 2 Nov | **A routine blood test** on his calendar. Health is never shared. |
| 42 | Tue 3 Nov | Ordinary. |

Run the script to print the full day-by-day table. The same numbers are in `demo_export/_simulated/story_arc_truth.json`.

## Connector feeds (SIMULATED): `demo_connectors/`

Iris reads four kinds of input: what you see and what you talk about (Instagram, above), what happens to you (calendar) and what you hear (Spotify). The last two are simulated here as two small JSON files, written by the same script from its own fixed seed. They are fictional: no real calendar or Spotify account is read. The format is documented in `engine/connectors.py`.

- `calendar.json`: `events` (id, title, start, end, all_day, kind, with, location, status, and for public shows `public`, `interest` and `tickets`) plus `free_busy`, the busy times his 5 share (never titles). Work meetings, run club, study blocks, the exam, a cancelled dinner, the trip, the results, the celebration, the gig, the blood test, and three public shows after his month (for tickets).
- `spotify.json`: `plays`, one per line, using the field names of Spotify's extended streaming history (`ts`, `master_metadata_track_name`, `master_metadata_album_artist_name`, `ms_played`) plus simulated `x_valence` (how bright a song sounds) and `x_energy`. Every song and artist is invented.

The engine uses them two ways: Muse reads each day against his own usual (`engine/demo.py`), and plain code builds the ready actions from them (`engine/actions.py`): a lunch hour when both are free, tickets to a public show that fits a shared interest, a song from his usual favorites.

## What's in `demo_export/`

| Path | What it is | Real export or our assumption? |
|---|---|---|
| `your_instagram_activity/messages/inbox/<handle>_<id>/message_1.json` | One file per thread: Maya, Sam, Dev, Priya, Omar, Jess, Chris, plus the group chats "pit crew 🏎" and "rao kids". | **Documented.** Top-level `participants`, `messages`, `title`, `is_still_participant`, `thread_path`, `magic_words`. Each message has `sender_name` (display name), `timestamp_ms`, `content`, optional `share` {`link`, `share_text`, `original_content_owner`}, `reactions` [{`reaction`, `actor`}], and the two `is_*` flags. Messages are listed **newest first**, as in real exports. |
| ↳ reel shares | Arjun's reel shares look like `content: "Arjun Rao sent an attachment."` with `share.link` pointing at the reel URL, `share.original_content_owner` holding the creator handle and `share_text` holding the caption. The recipient is whoever the thread belongs to. | **Documented** field names. Exactly how each share is worded varies between export versions. |
| ↳ `x_placeholder: true` | Set on **every message from someone other than Arjun**. Its content is filler, such as `[PLACEHOLDER: message from Maya Chen. Fictional filler, not analyzed]`. Reels other people share with Arjun keep a link and owner but have no theme. | **Ours.** This field doesn't exist in real exports. It marks text the engine must never analyze. In real data, use `sender_name != owner`. |
| ↳ `reactions[].timestamp` | When Arjun hearted one of Maya's messages. | **Assumed.** `reaction` and `actor` are documented. The timestamp is a guess. |
| `ads_information/ads_and_topics/videos_watched.json` | About 5,000 reel views, each with a timestamp, reel URL and creator (`Owner` → `Username`). | **Documented (v1, the current format).** A bare array of `{timestamp, media, label_values, fbid}`. Set `EXPORT_FORMAT = "v0"` to get the older shape instead (`{"impressions_history_videos_watched": [{string_map_data: {Author, Time}}]}`), which has only the author and time, with no URL. |
| `ads_information/ads_and_topics/posts_viewed.json` | Feed posts seen, from friends and interest accounts. | Documented (v1), same shape. |
| `your_instagram_activity/likes/liked_posts.json` | Posts and reels he liked. | Documented (v1). v0 mode writes `likes_media_likes`. |
| `your_instagram_activity/story_interactions/story_likes.json` | Likes on his circle's stories. | Documented (v1). |
| `your_instagram_activity/saved/saved_posts.json` | Saves: F1, coffee, film and recipes normally, burnout and "small resets" on the tired and low days. | Documented: `saved_saved_media` → `title` + `string_map_data["Saved on"]`. |
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
