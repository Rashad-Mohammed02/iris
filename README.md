<p align="center"><img src="web/img/p-wave.webp" alt="Iris, a small peach plush character, waving" width="220"></p>

# Iris

**Keeps you close to your 5 people, every day.**

Iris is a concept for Muse, Meta's AI agent. I built it for the Meta Global AI Developer Hackathon (Indie track). Once a day, at a time you pick, Iris tells each of your 5 closest people how you're feeling, in a word or two, and gives them one easy way to show up for you:

> Arjun, proud day. Two seats for live music this weekend?
>
> *Suggested by Muse. Arjun didn't ask.*

Happy, tired, a bit low: any mood counts. Your friend sees the mood and the idea. Never why.

In Arjun's fictional 42-day month, Iris wrote 114 notes to his 5 people. None of them mentioned his exam, his trip, his blood test or a friend's secret, even though all of it was in his messages and calendar.

Everything in the app runs on Meta's Muse Spark 1.3 through the Meta Model API. It's a hackathon concept, not a Meta product. Arjun and his friends are fictional.

**Try it:** https://rashad-mohammed02.github.io/iris/ (or open `web/index.html`). It shows only Iris, on a phone, the way it would really look. Step through Arjun's month, see his friends' phones, or open "Under the hood" to see every decision the engine made.

---

## What I built, and what's Meta's

Everything in this repo was built during the hackathon, Oct 26 to Nov 4, 2026. The first commit is from Oct 27.

**I built:** the Iris app and every screen in it, the engine (the daily read, the gates, the note writer, the ready actions, the word check and the privacy check), the prompts, the test bench and its 28 cases, the fictional month for Arjun, the Instagram export reader, and Iris's character, which I made with Muse Image.

**Meta's, used as it is:** Muse Spark 1.3 and Muse Image (through the Meta Model API), and the idea of Instagram, Muse and the Muse Charm as places Iris would live. Iris doesn't connect to the real Instagram, Muse or a Charm here: those parts are simulated and marked in the app.

**Someone else's, credited:** 11 research Instagram downloads from Utrecht University (CC BY 4.0), used only for testing.

## Why I built it

When I started using Muse, it was booking my movie tickets for me within my first 48 hours. It started from there. I'd also been reading a lot about mental health and how fast AI is growing.

In October 2026 I went to TEDx Boston at Whoop's office. The theme was longevity, and Alexandra Drane spoke about caregivers: they need help and support too. Everyone's a caregiver, everyone keeps switching that role, and everyone needs that red telephone moment.

Iris comes from all of that. Your closest people don't always know how your day is going. The big news, the long week, the low day: most of it never gets said, because you're busy, or you don't want to make it a thing.

I wanted those 5 people to be there anyway. In my words while building it: "Those five people are always there, connected to you, even without you telling them." And "it's not just when things are sad. It's every time. Happy is okay, sad is okay, tired is okay."

Two things from research shaped it. People underestimate how much a small reach-out means to the other person ([Liu, Rim, Min and Min 2022](https://doi.org/10.1037/pspi0000402)). And sharing good news with someone who responds warmly makes it feel even better ([Gable, Reis, Impett and Asher 2004](https://doi.org/10.1037/0022-3514.87.2.228)). So Iris isn't only for hard days.

## Why it has to be Meta

Meta already knows who your closest people are. No other company sees how you and your people talk across Instagram, Facebook and Threads, and Muse can already connect to those accounts when you let it ([Meta Help Center](https://www.meta.com/help/artificial-intelligence/1687253048996149/)). Any other app would have to start from nothing.

- Instagram already has your Close Friends list, so picking your 5 takes seconds.
- Reels are how people talk now. What you watch, and what you send each friend, says a lot about your day and about what the two of you share.
- Muse can already reach your calendar and Spotify, so a note can be a real plan: a song, lunch when you're both free, tickets to a show you both like.
- On a Muse Charm, Iris could show how your 5 are doing without anyone picking up a phone.

## How Iris uses Meta's AI

| Meta tool | What Iris uses it for |
|---|---|
| Muse Spark 1.3 | Reads your day: one mood word, how big the day is, and a crisis check ([engine/day.py](engine/day.py)) |
| Muse Spark 1.3 | Finds what you're into from what you watch and send ([engine/interests.py](engine/interests.py)) |
| Muse Spark 1.3 | Writes each note ([engine/note.py](engine/note.py)) |
| Muse Spark 1.3 | Checks each note again with your whole day in view: does it give away why? ([engine/note.py](engine/note.py)) |
| Muse Spark 1.3 | Grades every note on the test bench ([bench/run_bench.py](bench/run_bench.py)) |
| Muse Image | Drew Iris and her poses ([scripts/make_character.py](scripts/make_character.py)) |
| Meta Model API | Runs every call above, with answers in a fixed format and a reasoning level set for each job |

I didn't use Muse Wonder, SAM 3.1 or Meta's open-weight models. Iris needs one short read a day, so the faster, cheaper Spark fits, and Iris never has to find objects in a picture.

## What it does

**Setup.** You sign in with Instagram, pick up to 5 people from your Close Friends, and choose how often each one hears from Iris: Every day, Big moments only, or Never. Each person has to say yes, and circles go both ways. You pick the time of day (6 PM by default) and switch off any source you don't want read.

**Your day.** Iris looks at four things: what you see (reels you watch and send), what you talk about (your own side of your messages), what you hear (Spotify) and what happens to you (your calendar). It compares today with your own normal, not anyone else's. The first two weeks it only learns.

**The note.** Muse picks one plain mood word, like proud, tired or a bit low, and for each friend one thing the two of you share. Then it writes a short note with a ready action under it: a song, a reel, lunch at a time you're both free, tickets, or a check-in, with Muse ready to send something small for you. Some notes are marked as a surprise.

**The 10 minutes.** At your time, you see today's notes. Cancel any of them, or they send on their own. If you'd rather approve each one, switch to "Ask me first".

**Your friend's side.** Your friend sees "Your 5 today", with how each of their people is feeling, and your note with its one-tap action. They can also see it on a Muse Charm.

**What a friend never sees:** why you feel that way, anything from your messages, other people's names, health, money, or where you are.

## How it works

```
Instagram export, calendar, Spotify ─▶ your side only ─▶ your normal (14 days)
                                                              │
                                                              ▼
                      Muse reads today: one mood word, a size, a crisis check
                                                              │
       Gates in plain code: adults only, crisis, learning days, pause,
       each friend's setting, mutual                          │
                                                              ▼
   One shared interest per friend ─▶ Muse writes the note ─▶ ready action (code)
   ─▶ word check ─▶ Muse privacy check ─▶ 10 minutes to cancel, then it sends
```

Three rules hold it together:

1. **Muse judges, code decides.** Muse reads the day. Every setting and safety rule is plain Python in [engine/decide.py](engine/decide.py), so nothing a model says can get past "Never".
2. **The writer can't leak what it never saw.** It only gets your first name, the friend's relation, the mood word, one shared interest and the kind of action ([engine/note.py](engine/note.py)). The ready action is built in code, not by a model ([engine/actions.py](engine/actions.py)).
3. **Every note is checked twice anyway.** A word check ([engine/voice.py](engine/voice.py)) blocks therapy words, crisis words, quotes, other people's names, health, money and relationship details. Then a separate Muse call that does see your whole day answers one question: does this note give away why?

**Safety comes first, in code.** Crisis words in your own messages, or reels about suicide or self-harm, never become a note. You see a help line for your country (988 in the US and Canada, Samaritans in the UK and Ireland, Lifeline in Australia, Tele-MANAS in India, findahelpline.com anywhere else) and nothing goes to anyone ([engine/safety.py](engine/safety.py)). Adults only. Teen Accounts are never eligible.

## How I tested it

**1. Arjun's month.** A fictional 42-day Instagram download in the real export format, plus a simulated calendar and Spotify ([data/generate_demo.py](data/generate_demo.py)). After two weeks of learning there's a tired study stretch, an exam, a low day, a weekend away, a friend's secret, big news, a gig and a blood test. His sad day reads as "Arjun, a little sad today" and his big news as "Arjun, proud day".

**2. The test bench.** 28 fictional cases ([bench/cases_v2.json](bench/cases_v2.json)): every kind of mood, ordinary and big days, every setting, six safety cases (crisis words, self-harm, crisis reels, a calm goodbye, a 17-year-old, a Teen Account) and five leak traps (a breakup, a medical test, money trouble, a family secret, a layoff). A separate Muse grader scores every note against [bench/RUBRIC.md](bench/RUBRIC.md).

| What I checked | Target | Result |
|---|---|---|
| Right decision (who hears, how big the day is, which way it went) | 90%+ | 28 of 28 |
| Safety cases caught | 100% | 6 of 6 |
| Notes that gave the reason away | 0 | 0 of 41 |
| Sounds like a friend texting | 95%+ | 41 of 41 |
| Built on something the two of them share | 100% | 41 of 41 |
| The ready action fits the note | 95%+ | 41 of 41 |
| Harmless if Iris read the day wrong | 95%+ | 41 of 41 |

These are numbers after tuning. I wrote the cases first, then adjusted the note wording and the grader on them, and an earlier run missed 1 of the 28 decisions. The five leak traps shared the mood and never the reason.

**3. Real Instagram downloads.** I also tested an earlier version of the engine on real downloads from 11 research test accounts at Utrecht University ([Boeschoten, van den Goorbergh and Oberski 2021](https://doi.org/10.5281/zenodo.4472606), CC BY 4.0). Five had enough activity to use. On normal weeks built from their real days it raised 1 false alarm in 105 days. Full results: [bench/results/real_rhythms.md](bench/results/real_rhythms.md).

**4. People.** Friends and family try Iris through a separate walkthrough with their own people's names, and their answers changed the design. Late nights alone are never a signal ("that's a normal week for me"). Notes send on their own by default, with 10 minutes to cancel, and "Ask me first" is there because a tester asked to see a note before it goes.

## What isn't finished

- **Calendar and Spotify** are simulated feeds in this repo. No real account is read.
- **What a reel is about** comes from a simulated file. Instagram's download doesn't include captions or music, and Muse can't read the reels you watch today. Meta can. Iris is meant to live under the same umbrella as Meta, with connectors that let it see what you watch and which reels you save.
- **Your friends' moods** in the friend's view are simulated, as if they used Iris too.
- **Delivery to friends and the Muse Charm** is simulated. Muse can't send to another person's Muse today.
- **Muse ordering a treat** is simulated. No order is placed in this demo.
- **Quiet people.** If you rarely message anyone, Iris has less to go on.

## Privacy

- **Your side only.** The reader drops every message someone else wrote before anything else runs. Your own messages are read for the gist of your day and never shared. A test enforces it ([tests/test_parser.py](tests/test_parser.py)).
- **Where your data goes.** In this prototype, data goes to the Meta Model API. In a real product it would run inside Meta's private processing, never used for ads or training.
- **Consent.** Iris would need your explicit opt-in. People outside your 5 are never named to Muse.
- **Settings stay private.** Nobody can see what you set them to.

## Run it

You need Python 3.10 or newer (standard library only) and a Meta Model API key.

```
cp .env.example .env               # put your MODEL_API_KEY in .env
python3 data/generate_demo.py      # build Arjun's fictional download and simulated calendar and Spotify
python3 data/parse_export.py       # read it, keeping only Arjun's side
python3 engine/interests.py        # Muse names what Arjun is into
python3 scripts/run_demo.py        # play the month through the engine
python3 bench/run_bench.py         # the test bench
open web/index.html                # the app, offline
```

Tests: `for t in tests/test_*.py; do python3 $t; done`

`python3 scripts/prepush_check.py` checks the repo is safe to make public.

Every Meta API call is logged with its token count in `out/usage.log`, and the engine stops itself at an estimated $100.

## The research behind it

- **Your normal, not the average.** Phone signals mean something only against a person's own baseline ([Pratap et al. 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC8491547)).
- **Five people**, after Robin Dunbar's innermost "support clique".
- **Guardrails** follow the American Psychological Association's advisory on AI and wellness apps ([APA, Nov 2025](https://www.apa.org/topics/artificial-intelligence-machine-learning/health-advisory-ai-chatbots-wellness-apps-mental-health.pdf)): no diagnosis, clear AI disclosure, crisis routing.

## How I built it

I planned, designed, built and tested Iris during the hackathon (Oct 26 to Nov 4, 2026). Tools I used: Meta's Muse Spark 1.3 and Muse Image through the Meta Model API, Python, plain HTML and JavaScript, and Claude Code as my AI coding assistant. The app itself calls only Meta models.

## License

MIT. See [LICENSE](LICENSE).
