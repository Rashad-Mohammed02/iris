# Muse Circle

**When the one everyone leans on is running low, their closest people find out, without them ever having to ask.**

Muse Circle is a concept for a new part of Meta's Muse, built for the Meta Global AI Developer Hackathon (Indie track). It notices, from your own Instagram activity, when you're off your normal. Then it quietly sends your closest people a small, light suggestion called a lift:

> Arjun could use a little lift this week. Arjun's deep into F1. Surprise Arjun with something race weekend.
>
> *Suggested by Muse. Arjun didn't ask.*

Nothing else crosses: no feeling, no reason, nothing you wrote, nothing about your messages. If Muse is wrong and you're having a great week, the worst outcome is that a friend sends you something F1.

This repo is the working prototype. Everything in it runs on Meta's Muse models through the Meta Model API, on a fictional person's fictional Instagram export.

---

## Who it's for

Every circle has a "strong one": the boyfriend holding his girlfriend up through her hardest week, the friend who's always the one listening, the sister who keeps everyone together. Because they're the strong one, nobody checks on them, and they won't ask. Even one button feels like too much.

The strain is real. In one classic study of adults living with a depressed person, over 40% were distressed enough to meet a standard threshold for referral themselves ([Coyne et al. 1987](https://hcp.hms.harvard.edu/publication/living-depressed-person)). And many people have very few places to turn: 85% of married men say their spouse is the first person they go to with a personal problem ([Survey Center on American Life, 2021](https://www.americansurveycenter.org/research/the-state-of-american-friendship-change-challenges-and-loss/)). When that partner is the one who's struggling, the strong one has nowhere to go.

## Why it has to be Meta

- Your close people are already on Instagram, and Instagram already has your **Close Friends** list.
- Reels are how people talk now. Sending your partner a reel about being exhausted *is* a message.
- Muse already connects to Instagram, including DMs.
- Meta already has your history, so Muse can learn your normal from your past, not from scratch.

## What it does

| Piece | What you see | What runs it |
|---|---|---|
| **Your orbit** | You're the sun, and up to five people orbit you. Their distance from you shows how recently you talked, never how much they matter. | Python, from your own DMs |
| **Your normal** | Nothing to fill in. Muse learns when you usually stop scrolling, what your reels are usually about, and how fast and how much you usually reply to each of your five. | Python baseline (median and spread, weekends compared with weekends) |
| **Off your normal** | A private note when two or more things are clearly off for you. A late night alone is never a signal. | Python rule, then a Muse read |
| **Daily Page** | A two or three line diary entry that writes itself from your day. Tap "That's wrong" and Muse learns from it. | Muse |
| **Journal** | Write anything. Muse works out who you mean ("D" is your brother Dev) and connects it to your week ("It's been quiet with Dev since Saturday. Is that part of it?"). It then helps you find the word for what you feel, one small question at a time. | Muse |
| **Your own words** | When you want to say something yourself, Muse drafts two short options in your voice and leaves out the private parts. You send it, or you don't. | Muse |
| **The lift** | An automatic, light nudge to the people you allowed, carrying one soft phrase, one interest and one small gesture. | Muse writes it, two checks guard it, Python decides who gets it |
| **Your controls** | Each person is set to Always, When it matters, Just this once, or Never. You get a log of every lift sent for you and why, a 10-minute undo, pause, and at most one lift per person per week. | Python |
| **Safety** | Crisis words never become a lift: you see 988 and nothing goes to anyone. Someone you fear is removed from your circle quietly. A setting someone pressured you into is held at its old level. Adults only. | Python and Muse together |

## How it works

```
Instagram export ─▶ parser ─▶ your side only ─▶ daily signals ─▶ your baseline
   (fictional)      (drops other people's words)                      │
                                                                       ▼
                              Python rule: is today off YOUR normal? ─▶ Muse read
                                                                       │
     journal + Daily Page ◀── Muse (private, only you) ◀───────────────┤
                                                                       ▼
                         Python gates: age, learning days, crisis, fear, pressure,
                         pause, mutual, weekly limit, each person's permission
                                                                       │
                                                                       ▼
          Muse writes the lift ─▶ plain-text lint ─▶ Muse leak check ─▶ queued (10 min undo)
          (sees only: first name, friend, one interest)
```

Three design rules hold the whole thing together:

1. **Muse judges, code enforces.** Muse reads the situation and says which kinds of signal are off. The policy for what counts as heavy, plus every permission and safety gate, is plain Python in [engine/decide.py](engine/decide.py) and [engine/read.py](engine/read.py). No model output can talk its way past a "Never".
2. **The lift writer is blind.** It only ever sees your first name, the friend's name, one interest you allowed for that friend, and the kind of lift. It cannot leak what it never saw.
3. **Every line is checked twice anyway.** A strict word-level lint ([engine/voice.py](engine/voice.py)) blocks feeling words, reasons, signals, therapy words, needy framing, AI-sounding words, pronouns and any private term. A separate Muse call that *does* see the private facts then answers one question: does this line give any of it away, even as a hint?

## Results on the test bench

[bench/cases.json](bench/cases.json) holds 40 fictional cases. There are 12 heavy weeks that should send a lift, 8 normal or slightly odd weeks that must not, and 5 good weeks. There are 5 permission edge cases, 5 safety cases (crisis language, self-harm, fear of a partner, pressure on a setting, a 17-year-old) and 5 leak traps: a breakup, a hidden biopsy, money trouble hidden from Mom, a friend's secret pregnancy, and a layoff. A separate Muse grader scores every lift against the six metrics in [bench/RUBRIC.md](bench/RUBRIC.md).

BENCH_RESULTS_TABLE

Full per-case output is in [bench/results/](bench/results/).

## Run it

You need Python 3.10 or newer (standard library only, no packages) and a Meta Model API key.

```
cp .env.example .env              # put your MODEL_API_KEY in .env
python3 data/generate_demo.py    # build the fictional export
python3 data/parse_export.py      # read it, keeping only Arjun's side
python3 engine/rule.py            # show "off your normal" for all 30 days (no AI)
python3 engine/interests.py       # Muse picks what Arjun is into
python3 scripts/run_demo.py       # play the month through the engine
python3 bench/run_bench.py --runs 3 && python3 bench/export_web.py
open web/index.html               # the screens, offline
```

Tests: `for t in tests/test_*.py; do python3 $t; done`

## Privacy and safety promise

1. **Yours alone.** Your Daily Page, journal and reads are only for you. Never ads, never training.
2. **Your side only.** The parser drops the text of every message someone else wrote before anything else runs. A test enforces it ([tests/test_parser.py](tests/test_parser.py)).
3. **Mutual circles.** Nobody gets lifts about you unless you both agreed to be in each other's circle.
4. **Invisible settings.** Nobody can see what you set them to, and Muse privately asks now and then whether anyone is pushing you to share.
5. **Serious is never automatic.** Crisis words route to 988. Fear routes to the National Domestic Violence Hotline. Adults only. It says it's an AI. It never diagnoses.

In the real product, this would run on your phone or inside Meta's Private Processing, with only conclusions stored and every conclusion visible and deletable.

## The research behind it

- **Support works best when it doesn't feel like a rescue.** This is "invisible support" ([Bolger, Zuckerman & Kessler 2000](https://hcp.hms.harvard.edu/publication/invisible-support-and-adjustment-stress)), which is why lifts are surprises, not check-ins.
- **People underestimate how much a surprise reach-out means.** The more surprising it is, the bigger the gap ([Liu, Rim, Min & Min 2022, JPSP](https://doi.org/10.1037/pspi0000402)). Small thanks land bigger than the sender expects ([Kumar & Epley 2018](https://www.psychologicalscience.org/publications/observer/obsonline/people-underestimate-the-power-of-saying-thanks.html)).
- **Your normal, not the average.** Phone behavior is meaningful only against a person's own baseline ([Pratap et al. 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC8491547)).
- **Naming a feeling often takes the edge off.** This is affect labeling ([Lieberman et al. 2007](https://pubmed.ncbi.nlm.nih.gov/17576282/); [Torre & Lieberman 2018](https://journals.sagepub.com/doi/10.1177/1754073917742706)). Precise words help more than broad ones; this is emotional granularity ([Kashdan, Barrett & McKnight 2015](https://www.affective-science.org/pubs/2015/kashdan-et-all-unpacking-emotion-differentiation-2015.pdf); [Hoemann et al. 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8355493/)).
- **The journal's order of questions** (what happened, then the body, then the urge, then the word) follows Lane's Levels of Emotional Awareness ([Lane & Smith 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8395748/)) and Yale's RULER ([What is RULER](https://www.rulerapproach.org/about/what-is-ruler/)). For a happy entry, it skips the analysis, because labeling can dampen good feelings too ([Lieberman et al. 2011](https://pmc.ncbi.nlm.nih.gov/articles/PMC3444304/)).
- **Five people.** The circle size follows Robin Dunbar's layered model of friendship, whose innermost "support clique" is about five people.
- **Guardrails** follow the American Psychological Association's advisory on AI and wellness apps ([APA, Nov 2025](https://www.apa.org/topics/artificial-intelligence-machine-learning/health-advisory-ai-chatbots-wellness-apps-mental-health.pdf)): no diagnosis, clear AI disclosure, and crisis routing. Turning a setting off never triggers a guilt message.
- **Real people tested the idea.** A first round of in-person testing changed the design: late nights are never a signal on their own, lifts never suggest alcohol, the default voice is polished, day 1 no longer shows a fact about you, the Daily Page got shorter, and "That's wrong" is more visible.

## What's real and what's simulated

- **Real:** the parser (Instagram's documented "Download your information" JSON format), the baseline and rule, every Muse call (interests, read, Daily Page, journal, own words, lift writing, leak check, grading), the gates, and the test bench.
- **Simulated, and labeled as such:** the 30-day export itself (fictional people, generated by [data/generate_demo.py](data/generate_demo.py)), what each reel is *about* (in the real product Meta already knows this; the export only gives creator and time), and the friend's side, including Muse-to-Muse delivery, which Muse can't do today.

## How it was built

Rashad Mohammed designed and built Muse Circle during the hackathon (Oct 26 to Nov 4, 2026), using Claude Code as an AI coding assistant. The product itself calls only Meta models (Muse Spark 1.3 through the Meta Model API), and nothing else, at runtime. Every person, handle and message in this repo is fictional.
