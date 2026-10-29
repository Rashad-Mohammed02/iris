#!/usr/bin/env python3
"""
Iris demo data: a synthetic 42-day Instagram history for "Arjun", plus his
simulated calendar and Spotify feeds (Iris v2, the everyday version).

EVERYTHING THIS SCRIPT PRODUCES IS FICTIONAL. Arjun, his circle, every
handle, every creator account, every caption and every message are invented
for a hackathon demo. Any match with a real account is a coincidence.

What it writes: a folder shaped like Instagram's "Download your information"
JSON export (see README.md for which parts follow documented structure and
which are our assumption), plus a clearly labelled `_simulated/` folder with
signals the real export does not contain. It also writes the two SIMULATED
connector feeds, data/demo_connectors/calendar.json and spotify.json (format
in engine/connectors.py and data/README.md).

Deterministic: the same parameters always give byte-identical output.
Standard library only. Python 3.9+.

Usage:
    python3 generate_demo.py            # writes ./demo_export/
    python3 generate_demo.py --out DIR  # writes somewhere else
"""

import argparse
import json
import math
import os
import random
import shutil
import string
from datetime import date, datetime, timedelta, timezone

# =============================================================================
# ARC PARAMETERS (tweak these)
# =============================================================================

SEED = 20261103                      # change for a different (but still fixed) history
END_DATE = date(2026, 11, 3)         # last day of the history (day 42)
NUM_DAYS = 42
LOCAL_TZ = "America/New_York"        # Arjun lives on US Eastern time

# Day 1 = END_DATE - 41 days (Wed 23 Sep). Days 1-14 are the two weeks Iris only learns his normal.
# Days 15-42 are "his month": ordinary days with a few that stand out, in any direction.
STORY = {
    18: "study_crunch", 19: "study_crunch", 20: "study_crunch", 21: "study_crunch",   # a tired stretch
    22: "exam",                                                                     # the exam itself
    23: "low",                                                                      # a sad, low day after it (not tired)
    24: "easing", 25: "easing",
    31: "trip", 32: "trip", 33: "trip",                                             # a weekend away with Maya
    34: "back",
    35: "friends_news",                                                             # Priya tells him something private
    36: "big_news",                                                                 # he passed
    37: "celebrate",
    38: "show",                                                                     # a gig with Omar
    39: "after_show",
    41: "lab_morning",                                                              # a routine blood test (private)
}

# Strain: 0.0 = his normal, 1.0 = most drifted. Days not listed are 0.0.
STRAIN_BY_DAY = {18: 0.35, 19: 0.45, 20: 0.55, 21: 0.5, 22: 0.45, 23: 0.95, 24: 0.4, 25: 0.2, 34: 0.2, 39: 0.15}
HARD_WEEK = range(23, 24)             # the low day
RECOVERY = range(24, 26)              # easing afterwards

# Days that are late but upbeat (a race night, the trip, good news, the gig).
# Useful as a false-positive guard: late is not the same as heavy.
UPBEAT_LATE_DAYS = [13, 31, 32, 36, 37, 38]

# v1 had him go quiet with his brother; v2's month has no quiet stretch.
DEV_QUIET_DAYS = range(0, 0)

# v1 had a lift land on a fixed day; v2 has no scripted receiver side.
LIFT_DAY = 0

# Sundays are a little heavier in his baseline ("Sundays look heavier for you").
SUNDAY_HEAVY_BUMP = 0.6

# Reel watching
REEL_GAP_SECONDS_MEDIAN = 30          # median time on one reel before swiping
BASELINE_LAST_ACTIVITY_MIN = 1440 + 20     # ~00:20, he is a night scroller already
STRAINED_EXTRA_LATE_MIN = 125             # at strain 1.0 he is up ~2 hours later

# Mirror a real-export quirk: Meta writes non-ASCII text as UTF-8 bytes read as
# Latin-1 (so a heart shows up as "â\u009d¤"). Parsers must undo it with
# s.encode("latin-1").decode("utf-8"). Set False for plain UTF-8 output.
MIMIC_META_TEXT_ENCODING = True

# Which shape to write for videos_watched / posts_viewed / liked_posts:
#   "v1" = current export (bare array of {timestamp, media, label_values}, with URL + Owner)
#   "v0" = legacy export ({"impressions_history_videos_watched": [{string_map_data: Author, Time}]})
EXPORT_FORMAT = "v1"

# =============================================================================
# PEOPLE (all fictional)
# =============================================================================

OWNER = {"name": "Arjun Rao", "username": "arjun.rao.mc", "dob": "1998-03-14",
         "email": "arjun.demo@example.com", "bio": "pit wall opinions, 35mm, too much espresso"}

CIRCLE = {
    "maya":  {"name": "Maya Chen",   "username": "maya.chen.mc",   "role": "girlfriend"},
    "sam":   {"name": "Sam Okafor",  "username": "sam.okafor.mc",  "role": "best friend"},
    "dev":   {"name": "Dev Rao",     "username": "dev.rao.mc",     "role": "brother"},
    "priya": {"name": "Priya Rao",   "username": "priya.rao.mc",   "role": "sister"},
    "omar":  {"name": "Omar Haddad", "username": "omar.haddad.mc", "role": "close friend (college roommate)"},
}
OTHERS = {
    "tasha": {"name": "Tasha Bell",  "username": "tasha.bell.mc"},
    "ravi":  {"name": "Ravi Iyer",   "username": "ravi.iyer.mc"},
    "jess":  {"name": "Jess Moreno", "username": "jess.moreno.mc", "role": "coworker"},
    "chris": {"name": "Chris Park",  "username": "chris.park.mc",  "role": "run club"},
}
PEOPLE = {**CIRCLE, **OTHERS}

# =============================================================================
# REEL THEMES (creator handles are invented)
# =============================================================================

HEAVY_THEMES = {"burnout", "exhaustion", "strong_friend", "sad_music", "relationship_support", "wellness", "feeling_low"}
INTEREST_THEMES = {"f1", "film_photography", "nba", "coffee"}

THEMES = {
    "f1": {"label": "Formula 1", "creators": ["pitwall.daily", "boxbox.clips", "undercut.studio", "apex.archive", "gridwalk.notes"],
           "captions": ["that undercut was ice cold", "every team radio from lap 1, ranked", "the overtake nobody is talking about",
                        "why tire deg decided this race", "onboard: full qualifying lap", "pit stop in 2.1 seconds, slowed down",
                        "Las Vegas GP: what to know before you go", "rookie season, rated", "strategy call breakdown in 60 seconds"]},
    "film_photography": {"label": "Film photography", "creators": ["35mm.saturdays", "grain.and.light", "portra.diaries"],
           "captions": ["Portra 400 vs Gold 200 in golden hour", "how I meter without a light meter", "shooting a whole roll in one block",
                        "my favorite cheap 35mm cameras", "pushing film two stops at night"]},
    "nba": {"label": "NBA", "creators": ["fastbreak.film", "clutchtime.cuts", "dimes.daily"],
           "captions": ["best dimes of opening week", "this defensive possession is art", "clutch shots, final 10 seconds",
                        "rookie highlights so far"]},
    "coffee": {"label": "Home espresso", "creators": ["pullshot.lab", "morning.ritual.coffee"],
           "captions": ["dialing in a new bag in 3 shots", "milk texture for latte art, slowed down", "the 18 gram rule explained"]},
    "comedy": {"label": "Comedy", "creators": ["deadpan.dept", "group.chat.energy", "office.bits"],
           "captions": ["every group chat has this friend", "when the meeting could have been an email", "me explaining F1 to my family",
                        "the 'one more episode' lie", "monday energy vs friday energy"]},
    "couple_humor": {"label": "Couple humor", "creators": ["us.but.funnier", "boyfriend.olympics"],
           "captions": ["picking a restaurant: a 45 minute saga", "she said 'I'm not hungry' then ate my fries",
                        "couples who cook together"]},
    "food": {"label": "Cooking", "creators": ["weeknight.wok", "pasta.after.dark"],
           "captions": ["15 minute garlic noodles", "the pasta water trick", "one pan dinner for two"]},
    "fitness": {"label": "Fitness", "creators": ["zone2.club", "liftlog.daily"],
           "captions": ["zone 2 running, explained simply", "a 20 minute push day", "how to start running again"]},
    "tech": {"label": "Tech", "creators": ["pocket.gadgets", "devdesk.setup"],
           "captions": ["desk setup tour", "the gadget I actually use every day", "phone camera settings you should change"]},
    "music": {"label": "Indie music", "creators": ["lofi.laneways", "indie.basement"],
           "captions": ["live session in a tiny room", "songs that sound like autumn", "underrated albums this year"]},
    "travel": {"label": "Travel", "creators": ["weekend.away.co"],
           "captions": ["a weekend in Chicago for under $300", "road trip playlist and route"]},
    # heavier themes
    "burnout": {"label": "Burnout", "creators": ["running.on.empty.co", "tired.but.trying", "burnout.notes"],
           "captions": ["when you've been 'fine' for three weeks straight", "signs you're running on empty",
                        "nobody talks about how tiring it is to be the reliable one", "burnout doesn't always look like burnout"]},
    "exhaustion": {"label": "Tired / can't sleep", "creators": ["3am.thoughts.club", "cant.sleep.again"],
           "captions": ["me at 2am telling myself one more video", "too tired to sleep, a documentary",
                        "the 3am brain is not your friend", "tired in a way sleep doesn't fix"]},
    "strong_friend": {"label": "The strong friend", "creators": ["the.strong.friend", "check.on.your.people"],
           "captions": ["check on your strong friend. they're tired too.", "the friend who holds everyone up needs holding too",
                        "being everyone's rock is heavy"]},
    "sad_music": {"label": "Slow / sad songs", "creators": ["slow.songs.at.night", "heartache.radio"],
           "captions": ["songs for when you're tired of being tired", "a playlist for the drive home", "this song at 1am hits different"]},
    "relationship_support": {"label": "Supporting a partner", "creators": ["how.to.show.up", "love.in.the.hard.parts"],
           "captions": ["how to support your partner when they're going through it", "what to say when there's nothing to say",
                        "showing up is mostly just being there"]},
    "feeling_low": {"label": "Sad days", "creators": ["quiet.sad.hours", "low.days.club"],
           "captions": ["for the days you feel down for no reason", "some days are just sad and that's ok",
                        "a song for a heavy heart", "when you don't feel like yourself"]},
    "wellness": {"label": "Small resets", "creators": ["small.steps.daily", "breathe.with.me"],
           "captions": ["a 60 second reset for a long day", "one small thing to do tonight", "permission to rest"]},
}

# Share of reels by theme at strain 0 (baseline) and strain 1 (most drifted). Linearly blended.
THEME_WEIGHTS_BASELINE = {"f1": 22, "film_photography": 7, "nba": 8, "coffee": 5, "comedy": 18, "couple_humor": 6,
                          "food": 6, "fitness": 5, "tech": 6, "music": 5, "travel": 4, "burnout": 2, "exhaustion": 1,
                          "strong_friend": 1, "sad_music": 2, "relationship_support": 1, "wellness": 1,
                          "feeling_low": 0}
THEME_WEIGHTS_STRAINED = {"f1": 9, "film_photography": 2, "nba": 3, "coffee": 1, "comedy": 12, "couple_humor": 3,
                          "food": 3, "fitness": 1, "tech": 2, "music": 3, "travel": 1, "burnout": 16, "exhaustion": 12,
                          "strong_friend": 9, "sad_music": 10, "relationship_support": 9, "wellness": 4,
                          "feeling_low": 0}

# =============================================================================
# DM RHYTHM PER THREAD (baseline -> strained, blended by strain)
#   exch:   conversation bursts per day
#   reply:  Arjun's median reply delay, minutes
#   p_init: chance Arjun starts a burst
#   p_read: chance Arjun leaves the other person on read
#   short:  chance Arjun's message comes from the short bank ("ya", "ok")
#   reels:  reels Arjun shares into this thread per day
# =============================================================================

RHYTHM = {
    "maya":  {"base": dict(exch=6.0, reply=3,  p_init=0.5, p_read=0.00, short=0.08, reels=1.2),
              "strain": dict(exch=9.0, reply=2,  p_init=0.7, p_read=0.00, short=0.15, reels=3.2)},
    "sam":   {"base": dict(exch=3.0, reply=12, p_init=0.5, p_read=0.02, short=0.12, reels=3.6),
              "strain": dict(exch=1.0, reply=210, p_init=0.1, p_read=0.35, short=0.80, reels=0.4)},
    "dev":   {"base": dict(exch=1.3, reply=25, p_init=0.5, p_read=0.03, short=0.10, reels=1.2),
              "strain": dict(exch=0.8, reply=300, p_init=0.1, p_read=0.50, short=0.85, reels=0.2)},
    "priya": {"base": dict(exch=0.8, reply=40, p_init=0.45, p_read=0.03, short=0.10, reels=0.5),
              "strain": dict(exch=0.8, reply=360, p_init=0.05, p_read=0.25, short=0.85, reels=0.1)},
    "omar":  {"base": dict(exch=0.7, reply=30, p_init=0.5, p_read=0.03, short=0.10, reels=0.8),
              "strain": dict(exch=0.6, reply=540, p_init=0.0, p_read=0.45, short=0.90, reels=0.0)},
    "jess":  {"base": dict(exch=0.3, reply=20, p_init=0.3, p_read=0.05, short=0.30, reels=0.05),
              "strain": dict(exch=0.3, reply=240, p_init=0.0, p_read=0.40, short=0.90, reels=0.0)},
    "chris": {"base": dict(exch=0.2, reply=45, p_init=0.3, p_read=0.05, short=0.30, reels=0.0),
              "strain": dict(exch=0.2, reply=480, p_init=0.0, p_read=0.60, short=0.90, reels=0.0)},
    # group threads: p_init doubles as "does Arjun say anything in this burst"
    "group_pitcrew":  {"base": dict(exch=2.0, reply=15, p_init=0.7, p_read=0.0, short=0.30, reels=0.6),
                       "strain": dict(exch=2.0, reply=240, p_init=0.12, p_read=0.0, short=0.90, reels=0.0)},
    "group_siblings": {"base": dict(exch=0.4, reply=30, p_init=0.6, p_read=0.0, short=0.30, reels=0.1),
                       "strain": dict(exch=0.4, reply=400, p_init=0.10, p_read=0.0, short=0.90, reels=0.0)},
}

# Which reel themes Arjun shares to whom (normal / when strained)
SHARE_THEMES = {
    "maya":  (["couple_humor", "food", "comedy", "travel", "music"],
              ["exhaustion", "burnout", "relationship_support", "wellness", "couple_humor", "sad_music"]),
    "sam":   (["f1", "comedy", "nba"], ["comedy", "f1"]),
    "dev":   (["f1", "nba", "comedy"], ["f1"]),
    "priya": (["comedy", "food"], ["comedy"]),
    "omar":  (["film_photography", "music"], ["music"]),
    "jess":  (["comedy", "tech"], ["comedy"]),
    "chris": (["fitness"], ["fitness"]),
    "group_pitcrew": (["f1", "comedy"], ["comedy"]),
    "group_siblings": (["comedy"], ["comedy"]),
}

# =============================================================================
# ARJUN'S SIDE OF THE CONVERSATIONS (fictional). Other people's messages are
# written only as placeholders and must never be analyzed.
# =============================================================================

SHORT_BANK = ["ya", "ok", "lol", "sounds good", "sure", "yeah", "k", "maybe", "idk", "later?", "nice", "yep",
              "sorry been busy", "can't this week", "hm"]

ARJUN_LINES = {
    "maya": {
        "morning": ["morning! how'd you sleep?", "morning, good luck today, you've got this", "up yet?", "coffee's on me today"],
        "normal": ["on my way, 10 min", "thai or the pasta place tonight?", "lol stop",
                   "that's so you", "long day here, miss you", "did you end up calling your mom?", "ok home, call in 5?",
                   "you're the best", "what time do you get off?",
                   "grabbing groceries, need anything?", "haha yes", "i'll pick you up at 7", "new episode is out btw",
                   "love you", "can't wait for saturday", "send me the link", "omg yes let's do it",
                   "how was the presentation?", "i made the garlic noodles from that reel, not bad actually"],
        "strained": ["long day, i'm wiped", "sorry, brain is mush tonight", "can we just stay in tonight?",
                     "studying again, call you after?", "i'm so tired of flashcards", "ugh another chapter",
                     "not my best day tbh", "kind of a flat day", "yeah i'm up", "can't sleep, still thinking about it",
                     "tired but ok", "sorry, long day. i'm here now", "thanks for the snacks, lifesaver",
                     "just need this week to be over"],
        "low": ["kind of a sad day honestly", "feeling really low today", "not feeling like myself",
                "can we just stay in tonight?", "i don't know, just down today", "sorry, i'm quiet today",
                "nothing's wrong exactly, just low", "kind of want to hide under a blanket", "can you come over later?",
                "no idea how it went, that's the worst part", "not my best day tbh", "just feeling a bit down",
                "thanks for being sweet to me today", "i'll be ok, just a sad one"],
        "recovery": ["feeling more like myself today", "dinner out this weekend? my treat", "today was easier",
                     "love you", "ok that made me laugh", "pasta night thursday?"],
        "share_note_normal": ["us", "this is so you", "we need to make this", "lmao", "ok this is us on sundays"],
        "share_note_strained": ["this is me today", "felt this", "too real", "same", "tired tired"],
        "share_note_low": ["this is me today", "felt this", "too real", "same", "sad day"],
    },
    "sam": {
        "normal": ["BOX BOX", "did you see that undercut", "bro this is you", "lmaooo", "pickup friday?",
                   "you watching quali tonight?", "that strategy call was criminal", "send me your fantasy lineup",
                   "dude no way", "running late, save me a seat", "the ferrari pit wall needs help", "i'm dying at this",
                   "ok that's actually insane", "brunch sunday?", "yo you free tonight?", "haha ok fair",
                   "nah you're wrong but go off", "this race is gonna be chaos",
                   "if they don't pit him in the next two laps the whole race is over",
                   "ok but hear me out, best overtake of the season was the one in the rain",
                   "pickup at the usual court, 7, bring the good ball this time"],
        "strained": ["sorry man been slammed", "yeah maybe next week", "can't this weekend", "studying, all good tho"],
        "low": ["sorry man, not really up for much today", "kind of a down day", "maybe next week",
                "not feeling it today, sorry"],
        "recovery": ["pickup this week?", "race this weekend at mine?"],
        "lift": ["WAIT. are you serious", "dude. vegas?? you're insane", "i owe you big time", "ok i'm actually so hyped"],
        "share_note_normal": ["this is literally you", "LMAO", "watch till the end", "box box"],
        "share_note_strained": [],
    },
    "dev": {
        "normal": ["did you see the race", "that car is a cheat code", "mom says call her lol", "lakers looking rough",
                   "ok you were right about the tires", "send me that clip again", "you coming home for thanksgiving?",
                   "bro what", "haha classic", "fantasy trade? i'll give you my rb", "dad sent the family photo lol",
                   "that's wild", "call this weekend?"],
        "strained": ["yeah", "later"],
        "low": ["eh, kind of a down day", "later"],
        "recovery": ["call this weekend?", "yeah saw the race, wild", "how's mom doing?"],
        "share_note_normal": ["lmao", "bro", "this is you on race day"],
        "share_note_strained": [],
    },
    "priya": {
        "normal": ["happy monday!!", "did you see mom's text", "lol she's so dramatic", "can you send me the labor day photos",
                   "omg congrats", "what are we getting dad for his bday?", "i'm in for splitting it", "call later?",
                   "miss you!", "maya says hi", "that's so cute", "send me the recipe pls",
                   "ok i talked to dev, we're splitting the gift three ways if you're in",
                   "mom called me twice today asking if you're eating, please text her back lol",
                   "are you coming home for thanksgiving or doing it with maya's family this year?"],
        "strained": ["sorry busy week", "can't talk rn"],
        "low": ["not a great day, call tomorrow?", "can't talk rn"],
        "recovery": ["call sunday?"],
        "share_note_normal": ["this is mom", "lol"],
        "share_note_strained": [],
    },
    "omar": {
        "normal": ["dude this roll came out so good", "portra or gold for this weekend?", "send me the scans",
                   "this song is everything", "we need to shoot downtown soon", "haha yes", "saturday works",
                   "that light though", "you going to the show?"],
        "strained": ["sorry man, later"],
        "low": ["sorry man, not up for much today"],
        "recovery": ["shoot next weekend?"],
        "share_note_normal": ["need this lens", "look at that grain"],
        "share_note_strained": [],
    },
    "jess": {"normal": ["thanks!", "sounds good, see you monday", "haha yes", "can you send the deck?", "lol same"],
             "strained": [], "recovery": ["thanks!"], "share_note_normal": [], "share_note_strained": []},
    "chris": {"normal": ["in for saturday", "what pace?", "nice run!"], "strained": [], "recovery": ["back next week"],
              "share_note_normal": [], "share_note_strained": []},
    "group_pitcrew": {"normal": ["lmaooo", "i'm in", "who's driving?", "funniest thing i've seen all week", "nah",
                                 "8 works", "BOX BOX", "ok who's watching the race", "ordering wings", "same",
                                 "shotgun", "vote: tacos or wings"],
                      "strained": [], "recovery": ["what'd i miss", "race at mine sunday?"],
                      "share_note_normal": ["LMAO", "this is the group chat"], "share_note_strained": []},
    "group_siblings": {"normal": ["lol", "i'll call mom tonight", "dad's texting in all caps again",
                                  "sending money for the gift now", "yes", "haha"],
                       "strained": [], "recovery": ["sorry, catching up now"],
                       "share_note_normal": ["lol"], "share_note_strained": []},
}

# What Arjun says first on the days that stand out (his side only, all fictional).
SCRIPTED = {
    ("maya", 18): ["study block tonight, call you after?"],
    ("maya", 20): ["deck is finally done. i'm wiped", "exam in two days, why did i sign up for this"],
    ("sam", 20): ["can't do pickup friday, exam sunday. after that i'm all yours"],
    ("maya", 22): ["exam in an hour, wish me luck", "ok it's done. brain is mush"],
    ("maya", 23): ["honestly just a sad day", "can we just stay in tonight", "no idea how it went, that's the worst part"],
    ("omar", 23): ["sorry man, raincheck on dinner? not up for it today"],
    ("maya", 31): ["packed! train at 6?", "this view though"],
    ("sam", 32): ["sending you the skyline, you'd love it"],
    ("maya", 34): ["home. that was the best weekend"],
    ("priya", 35): ["promise i won't tell anyone about the job thing until you're ready"],
    ("maya", 36): ["I PASSED", "i actually passed. dinner tomorrow, my treat"],
    ("sam", 36): ["BRO I PASSED", "drinks on me this weekend"],
    ("dev", 36): ["passed the exam!! tell mom before she hears it from priya lol"],
    ("omar", 36): ["passed!! we're celebrating at the gig next week"],
    ("omar", 38): ["doors at 7, meet out front?", "that set was unreal"],
    ("maya", 41): ["lab at 8 then straight to work, just the yearly one", "starving lol"],
}

THREADS = {
    # key: (title, member keys other than Arjun, is_group)
    "maya": ("Maya Chen", ["maya"], False),
    "sam": ("Sam Okafor", ["sam"], False),
    "dev": ("Dev Rao", ["dev"], False),
    "priya": ("Priya Rao", ["priya"], False),
    "omar": ("Omar Haddad", ["omar"], False),
    "jess": ("Jess Moreno", ["jess"], False),
    "chris": ("Chris Park", ["chris"], False),
    "group_pitcrew": ("pit crew \U0001F3CE", ["sam", "omar", "tasha", "ravi"], True),
    "group_siblings": ("rao kids", ["dev", "priya"], True),
}

# =============================================================================
# helpers
# =============================================================================

rng = random.Random(SEED)

try:
    from zoneinfo import ZoneInfo
    _TZ = ZoneInfo(LOCAL_TZ)
except Exception:  # pragma: no cover - fallback if tz database is missing
    _TZ = None


def to_epoch(day_date, minute_of_day):
    """Local wall-clock (day + minutes, minutes may exceed 1440) -> UTC epoch seconds."""
    naive = datetime(day_date.year, day_date.month, day_date.day) + timedelta(minutes=minute_of_day)
    if _TZ is not None:
        return int(naive.replace(tzinfo=_TZ).timestamp())
    # Fallback: US Eastern, DST ends first Sunday of November 2026 (Nov 1) at 2:00.
    offset = -4 if naive < datetime(2026, 11, 1, 2, 0) else -5
    return int((naive - timedelta(hours=offset)).replace(tzinfo=timezone.utc).timestamp())


def local_dt(epoch):
    if _TZ is not None:
        return datetime.fromtimestamp(epoch, _TZ)
    utc = datetime.fromtimestamp(epoch, timezone.utc).replace(tzinfo=None)
    off = -4 if utc < datetime(2026, 11, 1, 6, 0) else -5
    return utc + timedelta(hours=off)


def lerp(a, b, t):
    return a + (b - a) * t


def blend(params, s):
    base, strained = params["base"], params["strain"]
    return {k: lerp(base[k], strained[k], s) for k in base}


def poisson(lam):
    if lam <= 0:
        return 0
    L, k, p = math.exp(-lam), 0, 1.0
    while True:
        k += 1
        p *= rng.random()
        if p <= L:
            return k - 1


def steady_count(lam):
    """Like a Poisson draw but with less spread, so the arc is not drowned by luck."""
    if lam < 2:
        return poisson(lam)
    return max(0, int(round(rng.gauss(lam, 0.55 * math.sqrt(lam)))))


def lognormal(median, sigma=0.7):
    return median * math.exp(rng.gauss(0, sigma))


def weighted_choice(weights):
    keys = list(weights)
    return rng.choices(keys, weights=[weights[k] for k in keys], k=1)[0]


def shortcode(n=11, r=None):
    alphabet = string.ascii_letters + string.digits + "_-"
    return "".join((r or rng).choice(alphabet) for _ in range(n))


def fbid():
    return str(rng.randrange(10 ** 16, 10 ** 17))


def display_name_for(handle):
    return " ".join(w.capitalize() for w in handle.replace("_", ".").split(".") if w)


def meta_text(obj):
    """Apply Meta's Latin-1 mojibake to every string, recursively."""
    if not MIMIC_META_TEXT_ENCODING:
        return obj
    if isinstance(obj, str):
        return obj.encode("utf-8").decode("latin-1")
    if isinstance(obj, list):
        return [meta_text(x) for x in obj]
    if isinstance(obj, dict):
        return {meta_text(k): meta_text(v) for k, v in obj.items()}
    return obj


def write_json(root, rel_path, data, export_quirks=True):
    path = os.path.join(root, rel_path)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if export_quirks:
        data = meta_text(data)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=export_quirks)
        f.write("\n")


def owner_block(username, name):
    """v1 'Owner' nested dict, as seen in current exports."""
    return {"dict": [{"dict": [{"label": "URL", "value": ""},
                               {"label": "Name", "value": name},
                               {"label": "Username", "value": username}], "title": ""}],
            "title": "Owner"}


def url_block(url):
    return {"label": "URL", "value": url, "href": url}


# =============================================================================
# calendar
# =============================================================================

START_DATE = END_DATE - timedelta(days=NUM_DAYS - 1)
# Export cut-off: 05:00 local the morning after END_DATE, so day 30's night is complete.
END_EPOCH = to_epoch(END_DATE, 1440 + 5 * 60)


def day_date(d):
    return START_DATE + timedelta(days=d - 1)


def strain(d):
    return STRAIN_BY_DAY.get(d, 0.0)


def phase(d):
    if d <= 14:
        return "learning"
    return STORY.get(d, "ordinary")


# =============================================================================
# reels
# =============================================================================

REELS = {}              # url -> reel record (for the SIMULATED theme hints)


def new_reel(theme, r=None):
    r = r or rng
    t = THEMES[theme]
    author = r.choice(t["creators"])
    url = "https://www.instagram.com/reel/%s/" % shortcode(r=r)
    reel = {"url": url, "author": author, "theme": theme, "caption": r.choice(t["captions"])}
    REELS[url] = reel
    return reel


_seen_by_theme = {}


def pick_reel(theme):
    seen = _seen_by_theme.setdefault(theme, [])
    if seen and rng.random() < 0.04:          # occasional rewatch
        return rng.choice(seen)
    reel = new_reel(theme)
    seen.append(reel)
    return reel


def theme_weights(d, minute, upbeat):
    s = strain(d)
    w = {k: lerp(THEME_WEIGHTS_BASELINE[k], THEME_WEIGHTS_STRAINED[k], s) for k in THEME_WEIGHTS_BASELINE}
    if day_date(d).weekday() == 6:
        for k in HEAVY_THEMES:
            w[k] *= 1 + SUNDAY_HEAVY_BUMP
    if upbeat and minute >= 22 * 60:
        w["f1"] *= 3.5
        w["comedy"] *= 1.5
        for k in HEAVY_THEMES:
            w[k] *= 0.5
    elif minute >= 1440:                      # after midnight, heavy content grows with strain
        for k in HEAVY_THEMES:
            w[k] *= 1 + 1.6 * s
    if d in RECOVERY:
        w["f1"] *= 1.4
    return w


def sessions_for_day(d):
    """List of (start_minute, end_minute) Instagram sessions, local time, minutes may exceed 1440."""
    s = strain(d)
    weekend = day_date(d).weekday() >= 5
    upbeat = d in UPBEAT_LATE_DAYS
    out = []
    m = rng.uniform(7 * 60 + 15, 8 * 60 + 15) + (60 if weekend else 0)
    out.append((m, m + rng.uniform(4, 10)))
    if weekend:
        m = rng.uniform(11 * 60, 14 * 60)
        out.append((m, m + rng.uniform(15, 35)))
    else:
        m = rng.uniform(12 * 60 + 5, 12 * 60 + 50)
        out.append((m, m + rng.uniform(6, 14)))
    m = rng.uniform(18 * 60 + 30, 20 * 60)
    out.append((m, m + rng.uniform(10, 25)))
    m = rng.uniform(21 * 60, 22 * 60 + 15)
    out.append((m, m + rng.uniform(8, 20)))
    # the last session of the night
    end = BASELINE_LAST_ACTIVITY_MIN + rng.gauss(0, 18) + s * STRAINED_EXTRA_LATE_MIN
    if upbeat:
        end = 1440 + 100 + rng.gauss(0, 10)
    if weekend and not upbeat:
        end += 20
    dur = 35 + s * 55 + rng.uniform(0, 10)
    out.append((end - dur, end))
    if s >= 0.95:                              # woke up and scrolled again
        m = rng.uniform(1440 + 200, 1440 + 235)
        out.append((m, m + rng.uniform(8, 15)))
    return sorted(out)


# The low day (day 23) should read sad, not tired. Its reels are first drawn exactly as on any
# strained day (so every other day stays byte-identical), then re-themed with their own generator:
# most tired-themed reels become sad songs or sad-day reels, and some light ones do too.
# The watch keeps the reel it replaced as `orig_reel`, used only to keep later random draws the same.
LOW_RNG = random.Random(SEED + 23)
TIRED_THEMES = {"burnout", "exhaustion", "strong_friend", "relationship_support"}


def low_day_swap(reel):
    if reel["theme"] in TIRED_THEMES:
        p = 0.85
    elif reel["theme"] in HEAVY_THEMES:
        p = 0.0
    else:
        p = 0.3
    if LOW_RNG.random() >= p:
        return None
    return new_reel(LOW_RNG.choice(["sad_music", "feeling_low"]), r=LOW_RNG)


def orig(w):
    """The reel a watch first drew (see low_day_swap). Filters that feed random draws use this one."""
    return w.get("orig_reel", w["reel"])


def generate_watches():
    """Returns list of watch events: dict(epoch, day, minute, reel)."""
    watches = []
    for d in range(1, NUM_DAYS + 1):
        upbeat = d in UPBEAT_LATE_DAYS
        for start, end in sessions_for_day(d):
            t = start
            while t < end:
                theme = weighted_choice(theme_weights(d, t, upbeat))
                reel = pick_reel(theme)
                ep = to_epoch(day_date(d), t)
                if ep <= END_EPOCH:
                    w = {"epoch": ep, "day": d, "minute": t, "reel": reel}
                    swap = low_day_swap(reel) if d in HARD_WEEK else None
                    if swap:
                        w.update(reel=swap, orig_reel=reel)
                    watches.append(w)
                t += max(4, lognormal(REEL_GAP_SECONDS_MEDIAN, 0.6)) / 60.0
    # after the lift lands, he watches (and saves) a Las Vegas GP guide
    if 1 <= LIFT_DAY <= NUM_DAYS:
        reel = new_reel("f1")
        reel["caption"] = "Las Vegas GP: what to know before you go"
        minute = 21 * 60 + 40
        watches.append({"epoch": to_epoch(day_date(LIFT_DAY), minute), "day": LIFT_DAY, "minute": minute,
                        "reel": reel, "vegas": True})
    watches.sort(key=lambda w: w["epoch"])
    return watches


# =============================================================================
# messages
# =============================================================================

def active_start_minute(weekend, s, thread):
    """When a conversation burst starts."""
    if weekend:
        windows, weights = [(10 * 60, 14 * 60), (14 * 60, 19 * 60), (19 * 60, 23 * 60 + 30)], [2, 3, 4]
    else:
        windows, weights = [(7 * 60 + 30, 9 * 60), (12 * 60, 13 * 60 + 15), (17 * 60 + 30, 23 * 60 + 30)], [1, 1.5, 5]
    if thread == "maya" and s > 0:
        windows.append((23 * 60 + 30, 1440 + 60 + int(s * 90)))
        weights.append(4 * s)
    if thread == "jess":                       # coworker, daytime only
        windows, weights = [(9 * 60, 17 * 60)], [1]
    a, b = windows[rng.choices(range(len(windows)), weights=weights, k=1)[0]]
    return rng.uniform(a, b)


def arjun_line(thread, d, s, short_p, minute):
    bank = ARJUN_LINES[thread]
    if bank.get("morning") and 5 * 60 <= minute < 11 * 60 and rng.random() < 0.6:
        return rng.choice(bank["morning"])
    if d in RECOVERY and bank["recovery"] and rng.random() < 0.5 * (1 - s):
        return rng.choice(bank["recovery"])
    if rng.random() < short_p:
        return rng.choice(SHORT_BANK)
    if s > 0.3 and bank["strained"] and rng.random() < s:
        return rng.choice(bank["low"] if d in HARD_WEEK and bank.get("low") else bank["strained"])
    return rng.choice(bank["normal"])


def placeholder(name):
    return "[PLACEHOLDER: message from %s. Fictional filler, not analyzed]" % name


def make_msg(sender_key, epoch_s, content=None, share=None, placeholder_flag=False):
    name = OWNER["name"] if sender_key == "arjun" else PEOPLE[sender_key]["name"]
    m = {"sender_name": name, "timestamp_ms": epoch_s * 1000 + rng.randrange(0, 1000)}
    if content is not None:
        m["content"] = content
    if share is not None:
        m["share"] = share
    m["is_geoblocked_for_viewer"] = False
    m["is_unsent_image_by_messenger_kid_parent"] = False
    if placeholder_flag:
        m["x_placeholder"] = True     # NOT in the real export: marks other people's filler
    return m


def generate_thread(thread, watches_by_day):
    title, members, is_group = THREADS[thread]
    msgs = []
    for d in range(1, NUM_DAYS + 1):
        s = strain(d)
        dd = day_date(d)
        weekend = dd.weekday() >= 5
        p = blend(RHYTHM[thread], s)
        quiet = thread in ("dev", "group_siblings") and d in DEV_QUIET_DAYS
        n_exch = steady_count(p["exch"])
        # scripted beats Arjun says first on these days, in order
        scripted = list(SCRIPTED.get((thread, d), []))
        if scripted:
            n_exch = max(n_exch, 1)
        for i in range(n_exch):
            t = active_start_minute(weekend, s, thread)
            if thread == "sam" and d == LIFT_DAY and i == 0:
                t = 17 * 60 + rng.uniform(0, 60)              # Sam's surprise lands after work
            arjun_starts = (not quiet) and rng.random() < p["p_init"] and not is_group
            if thread == "sam" and d == LIFT_DAY and i == 0:
                arjun_starts = False
            if scripted and i == 0:
                arjun_starts = True
            turns = rng.randint(2, 7)
            turn_is_arjun = arjun_starts
            for _ in range(turns):
                if t > 1440 + 200:
                    break
                if turn_is_arjun:
                    burst = len(scripted) if scripted else rng.choice([1, 1, 1, 2, 2, 3])
                    for _k in range(burst):
                        ep = to_epoch(dd, t)
                        if ep > END_EPOCH:
                            break
                        line = scripted.pop(0) if scripted else arjun_line(thread, d, s, p["short"], t)
                        msgs.append(make_msg("arjun", ep, line))
                        t += rng.uniform(0.1, 1.5)
                else:
                    sender = rng.choice(members)
                    if thread == "sam" and d == LIFT_DAY and i == 0:
                        # Sam's surprise: a link share (placeholder) then a message (placeholder)
                        ep = to_epoch(dd, t)
                        msgs.append(make_msg("sam", ep, "%s sent an attachment." % PEOPLE["sam"]["name"],
                                             share={"link": "https://www.instagram.com/p/%s/" % shortcode()},
                                             placeholder_flag=True))
                    for _k in range(rng.choice([1, 1, 2, 2, 3])):
                        ep = to_epoch(dd, t)
                        if ep > END_EPOCH:
                            break
                        msgs.append(make_msg(sender, ep, placeholder(PEOPLE[sender]["name"]), placeholder_flag=True))
                        t += rng.uniform(0.1, 2.0)
                # next turn
                lift_moment = thread == "sam" and d == LIFT_DAY and i == 0
                if not turn_is_arjun:
                    # Arjun's turn next: does he reply, and how fast?
                    if quiet:
                        break
                    if is_group and rng.random() > p["p_init"]:
                        t += max(0.5, lognormal(6, 0.8))  # he lurks; the group keeps going
                        continue
                    if not lift_moment and rng.random() < p["p_read"]:
                        break
                    t += rng.uniform(0.5, 3) if lift_moment else max(0.3, lognormal(p["reply"], 0.75))
                else:
                    t += max(0.5, lognormal(4, 0.8))     # the other person's speed (not analyzed)
                turn_is_arjun = not turn_is_arjun
        # Arjun's reel shares into this thread
        if not quiet:
            normal_themes, strained_themes = SHARE_THEMES[thread]
            n_share = steady_count(p["reels"])
            used = set()
            for _ in range(n_share):
                pool_themes = strained_themes if (s > 0.4 and rng.random() < s) else normal_themes
                candidates = [w for w in watches_by_day.get(d, [])
                              if orig(w)["theme"] in pool_themes and orig(w)["url"] not in used]
                if thread == "maya" and s > 0.4:
                    late = [w for w in candidates if w["minute"] >= 23 * 60]
                    candidates = late or candidates
                if not candidates:
                    continue
                w = rng.choice(candidates)
                used.add(orig(w)["url"])
                ep = min(w["epoch"] + rng.randint(5, 50), END_EPOCH)
                reel = w["reel"]
                msgs.append(make_msg("arjun", ep, "%s sent an attachment." % OWNER["name"],
                                     share={"link": reel["url"], "share_text": reel["caption"],
                                            "original_content_owner": reel["author"]}))
                notes = ARJUN_LINES[thread]["share_note_strained" if s > 0.4 else "share_note_normal"]
                if d in HARD_WEEK and ARJUN_LINES[thread].get("share_note_low"):
                    notes = ARJUN_LINES[thread]["share_note_low"]
                if notes and rng.random() < 0.35:
                    msgs.append(make_msg("arjun", min(ep + rng.randint(3, 40), END_EPOCH), rng.choice(notes)))
        # others share reels to Arjun (placeholders, no theme given)
        for member in members:
            for _ in range(poisson(0.6 if not is_group else 0.25)):
                t = active_start_minute(weekend, 0, thread)
                ep = to_epoch(dd, t)
                if ep > END_EPOCH:
                    continue
                handle = rng.choice(["clip.vault.mc", "daily.laughs.mc", "random.finds.mc", "feed.gems.mc"])
                msgs.append(make_msg(member, ep, "%s sent an attachment." % PEOPLE[member]["name"],
                                     share={"link": "https://www.instagram.com/reel/%s/" % shortcode(),
                                            "original_content_owner": handle}, placeholder_flag=True))
    # reactions: Arjun hearts some of Maya's messages
    if thread == "maya":
        for m in msgs:
            if m["sender_name"] != OWNER["name"]:
                d = (local_dt(m["timestamp_ms"] // 1000).date() - START_DATE).days + 1
                if rng.random() < lerp(0.15, 0.3, strain(d)):
                    m["reactions"] = [{"reaction": "❤", "actor": OWNER["name"],
                                       "timestamp": m["timestamp_ms"] // 1000 + rng.randint(5, 90)}]
    msgs.sort(key=lambda m: m["timestamp_ms"], reverse=True)    # real exports list newest first
    participants = [{"name": PEOPLE[k]["name"]} for k in members] + [{"name": OWNER["name"]}]
    handle = PEOPLE[members[0]]["username"].replace(".", "") if not is_group else thread.replace("group_", "")
    folder = "%s_%d" % (handle, rng.randrange(10 ** 15, 10 ** 16))
    return folder, {
        "participants": participants,
        "messages": msgs,
        "title": title,
        "is_still_participant": True,
        "thread_path": "inbox/%s" % folder,
        "magic_words": [],
    }


# =============================================================================
# feed: posts viewed, likes, saves, story likes
# =============================================================================

FRIEND_POST_WEIGHT = {"maya": 3, "sam": 2, "dev": 2, "priya": 2, "omar": 2, "tasha": 1, "ravi": 1, "jess": 1, "chris": 1}


def generate_feed(watches):
    posts_viewed, likes, saved, story_likes = [], [], [], []
    by_day = {}
    for w in watches:
        by_day.setdefault(w["day"], []).append(w)
    for d in range(1, NUM_DAYS + 1):
        s = strain(d)
        dd = day_date(d)
        day_w = by_day.get(d, [])
        quiet_dev = d in DEV_QUIET_DAYS
        # posts viewed: friends' posts and interest accounts, sprinkled through the day's sessions
        for _ in range(int(rng.uniform(18, 32))):
            if not day_w:
                break
            anchor = rng.choice(day_w)
            ep = anchor["epoch"] + rng.randint(-120, 120)
            if rng.random() < 0.35:
                who = weighted_choice(FRIEND_POST_WEIGHT)
                owner, name = PEOPLE[who]["username"], PEOPLE[who]["name"]
                friend = who
            else:
                theme = weighted_choice({k: v for k, v in THEME_WEIGHTS_BASELINE.items() if k not in HEAVY_THEMES})
                owner = rng.choice(THEMES[theme]["creators"])
                name, friend = display_name_for(owner), None
            url = "https://www.instagram.com/p/%s/" % shortcode()
            posts_viewed.append({"timestamp": ep, "owner": owner, "name": name, "url": url})
            like_p = 0.5 if friend else 0.05
            if friend:
                like_p *= lerp(1.0, 0.35, s)
                if friend == "maya":
                    like_p = 0.7
                if friend == "dev" and quiet_dev:
                    like_p = 0.0
            if rng.random() < like_p:
                likes.append({"timestamp": ep + rng.randint(2, 20), "owner": owner, "name": name, "url": url})
        # likes on reels watched
        for w in day_w:
            if rng.random() < lerp(0.06, 0.03, s):
                r = w["reel"]
                likes.append({"timestamp": w["epoch"] + rng.randint(2, 15), "owner": r["author"],
                              "name": display_name_for(r["author"]), "url": r["url"]})
        # saves
        for w in day_w:
            if w.get("vegas"):
                saved.append({"timestamp": w["epoch"] + 25, "owner": w["reel"]["author"], "url": w["reel"]["url"]})
        if d == LIFT_DAY or d in RECOVERY:
            f1 = [w for w in day_w if orig(w)["theme"] == "f1" and not w.get("vegas")]
            for w in rng.sample(f1, min(2, len(f1))):
                saved.append({"timestamp": w["epoch"] + rng.randint(3, 20), "owner": w["reel"]["author"], "url": w["reel"]["url"]})
        save_themes = (["burnout", "wellness", "strong_friend", "relationship_support"] if (s > 0.4 and rng.random() < 0.6)
                       else ["f1", "coffee", "film_photography", "food"])
        cands = [w for w in day_w if orig(w)["theme"] in save_themes]
        for w in rng.sample(cands, min(poisson(lerp(0.8, 1.2, s)), len(cands))):
            saved.append({"timestamp": w["epoch"] + rng.randint(3, 20), "owner": w["reel"]["author"], "url": w["reel"]["url"]})
        # story likes on circle members' stories
        for who in CIRCLE:
            p = lerp(0.35, 0.10, s)
            if who == "maya":
                p = 0.5
            if who == "dev" and quiet_dev:
                p = 0.0
            if rng.random() < p and day_w:
                ep = rng.choice(day_w)["epoch"] + rng.randint(-60, 60)
                story_likes.append({"timestamp": ep, "owner": PEOPLE[who]["username"], "name": PEOPLE[who]["name"],
                                    "url": "https://www.instagram.com/stories/%s/%d" % (PEOPLE[who]["username"],
                                                                                        rng.randrange(10 ** 18, 10 ** 19))})
    for lst in (posts_viewed, likes, saved, story_likes):
        lst[:] = [x for x in lst if x["timestamp"] <= END_EPOCH]
        lst.sort(key=lambda x: x["timestamp"], reverse=True)
    return posts_viewed, likes, saved, story_likes


def v1_items(rows, ad_library_label=False):
    out = []
    for r in rows:
        lv = []
        if ad_library_label:
            lv.append({"label": "Ad library public URL"})
        lv.append(url_block(r["url"]))
        lv.append(owner_block(r["owner"], r.get("name") or display_name_for(r["owner"])))
        out.append({"timestamp": r["timestamp"], "media": [], "label_values": lv, "fbid": fbid()})
    return out


# =============================================================================
# main
# =============================================================================

def build(out_dir):
    if os.path.isdir(out_dir):
        shutil.rmtree(out_dir)
    os.makedirs(out_dir)

    watches = generate_watches()
    watches_by_day = {}
    for w in watches:
        watches_by_day.setdefault(w["day"], []).append(w)

    # --- messages
    threads = {}
    for key in THREADS:
        folder, data = generate_thread(key, watches_by_day)
        threads[key] = (folder, data)
        write_json(out_dir, "your_instagram_activity/messages/inbox/%s/message_1.json" % folder, data)

    # --- videos watched (reels)
    watch_rows = [{"timestamp": w["epoch"], "owner": w["reel"]["author"], "url": w["reel"]["url"]}
                  for w in sorted(watches, key=lambda w: w["epoch"], reverse=True)]
    posts_viewed, likes, saved, story_likes = generate_feed(watches)
    if EXPORT_FORMAT == "v0":
        write_json(out_dir, "ads_information/ads_and_topics/videos_watched.json", {
            "impressions_history_videos_watched": [
                {"string_map_data": {"Author": {"value": r["owner"]}, "Time": {"timestamp": r["timestamp"]}}}
                for r in watch_rows]})
        write_json(out_dir, "ads_information/ads_and_topics/posts_viewed.json", {
            "impressions_history_posts_seen": [
                {"string_map_data": {"Author": {"value": r["owner"]}, "Time": {"timestamp": r["timestamp"]}}}
                for r in posts_viewed]})
        write_json(out_dir, "your_instagram_activity/likes/liked_posts.json", {
            "likes_media_likes": [{"title": r["owner"], "string_list_data": [
                {"href": r["url"], "value": "\U0001F44D", "timestamp": r["timestamp"]}]} for r in likes]})
    else:
        write_json(out_dir, "ads_information/ads_and_topics/videos_watched.json", v1_items(watch_rows, True))
        write_json(out_dir, "ads_information/ads_and_topics/posts_viewed.json", v1_items(posts_viewed, True))
        write_json(out_dir, "your_instagram_activity/likes/liked_posts.json", v1_items(likes))
    write_json(out_dir, "your_instagram_activity/story_interactions/story_likes.json", v1_items(story_likes))
    write_json(out_dir, "your_instagram_activity/saved/saved_posts.json", {
        "saved_saved_media": [{"title": r["owner"], "string_map_data": {
            "Saved on": {"href": r["url"], "timestamp": r["timestamp"]}}} for r in saved]})

    # --- ads interests and topics (Meta's own inferences about him)
    interests = ["Formula One", "Motorsports", "Auto racing", "Film photography", "Cameras", "Basketball",
                 "National Basketball Association", "Espresso", "Coffee", "Stand-up comedy", "Running",
                 "Consumer electronics", "Indie music", "Cooking", "Travel", "Sneakers", "Personal finance",
                 "Home improvement"]
    write_json(out_dir, "ads_information/instagram_ads_and_businesses/ads_interests.json", {
        "inferred_data_ig_interest": [{"title": "", "media_map_data": {},
                                       "string_map_data": {"Interest": {"href": "", "value": i, "timestamp": 0}}}
                                      for i in interests]})
    topics = ["Motorsports", "Photography", "Basketball", "Coffee", "Comedy", "Food & Drink", "Music", "Travel"]
    write_json(out_dir, "preferences/your_topics/your_topics.json", {
        "topics_your_topics": [{"title": "", "media_map_data": {},
                                "string_map_data": {"Name": {"href": "", "value": t, "timestamp": 0}}} for t in topics]})

    # --- connections
    base_ts = to_epoch(START_DATE, 0)
    close = [CIRCLE[k]["username"] for k in CIRCLE] + [OTHERS["tasha"]["username"]]
    write_json(out_dir, "connections/followers_and_following/close_friends.json", {
        "relationships_close_friends": [{"title": "", "media_list_data": [], "string_list_data": [
            {"href": "https://www.instagram.com/%s" % h, "value": h,
             "timestamp": base_ts - rng.randint(60, 900) * 86400}]} for h in close]})
    creators = sorted({c for t in THEMES.values() for c in t["creators"]} - set())
    following = [p["username"] for p in PEOPLE.values()] + creators
    write_json(out_dir, "connections/followers_and_following/following.json", {
        "relationships_following": [{"title": h, "string_list_data": [
            {"href": "https://www.instagram.com/_u/%s" % h,
             "timestamp": base_ts - rng.randint(1, 1400) * 86400}]} for h in following]})
    followers = [p["username"] for p in PEOPLE.values()] + ["follower%02d.mc" % i for i in range(1, 41)]
    write_json(out_dir, "connections/followers_and_following/followers_1.json", [
        {"title": "", "media_list_data": [], "string_list_data": [
            {"href": "https://www.instagram.com/%s" % h, "value": h,
             "timestamp": base_ts - rng.randint(1, 1400) * 86400}]} for h in followers])

    # --- personal information
    write_json(out_dir, "personal_information/personal_information/personal_information.json", {
        "profile_user": [{"title": "User information", "media_map_data": {}, "string_map_data": {
            "Email address": {"href": "", "value": OWNER["email"], "timestamp": 0},
            "Username": {"href": "", "value": OWNER["username"], "timestamp": 0},
            "Name": {"href": "", "value": OWNER["name"], "timestamp": 0},
            "Bio": {"href": "", "value": OWNER["bio"], "timestamp": 0},
            "Gender": {"href": "", "value": "Male", "timestamp": 0},
            "Date of birth": {"href": "", "value": OWNER["dob"], "timestamp": 0},
            "Private account": {"href": "", "value": "True", "timestamp": 0},
        }}]})

    # --- SIMULATED: theme hints (stands in for Meta's own understanding of reels)
    authors = {}
    for key, t in THEMES.items():
        for c in t["creators"]:
            authors[c] = {"theme": key, "theme_label": t["label"], "heavy": key in HEAVY_THEMES,
                          "interest": key in INTEREST_THEMES}
    write_json(out_dir, "_simulated/reel_theme_hints.json", {
        "_label": "SIMULATED. Not part of any real Instagram export. Stands in for Meta's own understanding "
                  "of what a reel is about. All reels, creators and captions are fictional.",
        "themes": {k: {"label": v["label"], "heavy": k in HEAVY_THEMES, "interest": k in INTEREST_THEMES}
                   for k, v in THEMES.items()},
        "authors": authors,
        "reels": {url: {"author": r["author"], "theme": r["theme"]} for url, r in sorted(REELS.items())},
    }, export_quirks=False)

    # --- SIMULATED: ground truth + per-day stats (for tests and the README; the engine must not read this)
    truth = summarize(watches, threads, saved)
    write_json(out_dir, "_simulated/story_arc_truth.json", truth, export_quirks=False)
    return truth


def summarize(watches, threads, saved):
    days = []
    arjun = OWNER["name"]
    for d in range(1, NUM_DAYS + 1):
        dd = day_date(d)
        w = [x for x in watches if x["day"] == d]
        heavy = sum(1 for x in w if x["reel"]["theme"] in HEAVY_THEMES)
        f1 = sum(1 for x in w if x["reel"]["theme"] == "f1")
        last = max(w, key=lambda x: x["epoch"]) if w else None
        row = {"day": d, "date": dd.isoformat(), "weekday": dd.strftime("%a"), "phase": phase(d),
               "strain": strain(d), "reels_watched": len(w),
               "heavy_reel_share": round(heavy / len(w), 2) if w else 0,
               "f1_reel_share": round(f1 / len(w), 2) if w else 0,
               "last_reel_local": local_dt(last["epoch"]).strftime("%H:%M") if last else None,
               "arjun_msgs": {}, "arjun_median_reply_min": {}, "arjun_avg_words": {}, "reels_sent": {}}
        # an "activity day" runs 05:00 to 05:00 local, so a late night counts toward the evening before
        lo, hi = to_epoch(dd, 300) * 1000, to_epoch(dd + timedelta(days=1), 300) * 1000
        for key, (_folder, data) in threads.items():
            ms = sorted(data["messages"], key=lambda m: m["timestamp_ms"])
            mine = [m for m in ms if m["sender_name"] == arjun and lo <= m["timestamp_ms"] < hi]
            texts = [m for m in mine if "share" not in m]
            row["arjun_msgs"][key] = len(texts)
            row["reels_sent"][key] = sum(1 for m in mine if "share" in m)
            row["arjun_avg_words"][key] = (round(sum(len(m["content"].split()) for m in texts) / len(texts), 1)
                                           if texts else None)
            delays = []
            for prev, cur in zip(ms, ms[1:]):
                if (cur["sender_name"] == arjun and prev["sender_name"] != arjun and lo <= cur["timestamp_ms"] < hi
                        and "share" not in cur):
                    delays.append((cur["timestamp_ms"] - prev["timestamp_ms"]) / 60000)
            row["arjun_median_reply_min"][key] = round(sorted(delays)[len(delays) // 2], 1) if delays else None
        days.append(row)
    return {
        "_label": "SIMULATED ground truth for tests only. Not part of any real export. The engine must not read it.",
        "owner": OWNER["name"], "circle": {k: {"name": v["name"], "role": v["role"]} for k, v in CIRCLE.items()},
        "start_date": START_DATE.isoformat(), "end_date": END_DATE.isoformat(), "timezone": LOCAL_TZ,
        "day_boundary": "per-day stats use activity days running 05:00 to 05:00 local",
        "arc": {"learning_days": "1-14", "month_days": "15-%d" % NUM_DAYS,
                "story": {str(k): v for k, v in sorted(STORY.items())},
                "upbeat_late_days": UPBEAT_LATE_DAYS},
        "expected_signals": [
            "Days 18-21: a tired stretch before the exam: later nights, more heavy reels, shorter replies.",
            "Day 22: exam day. Day 23: a low, sad day (strain 0.95): sad songs and sad-day reels, his own words say down"
            " and low (not tired), the latest night, a wake-up scroll, slow replies.",
            "Days 31-33: a weekend away with Maya, late but upbeat. Day 36: big news, he passed. Day 38: a gig with Omar.",
            "Day 35: his side mentions Priya's private job news (a friend's secret no note may carry).",
            "Day 41: a routine blood test on his calendar (health, never shared).",
            "Arjun sends Sam far more reels than anyone else in the baseline.",
            "Day 13 is late but upbeat (F1 night): late alone is not a heavy signal.",
            "Interests: F1 (strong), film photography, NBA, home espresso, stand-up comedy.",
        ],
        "saved_count": len(saved),
        "days": days,
    }


# =============================================================================
# SIMULATED connector feeds: calendar (what happens to him) and Spotify (what he hears)
# Format: engine/connectors.py. Fictional events, songs and artists only.
# =============================================================================

CONNECTORS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "demo_connectors")

# A small fictional catalog: (track, artist, valence, energy). Valence: 0 = slow and sad, 1 = bright.
CATALOG = {
    "favorites": [("Pit Lane Summer", "Neon Paddock", 0.82, 0.78), ("Golden Hour Lap", "Neon Paddock", 0.76, 0.66),
                  ("Lights Out", "The Undercuts", 0.71, 0.85), ("Halfway Home", "The Low Lanterns", 0.58, 0.48),
                  ("Paper Planes Again", "June Harbor", 0.64, 0.52), ("Kitchen Radio", "Mabel Ortiz", 0.69, 0.44),
                  ("Fast Break", "Court Vision", 0.79, 0.88), ("Second Roll", "Grain Theory", 0.55, 0.42)],
    "focus": [("Study Loop 4", "Quiet Desk", 0.45, 0.22), ("Rain on the Window", "Quiet Desk", 0.40, 0.18),
              ("Margins", "Paper Lamp", 0.42, 0.25)],
    "slow": [("Gray Tuesday", "Hollow Pines", 0.16, 0.20), ("Nothing to Say", "Hollow Pines", 0.12, 0.18),
             ("Underwater Lights", "Mira Vale", 0.22, 0.26)],
    "bright": [("Champagne Problems Solved", "The Undercuts", 0.93, 0.90), ("Victory Lap", "Neon Paddock", 0.95, 0.92),
               ("Big Yes", "Sunny Okoro", 0.91, 0.84)],
    "road": [("Highway Skyline", "June Harbor", 0.80, 0.70), ("Window Seat", "Mabel Ortiz", 0.74, 0.55)],
    "lanterns": [("Halfway Home", "The Low Lanterns", 0.58, 0.48), ("Static Hearts", "The Low Lanterns", 0.66, 0.74),
                 ("North Platform", "The Low Lanterns", 0.61, 0.69)],
}
# How each kind of day sounds: (plays, {catalog: weight}).
LISTENING = {
    "ordinary": (32, {"favorites": 8, "focus": 1, "bright": 1, "road": 1, "lanterns": 1}),
    "study_crunch": (40, {"focus": 7, "favorites": 2, "slow": 1}),
    "exam": (18, {"focus": 4, "favorites": 2}),
    "low": (36, {"slow": 9, "focus": 1}),
    "easing": (30, {"favorites": 6, "slow": 2}),
    "trip": (26, {"road": 6, "favorites": 4, "bright": 1}),
    "back": (28, {"favorites": 7, "road": 2}),
    "big_news": (44, {"bright": 8, "favorites": 4}),
    "celebrate": (36, {"bright": 4, "favorites": 6}),
    "show": (46, {"lanterns": 10, "favorites": 2}),
    "after_show": (34, {"lanterns": 6, "favorites": 4}),
    "lab_morning": (30, {"favorites": 8, "focus": 1}),
    "friends_news": (30, {"favorites": 8, "focus": 1}),
}


def _iso(d, minute):
    return (datetime(day_date(d).year, day_date(d).month, day_date(d).day) + timedelta(minutes=minute)).strftime("%Y-%m-%dT%H:%M")


def build_spotify(crng):
    plays = []
    for d in range(1, NUM_DAYS + 1):
        kind = phase(d) if phase(d) in LISTENING else "ordinary"
        n, mix = LISTENING[kind]
        n = max(4, int(n + crng.gauss(0, 4)))
        repeat = None
        if kind in ("low", "show", "big_news"):
            repeat = crng.choice(CATALOG[max(mix, key=mix.get)])
        minutes = sorted(crng.uniform(7 * 60, 23 * 60 + 30) for _ in range(n))
        for k, m in enumerate(minutes):
            if repeat and k % 3 == 0:
                track = repeat
            else:
                pool = crng.choices(list(mix), weights=list(mix.values()), k=1)[0]
                track = crng.choice(CATALOG[pool])
            plays.append({"ts": _iso(d, m), "master_metadata_track_name": track[0],
                          "master_metadata_album_artist_name": track[1],
                          "ms_played": int(crng.uniform(0.6, 1.0) * 210000),
                          "x_valence": track[2], "x_energy": track[3]})
    return {"_label": "SIMULATED. Not a real Spotify account. Field names follow Spotify's extended streaming "
                      "history; x_valence and x_energy stand in for audio features. Every song and artist is fictional.",
            "owner": OWNER["name"], "timezone": LOCAL_TZ, "plays": plays}


def build_calendar(crng):
    events, n = [], [0]

    def ev(d, start, end, title, kind, **kw):
        n[0] += 1
        e = {"id": "e%03d" % n[0], "title": title, "start": _iso(d, start), "end": _iso(d, end), "all_day": False,
             "kind": kind, "with": [], "status": "confirmed"}
        e.update(kw)
        events.append(e)

    meetings = [("Team standup", 9 * 60 + 30, 15), ("Design sync", 11 * 60, 45), ("1:1 with Jess", 15 * 60, 30),
                ("Sprint review", 14 * 60, 60), ("Planning", 12 * 60 + 30, 60)]
    for d in range(1, NUM_DAYS + 1):
        wd = day_date(d).weekday()
        if wd < 5 and phase(d) not in ("trip",):
            for title, start, dur in crng.sample(meetings, crng.randint(1, 3)):
                ev(d, start, start + dur, title, "work", **({"with": ["Jess Moreno"]} if "Jess" in title else {}))
        if wd == 5 and phase(d) not in ("trip",):
            ev(d, 8 * 60, 9 * 60, "Run club", "routine", **{"with": ["Chris Park"]})
        if wd == 4 and phase(d) == "ordinary":
            ev(d, 19 * 60, 21 * 60, "Pickup basketball", "social", **{"with": ["Sam Okafor"]})
    for d in (18, 19, 20, 21):
        ev(d, 19 * 60, 22 * 60, "Study block: PMP", "study")
    ev(20, 0, 24 * 60 - 1, "Q4 launch deck due", "deadline", all_day=True)
    ev(22, 8 * 60, 12 * 60, "PMP exam", "exam", location="Test center, 5th Ave")
    ev(23, 19 * 60 + 30, 21 * 60 + 30, "Dinner with Omar", "social", status="cancelled", **{"with": ["Omar Haddad"]})
    events.append({"id": "e%03d" % (n[0] + 1), "title": "Weekend in Chicago", "start": _iso(31, 17 * 60),
                   "end": _iso(33, 21 * 60), "all_day": True, "kind": "trip", "with": ["Maya Chen"],
                   "location": "Chicago", "status": "confirmed"})
    n[0] += 1
    ev(36, 10 * 60, 10 * 60 + 15, "PMP results", "results")
    ev(37, 19 * 60 + 30, 22 * 60, "Celebration dinner", "social", **{"with": ["Maya Chen", "Sam Okafor"]})
    ev(38, 20 * 60, 23 * 60, "The Low Lanterns live", "show", status="tentative", public=True,
       interest="live music", tickets={"seller": "Ticketmaster"}, location="Brooklyn Steel")
    ev(41, 8 * 60, 8 * 60 + 30, "Blood test", "health", location="City Lab, Court St")
    # Public events after his month, so tickets can be offered near its end.
    for title, d, interest in (("F1 Las Vegas GP watch party", 52, "F1"), ("NBA: Brooklyn home game", 47, "the NBA"),
                               ("Stand-up night at The Cellar", 45, "stand-up comedy")):
        ev(d, 19 * 60, 23 * 60, title, "show", status="tentative", public=True, interest=interest,
           tickets={"seller": "Ticketmaster"})
    # Friends share free/busy only (never titles). Priya lives out of town (nearby is off in demo_settings.json).
    free_busy = {}
    for key in ("maya", "sam", "omar", "dev", "priya"):
        blocks = []
        for d in range(1, NUM_DAYS + 8):
            if day_date(d).weekday() < 5 and crng.random() < 0.45:
                start = crng.choice([12 * 60, 12 * 60 + 30, 13 * 60])
                blocks.append({"start": _iso(d, start), "end": _iso(d, start + 60)})
            if key == "maya" and 31 <= d <= 33:
                blocks.append({"start": _iso(d, 0), "end": _iso(d, 24 * 60 - 1)})
        free_busy[CIRCLE[key]["name"]] = blocks
    events.sort(key=lambda e: e["start"])
    return {"_label": "SIMULATED. Not a real calendar. Every event, place and person is fictional.",
            "owner": OWNER["name"], "timezone": LOCAL_TZ, "events": events, "free_busy": free_busy}


def build_connectors(out_dir=CONNECTORS_DIR):
    crng = random.Random(SEED + 1)   # its own generator, so the Instagram export stays byte-identical
    os.makedirs(out_dir, exist_ok=True)
    for name, data in (("calendar.json", build_calendar(crng)), ("spotify.json", build_spotify(crng))):
        with open(os.path.join(out_dir, name), "w", encoding="utf-8") as f:
            if "plays" in data:   # one play per line keeps the file small and readable
                head = {k: v for k, v in data.items() if k != "plays"}
                f.write(json.dumps(head, ensure_ascii=False, indent=1)[:-2] + ',\n "plays": [\n')
                f.write(",\n".join("  " + json.dumps(p, ensure_ascii=False) for p in data["plays"]) + "\n ]\n}\n")
            else:
                json.dump(data, f, ensure_ascii=False, indent=1)
                f.write("\n")


def print_table(truth):
    print("%-4s %-10s %-3s %-9s %-6s %-6s %-6s %-6s %-8s %-8s %-8s %-6s" % (
        "day", "date", "dow", "phase", "strain", "reels", "heavy", "late", "maya_rpl", "sam_rpl", "sam_wds", "dev#"))
    for r in truth["days"]:
        print("%-4d %-10s %-3s %-9s %-6.2f %-6d %-6.2f %-6s %-8s %-8s %-8s %-6s" % (
            r["day"], r["date"], r["weekday"], r["phase"], r["strain"], r["reels_watched"], r["heavy_reel_share"],
            r["last_reel_local"], r["arjun_median_reply_min"]["maya"], r["arjun_median_reply_min"]["sam"],
            r["arjun_avg_words"]["sam"], r["arjun_msgs"]["dev"]))


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Generate the fictional Iris demo Instagram export.")
    ap.add_argument("--out", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "demo_export"))
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args()
    truth = build(args.out)
    build_connectors()
    if not args.quiet:
        print("Wrote %s (days %s to %s)" % (args.out, truth["start_date"], truth["end_date"]))
        print_table(truth)
