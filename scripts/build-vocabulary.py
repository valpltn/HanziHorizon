#!/usr/bin/env python3
"""Merge the local HSK 3.0 list with the French CFDICT dictionary.

Usage:
  python scripts/build-vocabulary.py <path-to-cfdict.u8>

The generated JSON is committed so production builds do not depend on a
network download. HSK data: ivankra/hsk30 (MIT). French definitions: CFDICT
(CC BY-SA; attribution is displayed in the application).
"""

from __future__ import annotations

import csv
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HSK_SOURCE = ROOT / "data" / "hsk30-source.csv"
OUTPUT = ROOT / "app" / "data" / "hsk-vocabulary.json"
ENTRY = re.compile(r"^(\S+)\s+(\S+)\s+\[([^]]+)\]\s+/(.*)/$")

POS_THEMES = {
    "N": "Noms",
    "V": "Verbes",
    "Adj": "Adjectifs",
    "Adv": "Adverbes",
    "Pron": "Pronoms",
    "Num": "Nombres",
    "M": "Classificateurs",
    "Prep": "Prépositions",
    "Conj": "Conjonctions",
    "Aux": "Particules",
    "Int": "Interjections",
    "Prefix": "Préfixes",
    "Suffix": "Suffixes",
    "Phonetic": "Onomatopées",
}


def clean_headwords(value: str) -> list[str]:
    words = []
    for part in re.split(r"[|｜]", value):
        cleaned = re.sub(r"[（）()]", "", part).strip()
        if cleaned and cleaned not in words:
            words.append(cleaned)
    return words


def clean_definition(value: str) -> str:
    value = re.sub(r"\s+", " ", value).strip()
    value = re.sub(r"^\[[^]]+\]\s*", "", value)
    return value


def load_definitions(path: Path) -> dict[str, list[str]]:
    definitions: dict[str, list[str]] = defaultdict(list)
    with path.open(encoding="utf-8") as source:
        for raw_line in source:
            match = ENTRY.match(raw_line.strip())
            if not match:
                continue
            traditional, simplified, _pinyin, raw_definitions = match.groups()
            values = [clean_definition(item) for item in raw_definitions.split("/")]
            values = [item for item in values if item]
            for headword in {simplified, traditional}:
                for value in values:
                    if value not in definitions[headword]:
                        definitions[headword].append(value)
    return definitions


def compact_definitions(values: list[str]) -> str:
    selected = []
    for value in values:
        if value not in selected:
            selected.append(value)
        if len(selected) == 3:
            break
    text = " ; ".join(selected)
    return text if len(text) <= 220 else f"{text[:217].rstrip()}…"


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python scripts/build-vocabulary.py <path-to-cfdict.u8>")
    dictionary_path = Path(sys.argv[1]).resolve()
    if not dictionary_path.is_file():
        raise SystemExit(f"CFDICT file not found: {dictionary_path}")

    definitions = load_definitions(dictionary_path)
    entries = []
    with HSK_SOURCE.open(encoding="utf-8-sig", newline="") as source:
        for row in csv.DictReader(source):
            headwords = clean_headwords(row["Simplified"])
            french_values = []
            for headword in headwords:
                french_values.extend(definitions.get(headword, []))
            french = compact_definitions(french_values)
            level = 7 if row["Level"] == "7-9" else int(row["Level"])
            pos = row["POS"].split("/", 1)[0]
            entries.append(
                {
                    "id": row["ID"].lower(),
                    "hanzi": row["Simplified"],
                    "pinyin": row["Pinyin"],
                    "french": french or "Traduction française indisponible",
                    "level": level,
                    "theme": POS_THEMES.get(pos, "Vocabulaire"),
                    "example": "",
                    "exampleFr": "",
                    "translationAvailable": bool(french),
                }
            )

    OUTPUT.write_text(
        json.dumps(entries, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )
    translated = sum(entry["translationAvailable"] for entry in entries)
    print(f"Generated {len(entries)} entries ({translated} with French definitions) in {OUTPUT}")


if __name__ == "__main__":
    main()
