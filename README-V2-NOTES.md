# Iris v2: notes for rewriting the README

Facts and numbers for Rashad to rewrite README.md in his own voice. Written 28 Oct 2026. Nothing here is final copy.

## What v2 is, in the engine

- **Every day, any mood.** Once a day Muse reads the day against your own normal and returns one plain mood word (happy, proud, excited, buzzing, relieved, calm, content, okay, busy, focused, tired, stressed, nervous, low, sad, restless), a general moment for your own log ("exam day", "a weekend away"), a size (ordinary, notable or big), a crisis flag, and a good fit for each friend: one shared interest, one action type, and whether it should be a surprise. Prompt: `prompts/day_v1.txt`, code: `engine/day.py`.
- **Four inputs.** What you see and what you talk about come from the Instagram export (your own side only; v2 now keeps your own message words so Muse can read the gist, never anyone else's). What happens to you (calendar) and what you hear (Spotify) are two **simulated** feeds in `data/demo_connectors/`, format in `engine/connectors.py`. No real calendar or Spotify account is read.
- **The note is minimal.** Rashad's house style (28 Oct): "Arjun, happy day." then a short warm nudge that sounds like a friend texting, with the ready action under it: "Arjun, proud day. Two seats for live music to celebrate?", "Arjun, a little sad today. A soft song for this evening?". The name appears once, at the start; the nudge never repeats it, uses no pronoun and never reads like a button label ("Send Arjun a song" is out). The word check now enforces the name rule in code. The writer (`prompts/note_v2.txt`, `engine/note.py`; `note_v1.txt` kept for history) sees only your first name, the friend's relation, the mood word, one shared interest and the action type. It never sees the moment or anything from your day.
- **Ready actions are built in code** (`engine/actions.py`), never by a model: song (from your usual favorites, never today's), reel, lunch (an hour from noon to 2 PM in the next three days when both calendars are free, only for friends marked nearby, OpenTable), tickets (a public show with tickets that fits the shared interest, Ticketmaster), treat (delivered; Iris fills in the address so the friend never sees it), message. A treat is always a surprise; tickets, a song or a reel can be.
- **Signature:** "Suggested by Muse. Arjun didn't ask." when it sends on its own, "Suggested by Muse." under Ask me first.
- **Gates, in plain code** (`engine/decide.py`): adults only (Teen Accounts never), crisis from reels or from your own words stops everything before any model call and shows your country's help line, 14 learning days, pause, then per friend Every day (the default) / Big moments only / Never, mutual, the friend must be an adult. People set to Never, not mutual or under 18 are never named to Muse. Sources you switch off are removed before Muse reads anything. Notes go at your time of day (default 6 PM); "auto" queues them with 10 minutes to cancel, "ask" waits for your OK.
- **Two checks on every note**, as before: the word check (`engine/voice.py`; mood words are now allowed, while therapy and diagnosis words, crisis words, quote marks, other names, health, money, work trouble, relationship details and source words stay banned) and a separate Muse privacy check (`prompts/check_v2.txt`) that sees the whole day. The reason for the mood counts as a leak.
- **Friend's view data.** Each demo day carries `friend_view`: Arjun's 5 and how each feels today. Arjun's mood is the engine's read; his friends' moods are simulated, as if they used Iris too, and marked `source: "simulated"` and labelled SIMULATED in the `web/demo_data.js` header.
- **Big moments** means a day that really stands out, good or hard. A layoff or a breakup day is big, so friends on Big moments only hear about it too (`prompts/day_v1.txt`).
- **v1 is kept for history:** `engine/decide_v1.py`, `engine/read.py`, `engine/lift.py`, `voice.lint_v1`, `bench/run_bench_v1.py`, `bench/RUBRIC_v1.md`, the 40 + 15 v1 cases and every v1 result file.

## Arjun's month (fictional)

42 days, 23 Sep to 3 Nov 2026. Days 1 to 14 only learn. Days 15 to 42: ordinary days, a tired study stretch (18 to 21), exam day (22), a low, sad day after it (23: sad songs, sad-day reels and his own words say "just a sad day"; the rest of the month is byte-identical to before), a weekend away in Chicago (31 to 33), a friend's secret in his messages (35), big news, he passed (36), a celebration (37), a gig (38), a blood test on his calendar (41). Dev (his brother) is now marked nearby, so he can get the lunch idea too. See `data/README.md`.

## New numbers

**Demo run** (`scripts/run_demo.py`, live Muse calls, `web/demo_data.js`, rerun 28 Oct with the new note style): 28 days read, 114 notes to 5 people, 0 safe fallbacks, 0 word-check problems in the final notes, 0 notes that repeat the name. Sizes: 13 ordinary, 13 notable, 2 big (days 36 and 37). Moods: happy days 15 to 17, tired 18 to 20 and 22, nervous 21 (exam tomorrow), **sad on day 23**, tired 24, proud 36 and 37. Actions: 34 messages, 29 reels, 29 songs, 11 lunches (Dev on days 19, 25, 36, 37), 8 treats, 3 tickets; 37 marked as surprises. No note mentions Chicago, the exam, the blood test, the band, Priya or her job.

**v2 test bench** (`bench/cases_v2.json`, 28 cases, `bench/results/v2-latest.md`). Before is the first run (old note style, old grader). After is two runs with the new style: run 1 with `note_v2.txt` as first written, run 2 after one change (the writer was copying the examples word for word, so the prompt now says they show the shape only).

| What I checked | Target | Before | After, run 1 | After, run 2 (latest) |
|---|---|---|---|---|
| Right decision (who, card, size, direction, surprise) | 90%+ | 27 of 28 | 28 of 28 | 27 of 28 |
| Safety cases | 100% | 6 of 6 | 6 of 6 | 6 of 6 |
| Notes that gave something away | 0 | 0 of 41 | 0 of 41 | 0 of 42 |
| Tone (word check and grader) | 95%+ | 30 of 41 | 41 of 41 | 42 of 42 |
| Shared interest | 100% | 41 of 41 | 41 of 41 | 42 of 42 |
| Action makes sense | 95%+ | 40 of 41 | 41 of 41 | 42 of 42 |
| Harmless if wrong | 95%+ | 39 of 41 | 41 of 41 | 42 of 42 |

What changed: the note style (above); the grader and the engine's own privacy check now judge that style instead of calling it robotic, and say a plainly worded down mood is fine by itself (the tone and harm misses before were almost all that); the layoff case now expects Dev on Big moments only to get a note and the breakup and layoff cases expect "big". The run 2 miss: on the family secret case (V2-25, his sister's private news) Muse read his day as "big", so Dev also got a cheerful note. Run 1 read the same case as ordinary with the same day prompt, so this is run-to-run variance in the day read, not the note change. Nothing private leaked in either run. Honest caveat: the grader was changed in the same step as the writer, so part of the tone jump is the grader now agreeing with the house style.

**Tests:** 11 offline test files, all passing (`for t in tests/test_*.py; do python3 $t; done`). New: `test_actions.py`; rewritten for v2: `test_decide.py`, `test_safety.py`, `test_voice.py`, `test_privacy.py`, `test_rule.py`, `test_parser.py`. v1 versions kept as `test_decide_v1.py` and `test_voice_v1.py`.

**Spend:** about $26.33 before v2, $30.46 after the first v2 pass, about $35.82 after this tuning pass (two bench runs $2.66, the demo $2.68, one day-23 check $0.02; list prices, `out/usage.log`).

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

Settled on 28 Oct: the house style (name once, then a friend's nudge), hard days count as big, day 23 is now clearly sad, the friends' moods stay simulated and labelled.

1. The family secret case read as "big" in one of two runs. Should someone else's news never make his day big (one line in `prompts/day_v1.txt`, then a bench rerun)?
2. The nudges lean on a few shapes ("your best take on F1", "a song to keep it going"). Fine for the video, or should the writer vary more across days?
3. The Daily Page and journal are still v1 modules and are not in the v2 demo data. Keep, cut or rebuild?
