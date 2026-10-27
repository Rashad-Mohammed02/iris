# Iris

**When you're running low, the people closest to you find out, without you having to ask.**

Iris is a concept app in the Meta family that works with Muse, Meta's AI agent. I built it for the Meta Global AI Developer Hackathon (Indie track). It notices from your own Instagram when you're off your normal, and quietly gives one of your closest people a small idea of something nice to do with you:

> Arjun could use a little lift this week. Maybe watch the next F1 race together?
>
> *Suggested by Muse. Arjun didn't ask.*

That line is all your friend sees. No feelings, no reasons, nothing you wrote, nothing about your messages. If Iris is wrong and you're having a great week, the worst that happens is a friend asks you to watch a race.

Everything in this repo runs on Meta's Muse Spark 1.3 through the Meta Model API. It's a hackathon concept, not a Meta product. The demo person, Arjun, and his friends are fictional. I also tested the rule on 11 real Instagram downloads (more below).

**Try it:** open `web/index.html`. It shows only Iris, on a phone, the way it would really look. Go through setup, switch between Arjun's phone and his friend Sam's, step through the story with Next, or open "Under the hood" to see every decision.

---

## Why I built it

Everyone is the strong one for someone. The friend who checks on everybody, the brother holding the family together, the one who always listens. Because they're the strong one, nobody checks on them, and they don't ask. Asking is the hardest part.

The strain is real. In one study of adults living with a depressed person, over 40% were distressed enough to need support themselves ([Coyne et al. 1987](https://hcp.hms.harvard.edu/publication/living-depressed-person)). And support helps most when it doesn't feel like a rescue ([Bolger, Zuckerman and Kessler 2000](https://hcp.hms.harvard.edu/publication/invisible-support-and-adjustment-stress)). So Iris never says "check on Arjun". It hands a friend something easy and normal to do.

## Why it has to be Meta

- Your closest people are already on Instagram, and Instagram already has your Close Friends list.
- Reels are how people talk now. Sending someone a reel about being exhausted is a message in itself.
- Muse is already Meta's personal agent, and Meta already knows what a reel is about.
- Only Meta could build this for real: Instagram doesn't share what you watch with outside apps.

## What it does

**Setup.** You sign in with Instagram and allow one connector. Iris says plainly what it reads (the reels you watch and send, when you scroll, who you message and when) and what it never reads (the words in your messages, your photos, where you are). You pick up to five people from your Close Friends, give them nicknames if you want, and choose when each one may get a lift: Always, When it matters, Just this once, or Never. Each person has to say yes, and circles go both ways.

**The first two weeks.** Iris only learns your normal. Nothing is judged and nothing goes out.

**Noticing.** After that, Iris compares each day only with your own normal, in three areas:

| Area | What it looks at |
|---|---|
| Your nights | The longest stretch each night with no activity, a common phone-based stand-in for sleep. Getting to sleep much later, much shorter nights, much longer nights, or being up in the middle of your usual rest. |
| What you choose | Heavier reels than usual among the ones you save, send and watch, and your usual loves fading. |
| Your people | Slower replies, far fewer or far more messages, starting fewer conversations, sending heavier reels, going quiet with someone. |

A day only counts as off when two of these agree, from two different areas, and at least one is your nights or your people. Content alone can never start anything. Three off days in five make a heavy stretch. Writing back to someone you'd gone quiet with counts as recovering, not as a slow reply.

**What you see.** A short private page about your day, and "What I'm noticing this week" in plain words, with a "Not about me" button on each line, like Instagram's reels controls. How Iris read each reel stays out of your view.

**The lift.** When you're off your normal and someone's setting allows it, Muse writes one or two sentences for them. You choose how it leaves: "Ask me first" (the default, you tap Send) or "Send on its own" (with 10 minutes to stop it). At most one lift per person per week.

**The friend's side.** Your friend sees the line and "Suggested by Muse", and can plan something or tap Not now. You never know which. If they ask Muse why, it won't say. They can leave your circle any time. Lifts can land in the Iris app, Instagram, Muse, or on a Muse Charm.

**The journal.** A private companion that uses your week to understand what you write. Type "still haven't texted D back" and it knows D is your brother Dev, because you haven't written to him since Saturday. It walks you through what happened, what you felt in your body and what you wanted to do, then helps you find the word for it. If you want, it helps you write to Dev in your own words. It never sends anything.

**Together (coming soon).** When people in your circle love the same thing, or are going to the same event, Iris suggests doing it together.

## How it works

```
Instagram download ─▶ reader ─▶ your side only ─▶ daily signals ─▶ your normal (14 days)
                                (other people's words are dropped)           │
                                                                             ▼
                          Rule: two areas agree? ─▶ Muse reads the week ─▶ stretch
                                                                             │
                    Gates in plain code: age, crisis, fear, pressure, pause, mutual,
                    weekly limit, each person's setting                       │
                                                                             ▼
   Shared interest (from the reels you send that friend) ─▶ Muse writes the lift
   ─▶ word check ─▶ Muse privacy check ─▶ waits for your OK
```

Three rules hold it together:

1. **Muse judges, code decides.** Muse reads the week. Every permission and safety rule is plain Python in [engine/decide.py](engine/decide.py), so nothing a model says can get past "Never".
2. **The writer can't leak what it never saw.** It only knows your first name, your friend's name and one interest the two of you already share, which Iris works out from the reels you send that friend ([engine/demo.py](engine/demo.py)).
3. **Every line is checked twice anyway.** A word check ([engine/voice.py](engine/voice.py)) blocks feelings, reasons, therapy words, AI-sounding words and private terms. Then a separate Muse call that does see the private facts answers one question: does this line give anything away, even a hint? If the interest itself points at the secret, it switches interest or sends nothing.

**Safety comes first, in code.** Crisis words in the journal, or reels about suicide or self-harm that you watch, save or send, never become a lift. You see the 988 line and nothing goes to anyone, even during the first two weeks ([engine/safety.py](engine/safety.py)). Someone you're afraid of is quietly removed. A setting someone pressured you into is held at Never. Adults only.

## How I tested it

**1. Arjun's month.** A fictional 30-day Instagram download in the real export format ([data/generate_demo.py](data/generate_demo.py)). The rule stays quiet for three normal weeks, catches his hard week, and lets go when he starts writing back to people ([tests/test_rule.py](tests/test_rule.py)).

**2. The test bench.** 40 fictional cases ([bench/cases.json](bench/cases.json)): heavy weeks that should send a lift, normal and good weeks that must not, permission edge cases, safety cases (crisis words, self-harm, fear of a partner, pressure, a 17-year-old) and five leak traps (a breakup, a hidden biopsy, money trouble, a friend's secret pregnancy, a layoff). A separate Muse grader scores every lift against [bench/RUBRIC.md](bench/RUBRIC.md).

Three full runs on the current engine (78 lifts written in total):

| What I checked | Target | Result across 3 runs |
|---|---|---|
| Sent a lift when it should, stayed quiet when it should | 90%+ | 120 of 120 right |
| Safety cases caught (crisis, self-harm, fear, pressure, under 18) | 100% | 15 of 15 |
| Lifts that gave something away | 0% | 0 of 78 |
| Lifts that sound like a friend, not an app | 95%+ | 77 of 78 |
| Interest really shared by the two people | 100% | 78 of 78 |

An earlier run had one leak: a lift suggested "a quiet night" with board games, in a week the person had gone quiet with someone. "Quiet" is now a blocked word.

These 40 cases were also used while I tuned the prompts, so they flatter the engine. So I had 15 more written by a separate agent that never saw my prompts or code ([bench/heldout_cases.json](bench/heldout_cases.json)). They include lifts in Hindi, Portuguese, Korean, Arabic and isiZulu, a calm goodbye with no crisis words, and a brother's arrest kept from Dad.

| What I checked | Result across 3 runs |
|---|---|
| Right decision | 45 of 45 |
| Safety cases caught | 6 of 6 |
| Lifts that gave something away | 1 of 36 |
| Interest really shared | 36 of 36 |

The one leak was in Spanish. After a hard stretch, a good-week lift to someone's girlfriend began "Todo va bien con Ignacio ahora", meaning everything's fine with Ignacio now. That hints something was wrong before. The word check now blocks recovery words like "now", "again" and "better" in English and Spanish, and the same case passed three more runs ([bench/results/heldout-HO09-recheck.md](bench/results/heldout-HO09-recheck.md)). An earlier version also read a busy exam week as a hard one; Muse now treats a dated event the person is upbeat about as explained.

The first time I ran those 15, they caught a real leak: Dad's allowed interest was "Law & Order reruns", in the week his son was arrested. Now the privacy check also asks whether the interest itself hints at the secret.

**3. Real Instagram downloads.** I wanted to know whether the rule cries wolf on real people's messy lives. Researchers at Utrecht University published 11 real Instagram downloads from accounts they created and used for one to two weeks ([Boeschoten, van den Goorbergh and Oberski, 2021](https://doi.org/10.5281/zenodo.4472606), CC BY 4.0). They use Instagram's older 2020 layout, so I taught the reader that format too ([data/parse_export_2020.py](data/parse_export_2020.py)). Five accounts had enough activity. I repeated each person's real days to six weeks, then changed the last week ([bench/real_rhythms.py](bench/real_rhythms.py)):

| What changed in the last week | Result |
|---|---|
| Nothing (normal weeks) | 1 false alarm in 105 days |
| Hard week: nights fall apart and they message their people far less | Caught for 2 of 5 people |
| Late nights only, or quieter only | Flagged 1 time in 10 |

The two people it caught message their circle every day. The three it missed barely do, so Iris could see their nights change but had nothing on the social side to agree with, and it held back instead of guessing. That's the trade-off I chose. The normal weeks are real; the hard week is made up, because these accounts never had one. Full results: [bench/results/real_rhythms.md](bench/results/real_rhythms.md).

**4. People.** Friends tried the idea through a walkthrough with their own people's names, and their answers changed the design. Late nights alone are never a signal ("that's a normal week for me"). The daily page shrank to a line or two about you alone ("keep it about me"). Lifts now wait for your OK by default, because finding out after the fact felt like "my app told on me". The test I share with friends and family is a separate page from this prototype.

## What isn't finished

- **What a reel is about** comes from a simulated file here. Instagram's download doesn't include captions, hashtags or music. Inside Meta, Muse would already know.
- **Together, Muse Charm, and the Calendar, Events, Music and WhatsApp connectors** are designs, marked "Coming soon".
- **The friend's side and delivery** are simulated. Muse can't send to another person's Muse today.
- **Quiet people.** For someone who rarely messages their circle, Iris has little to go on, as the real-data test showed.
- **The app's journal** replays replies Muse wrote during the demo run. The live journal runs in [engine/journal.py](engine/journal.py).

## Privacy

- **Your side only.** The reader drops the words of every message someone else wrote before anything else runs. A test enforces it ([tests/test_parser.py](tests/test_parser.py)).
- **Secure, inside Meta.** Everything Iris reads is processed by Meta's Muse models through the Meta Model API. Nothing is used for ads.
- **Mutual and invisible.** Nobody gets lifts about you unless you both agreed, and nobody can see what you set them to.
- **One thing crosses, because you chose it:** that you could use something nice. Never why.

## Run it

You need Python 3.10 or newer (standard library only) and a Meta Model API key.

```
cp .env.example .env               # put your MODEL_API_KEY in .env
python3 data/generate_demo.py      # build Arjun's fictional download
python3 data/parse_export.py       # read it, keeping only Arjun's side
python3 engine/rule.py             # "off your normal" for all 30 days (no AI)
python3 engine/interests.py        # Muse names what Arjun is into
python3 scripts/run_demo.py        # play the month through the engine
python3 bench/run_bench.py --runs 3 && python3 bench/export_web.py
python3 scripts/fetch_real_exports.py && python3 bench/real_rhythms.py   # the real-data test
open web/index.html                # the app, offline
```

Tests: `for t in tests/test_*.py; do python3 $t; done`

Every Meta API call is logged with its token count in `out/usage.log`, and the engine stops itself at an estimated $100.

## The research behind it

- **Your normal, not the average.** Phone signals mean something only against a person's own baseline, and no single behavior is reliable alone, so Iris waits for two areas to agree ([Pratap et al. 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC8491547)).
- **Surprise reach-outs mean more than people expect** ([Liu, Rim, Min and Min 2022](https://doi.org/10.1037/pspi0000402)).
- **Naming a feeling takes the edge off** ([Lieberman et al. 2007](https://pubmed.ncbi.nlm.nih.gov/17576282/)), and precise words help more than broad ones ([Kashdan, Barrett and McKnight 2015](https://www.affective-science.org/pubs/2015/kashdan-et-all-unpacking-emotion-differentiation-2015.pdf)). The journal's order of questions follows Lane's Levels of Emotional Awareness ([Lane and Smith 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8395748/)) and Yale's RULER.
- **Five people**, after Robin Dunbar's innermost "support clique".
- **Guardrails** follow the American Psychological Association's advisory on AI and wellness apps ([APA, Nov 2025](https://www.apa.org/topics/artificial-intelligence-machine-learning/health-advisory-ai-chatbots-wellness-apps-mental-health.pdf)): no diagnosis, clear AI disclosure, crisis routing.

## How I built it

I planned, designed, built and tested Iris during the hackathon (Oct 26 to Nov 4, 2026). Tools I used: Meta's Muse Spark 1.3 and Muse Image through the Meta Model API, Python, plain HTML and JavaScript, and Claude Code as my AI coding assistant. The app itself calls only Meta models. Iris's character was made with Muse Image. Every person, handle and message in the demo is fictional.

## License

MIT. See [LICENSE](LICENSE).
