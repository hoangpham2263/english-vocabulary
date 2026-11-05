#!/usr/bin/env python3
"""Builds data/sentences/sentences.json, the "Luyện dịch" deck, from Tatoeba.

    python3 scripts/build-sentences.py <dir with the Tatoeba exports>

The directory holds these files, unpacked, from
https://downloads.tatoeba.org/exports/per_language/ :

    vie/vie_sentences_detailed.tsv   vie/vie-eng_links.tsv
    eng/eng_sentences_detailed.tsv   eng/eng_tags.tsv

Tatoeba sentences are CC BY 2.0 FR: every sentence keeps its Tatoeba id and
author, and the app credits Tatoeba with the licence. Run once offline; the app
never calls Tatoeba.

Sentences are sorted into topics by English keywords, kept when 3 to 16 words
long, and ranked so that sentences made of words from the 4000 Essential Words
books come first. Each topic keeps its best PER_TOPIC, easiest first.
"""

import csv
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "sentences" / "sentences.json"
PER_TOPIC = 80
MIN_WORDS, MAX_WORDS = 3, 16
SKIP_TAGS = {"vulgar", "meme", "ambiguous", "@change", "@needs native check", "@check translation"}

# unit: (name, keywords). A sentence goes to the topic with the most keyword hits.
TOPICS = {
    1: ("Chào hỏi và giao tiếp", "hello hi goodbye bye thank thanks sorry please excuse welcome pardon congratulations"),
    2: ("Gia đình và bạn bè", "mother father mom dad brother sister family son daughter wife husband parents parent friend friends uncle aunt grandmother grandfather grandma grandpa cousin child children baby married marry wedding"),
    3: ("Nhà cửa và sinh hoạt", "house home room kitchen bed bedroom door window clean wash sleep slept wake woke shower bath floor table chair sofa garden apartment roof key lamp"),
    4: ("Ăn uống", "eat ate eaten food drink drank coffee tea water breakfast lunch dinner restaurant rice meat fish fruit apple apples orange hungry thirsty cook cooking delicious beer wine milk bread egg eggs soup cake sugar salt vegetables meal"),
    5: ("Mua sắm và tiền bạc", "buy bought sell sold shop shopping store price cost costs money pay paid cheap expensive dollar dollars market bank wallet rich poor"),
    6: ("Trường học", "school student students teacher teachers class classroom study studied learn learning exam test homework university college lesson library pencil pen grade"),
    7: ("Ngôn ngữ và đọc sách", "english french japanese chinese language languages word words speak spoke translate translation sentence book books read reading write wrote letter dictionary novel story"),
    8: ("Công việc", "work worked working job office boss company meeting business employee career salary project manager customer client colleague hire fired"),
    9: ("Đi lại và du lịch", "travel trip train bus car plane airport station ticket hotel visit visited road drive drove street map taxi bicycle bike abroad journey vacation holiday passport"),
    10: ("Sức khỏe", "sick ill doctor hospital medicine health healthy pain hurt hurts headache fever tired cold cough nurse dentist exercise diet sleep"),
    11: ("Thời tiết và thiên nhiên", "weather rain raining rained snow snowing sun sunny hot warm wind windy sky cloud clouds tree trees flower flowers river mountain sea beach forest lake moon star stars storm"),
    12: ("Động vật", "dog dogs cat cats bird birds horse horses animal animals cow pig fish insect mouse rabbit lion tiger elephant monkey snake bear"),
    13: ("Thời gian và lịch", "time today tomorrow yesterday week weeks month months year years monday tuesday wednesday thursday friday saturday sunday morning evening night birthday clock hour hours minute minutes late early"),
    14: ("Cảm xúc", "happy sad angry afraid scared love loves loved hate worried worry feel feels felt smile cry cried lonely glad upset nervous surprised proud ashamed bored excited"),
    15: ("Sở thích và thể thao", "play played playing game games music song songs sing sang movie movies film sport sports football soccer tennis swim swimming run running piano guitar dance dancing hobby paint painting photo camera"),
}

WORD = re.compile(r"[a-z']+")


def read_tsv(path):
    with open(path, encoding="utf-8") as f:
        for line in f:
            yield line.rstrip("\n").split("\t")


def known_words():
    words = set()
    for book in sorted((ROOT / "data" / "4000-words").glob("book*.json")):
        for entry in json.loads(book.read_text(encoding="utf-8")):
            words.update(WORD.findall(entry["en"].lower()))
    return words


def stem_forms(word):
    yield word
    for suffix, repl in (("ies", "y"), ("es", ""), ("s", ""), ("ed", ""), ("ed", "e"), ("ing", ""), ("ing", "e"), ("'s", "")):
        if word.endswith(suffix) and len(word) > len(suffix) + 2:
            yield word[: -len(suffix)] + repl


def main(src):
    src = Path(src)
    vie = {r[0]: (r[2], r[3]) for r in read_tsv(src / "vie_sentences_detailed.tsv")}
    links = [r for r in read_tsv(src / "vie-eng_links.tsv")]
    wanted = {e for _, e in links}
    eng = {}
    for r in read_tsv(src / "eng_sentences_detailed.tsv"):
        if r[0] in wanted:
            eng[r[0]] = (r[2], r[3])
    tags = defaultdict(set)
    for r in read_tsv(src / "eng_tags.tsv"):
        if r[0] in wanted:
            tags[r[0]].add(r[1])

    keywords = {unit: set(words.split()) for unit, (_, words) in TOPICS.items()}
    common = known_words() | {
        "i", "you", "he", "she", "it", "we", "they", "a", "an", "the", "is", "are", "was", "were", "be", "to", "of",
        "and", "in", "on", "at", "my", "your", "his", "her", "our", "their", "this", "that", "do", "does", "did",
        "not", "don't", "i'm", "it's", "have", "has", "had", "will", "can", "with", "for", "me", "him", "us", "them",
    }

    seen = set()
    by_topic = defaultdict(list)
    for vid, eid in links:
        if vid not in vie or eid not in eng or eid in seen:
            continue
        en, en_author = eng[eid]
        vi, vi_author = vie[vid]
        if tags[eid] & SKIP_TAGS or any(t.startswith("@") for t in tags[eid]):
            continue
        words = WORD.findall(en.lower())
        # "a/b" alternatives and quoted dialogue make poor single answers.
        if not MIN_WORDS <= len(words) <= MAX_WORDS or not vi.strip() or "/" in vi or '"' in en:
            continue
        hits = {unit: sum(1 for w in words if any(f in kw for f in stem_forms(w))) for unit, kw in keywords.items()}
        unit, score = max(hits.items(), key=lambda kv: kv[1])
        if score == 0:
            continue
        seen.add(eid)
        coverage = sum(1 for w in words if any(f in common for f in stem_forms(w))) / len(words)
        by_topic[unit].append({
            "en": en.strip(),
            "vi": vi.strip(),
            "enId": int(eid),
            "enAuthor": en_author if en_author != "\\N" else "",
            "viId": int(vid),
            "viAuthor": vi_author if vi_author != "\\N" else "",
            "_rank": (-coverage, -score, en.count("Tom") + en.count("Mary")),
            "_len": len(words),
        })

    sentences = []
    for unit in TOPICS:
        best = sorted(by_topic[unit], key=lambda s: s["_rank"])[:PER_TOPIC]
        for s in sorted(best, key=lambda s: (s["_len"], s["en"])):
            sentences.append({"unit": unit, **{k: v for k, v in s.items() if not k.startswith("_")}})

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "source": "Tatoeba (https://tatoeba.org)",
        "license": "CC BY 2.0 FR (https://creativecommons.org/licenses/by/2.0/fr/)",
        "topics": {str(unit): name for unit, (name, _) in TOPICS.items()},
        "sentences": sentences,
    }, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    counts = defaultdict(int)
    for s in sentences:
        counts[s["unit"]] += 1
    print(f"{OUT.relative_to(ROOT)}: {len(sentences)} sentences", dict(counts))


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
