#!/usr/bin/env python3
"""Builds data/passages/passages.json, the "Luyện dịch đoạn văn" deck, from FLORES-200.

    python3 scripts/build-passages.py <unpacked flores200_dataset directory>

FLORES-200 (Meta, CC BY-SA 4.0) is public, no sign-in:
https://dl.fbaipublicfiles.com/nllb/flores200_dataset.tar.gz

Its English sentences come from Wikinews, Wikivoyage and Wikibooks articles and
were translated into Vietnamese by professional translators, sentence by
sentence. Consecutive sentences from one article make a passage. Passages are
sorted into topics by their FLORES topic label, and within a topic the shorter
passages come first. Run once offline; the app never downloads anything.
"""

import json
import re
import sys
from collections import OrderedDict, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "passages" / "passages.json"
MIN_SENTENCES, MAX_SENTENCES = 2, 6

# unit: (name, words found in the FLORES topic label). First match wins.
TOPICS = OrderedDict([
    (1, ("Du lịch", "travel accomodation accommodation tourism antartica antarctica sailing hiking camping")),
    (2, ("Sức khỏe", "health first aid disease medicine medical")),
    (3, ("Khoa học và công nghệ", "science sciece technology communication physics biology astronomy computer internet "
                                   "solar system elements matter space research discovery paleoanthropology cognitive "
                                   "psycology psychology neuroscience mri interactive media")),
    (4, ("Thể thao", "sport sports golf fencing")),
    (5, ("Thiên nhiên và môi trường", "disaster disasters accident accidents tragety weather environment climate nature "
                                      "natural animals cats dinosaurs desert rainforest birdwatching glaciers serengeti")),
    (6, ("Chính trị và xã hội", "politics crime law conflicts election government policy international internatoinal "
                                "society sociology")),
    (7, ("Kinh tế và công việc", "economy business work finance")),
    (8, ("Lịch sử và địa lý", "history war civilizations kings queens revolution geography heritage castles castle wonders "
                              "templars charters constitution independence monarchs")),
    (9, ("Văn hóa và giải trí", "entertainment entertrainment culture food art music film religion television photography "
                                "video dvd accordion violin origami sikhism mysticism languages language gestures "
                                "alchohol alcohol glasses lucid")),
    (10, ("Học tập", "learning education school study")),
])
OTHER = (11, "Chủ đề khác")

WORD = re.compile(r"[a-z]+")


def topic_of(label):
    words = set(WORD.findall(label.lower()))
    for unit, (_, keys) in TOPICS.items():
        if words & set(keys.split()):
            return unit
    return OTHER[0]


def main(src):
    src = Path(src)
    rows = []
    for split in ("dev", "devtest"):
        meta = [line.rstrip("\n").split("\t") for line in open(src / f"metadata_{split}.tsv", encoding="utf-8")][1:]
        en = (src / split / f"eng_Latn.{split}").read_text(encoding="utf-8").splitlines()
        vi = (src / split / f"vie_Latn.{split}").read_text(encoding="utf-8").splitlines()
        assert len(meta) == len(en) == len(vi), split
        rows += [(m[0], m[1], m[2], e.strip(), v.strip()) for m, e, v in zip(meta, en, vi)]

    articles = OrderedDict()
    for url, domain, topic, en, vi in rows:
        articles.setdefault(url, {"url": url, "domain": domain, "topic": topic, "en": [], "vi": []})
        articles[url]["en"].append(en)
        articles[url]["vi"].append(vi)

    by_unit = defaultdict(list)
    for article in articles.values():
        if not MIN_SENTENCES <= len(article["en"]) <= MAX_SENTENCES:
            continue
        if any(not s for s in article["en"] + article["vi"]):
            continue
        by_unit[topic_of(article["topic"])].append(article)

    passages = []
    names = {unit: name for unit, (name, _) in TOPICS.items()} | {OTHER[0]: OTHER[1]}
    for unit in names:
        for a in sorted(by_unit[unit], key=lambda a: (sum(len(s.split()) for s in a["en"]), a["url"])):
            passages.append({"unit": unit, "en": a["en"], "vi": a["vi"], "url": a["url"], "domain": a["domain"]})

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "source": "FLORES-200 (https://github.com/facebookresearch/flores)",
        "license": "CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)",
        "topics": {str(unit): name for unit, name in names.items()},
        "passages": passages,
    }, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    counts = defaultdict(int)
    for p in passages:
        counts[p["unit"]] += 1
    print(f"{OUT.relative_to(ROOT)}: {len(passages)} passages", dict(counts))


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
