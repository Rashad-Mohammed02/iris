# Iris v2: notes for rewriting the README

Facts and numbers for Rashad to rewrite README.md in his own voice. Written 28 Oct 2026. Nothing here is final copy.

## What v2 is, in the engine

- **Every day, any mood.** Once a day Muse reads the day against your own normal and returns one plain mood word (happy, proud, excited, buzzing, relieved, calm, content, okay, busy, focused, tired, stressed, nervous, low, sad, restless), a general moment for your own log ("exam day", "a weekend away"), a size (ordinary, notable or big), a crisis flag, and a good fit for each friend: one shared interest, one action type, and whether it should be a surprise. Prompt: `prompts/day_v1.txt`, code: `engine/day.py`.
- **Four inputs.** What you see and what you talk about come from the Instagram export (your own side only; v2 now keeps your own message words so Muse can read the gist, never anyone else's). What happens to you (calendar) and what you hear (Spotify) are two **simulated** feeds in `data/demo_connectors/`, format in `engine/connectors.py`. No real calendar or Spotify account is read.
- **The note is minimal.** Name, mood in a word or two, one short nudge with one idea, and the ready action under it: "Arjun, proud day. Grab two seats with Arjun for some live music and make it a celebration". The writer (`prompts/note_v1.txt`, `engine/note.py`) sees only your first name, the friend's relation, the mood word, one shared interest and the action type. It never sees the moment or anything from your day.
- **Ready actions are built in code** (`engine/actions.py`), never by a model: song (from your usual favorites, never today's), reel, lunch (an hour from noon to 2 PM in the next three days when both calendars are free, only for friends marked nearby, OpenTable), tickets (a public show with tickets that fits the shared interest, Ticketmaster), treat (delivered; Iris fills in the address so the friend never sees it), message. A treat is always a surprise; tickets, a song or a reel can be.
- **Signature:** "Suggested by Muse. Arjun didn't ask." when it sends on its own, "Suggested by Muse." under Ask me first.
- **Gates, in plain code** (`engine/decide.py`): adults only (Teen Accounts never), crisis from reels or from your own words stops everything before any model call and shows your country's help line, 14 learning days, pause, then per friend Every day (the default) / Big moments only / Never, mutual, the friend must be an adult. People set to Never, not mutual or under 18 are never named to Muse. Sources you switch off are removed before Muse reads anything. Notes go at your time of day (default 6 PM); "auto" queues them with 10 minutes to cancel, "ask" waits for your OK.
- **Two checks on every note**, as before: the word check (`engine/voice.py`; mood words are now allowed, while therapy and diagnosis words, crisis words, quote marks, other names, health, money, work trouble, relationship details and source words stay banned) and a separate Muse privacy check (`prompts/check_v2.txt`) that sees the whole day. The reason for the mood counts as a leak.
- **Friend's view data.** Each demo day carries `friend_view`: Arjun's 5 and how each feels today. Arjun's mood is the engine's read; his friends' moods are simulated, as if they used Iris too.
- **v1 is kept for history:** `engine/decide_v1.py`, `engine/read.py`, `engine/lift.py`, `voice.lint_v1`, `bench/run_bench_v1.py`, `bench/RUBRIC_v1.md`, the 40 + 15 v1 cases and every v1 result file.

## Arjun's month (fictional)

42 days, 23 Sep to 3 Nov 2026. Days 1 to 14 only learn. Days 15 to 42: ordinary days, a tired study stretch (18 to 21), exam day (22), a low day after it (23), a weekend away in Chicago (31 to 33), a friend's secret in his messages (35), big news, he passed (36), a celebration (37), a gig (38), a blood test on his calendar (41). See `data/README.md`.

## New numbers

**Demo run** (`scripts/run_demo.py`, live Muse calls, `web/demo_data.js`): 28 days read, 114 notes to 5 people, 0 safe fallbacks, 0 word-check problems in the final notes. Sizes: 13 ordinary, 13 notable, 2 big (days 36 and 37). Actions: 35 messages, 30 reels, 30 songs, 8 lunches, 6 treats, 5 tickets; 38 marked as surprises. No note mentions Chicago, the exam, the blood test, the band, Priya or her job.

**v2 test bench** (`bench/cases_v2.json`, 28 cases, one run, `bench/results/v2-latest.md`):

| What I checked | Target | Result |
|---|---|---|
| Right decision (who, card, size, direction, surprise) | 90%+ | 27 of 28 |
| Safety cases (crisis words, self-harm, crisis reels, veiled crisis, age 17, Teen Account) | 100% | 6 of 6 |
| Notes that gave something away | 0 | 0 of 41 |
| Tone (word check and grader) | 95%+ | 30 of 41 |
| Shared interest | 100% | 41 of 41 |
| Action makes sense | 95%+ | 40 of 41 |
| Harmless if wrong | 95%+ | 39 of 41 |

The five leak traps (breakup, medical test, money trouble, a family secret, a layoff) shared the mood and never the reason. The one miss: the layoff day was read as "big", so his brother on Big moments only also got a note. The tone misses are mostly the grader disliking "Send Arjun a song", which repeats the name and echoes the button. The bench was written and run once, without tuning to it.

**Tests:** 11 offline test files, all passing (`for t in tests/test_*.py; do python3 $t; done`). New: `test_actions.py`; rewritten for v2: `test_decide.py`, `test_safety.py`, `test_voice.py`, `test_privacy.py`, `test_rule.py`, `test_parser.py`. v1 versions kept as `test_decide_v1.py` and `test_voice_v1.py`.

**Spend:** about $26.33 before this work, about $30.46 after (list prices, `out/usage.log`).

## What in README.md is now out of date

The README has a note at the top saying it describes v1. These parts need rewriting:

- The tagline, the example lift and "That line is all your friend sees. No feelings": notes now say the mood.
- "What it does": setup now covers calendar and Spotify as inputs; permissions are Every day / Big moments only / Never (not Always / When it matters / Just this once); there is no weekly limit; "Noticing" is now a daily read in any direction, with the rule as one input.
- "How it works" diagram and the three rules: the writer now also sees the mood word and the action type; the word check allows mood words.
- "Iris says plainly what it never reads (the words in your messages...)": v2 reads your own words for the gist. Other people's words are still never read.
- "How I tested it", parts 1 and 2: the month is now 42 days with a different story, and the v2 bench numbers above replace the v1 table (keep v1 as history if you like).
- "What isn't finished": the calendar and music connectors are now simulated feeds in the engine, not only designs.
- Privacy, "One thing crosses... that you could use something nice. Never why": now the mood crosses, never why.

## Open questions for Rashad

1. House style: should the nudge repeat the name ("Send Arjun a song") or not? The writer does it, the grader marks it robotic.
2. Is a layoff, a breakup or a really hard day "big"? It decides whether Big moments only friends hear about it.
3. Day 23 was meant to be low; Muse read it as tired. Fine, or should the low day be clearer?
4. Should the friend's view moods for Maya, Sam and others stay simulated, or be dropped for the video?
5. The Daily Page and journal are still v1 modules and are not in the v2 demo data. Keep, cut or rebuild?
