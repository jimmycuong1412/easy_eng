"""Per-type LLM prompts and JSON-response parsing.

The prompt forces a single JSON object whose shape depends on the material type.
parse_response is tolerant of code fences / surrounding prose, then maps the JSON
onto a Material that carries the spec's identity fields (slug/type/level/goal).
"""

from __future__ import annotations

import json
import re

from .catalog import MaterialSpec
from .models import Material, Section, VocabItem

_COMMON_RULES = """\
Rules:
- Write ORIGINAL content. Do not copy any existing article or copyrighted text.
- Vietnamese-first: *_vi fields are the source of truth; *_en fields are accurate English mirrors.
- All of title_vi, title_en, summary_vi, summary_en, body_vi, body_en are REQUIRED and non-empty.
- title_vi <= 200 chars, summary_vi <= 500 chars.
- duration_min between 1 and 90 (realistic minutes to study this material).
- Use Vietnam context and examples where natural. Match the CEFR level given.
- Return ONE JSON object and NOTHING else. No markdown, no commentary.
"""

_VOCAB_SHAPE = """\
JSON shape for a vocabulary_pack:
{
  "title_vi": str, "title_en": str,
  "summary_vi": str, "summary_en": str,
  "body_vi": str, "body_en": str,            // short markdown intro to the pack
  "duration_min": int, "gems_reward": int, "xp_reward": int, "min_completion_pct": int,
  "vocab_items": [                            // 8 to 12 items
    {
      "term": str, "pos": str, "ipa": str,   // IPA like /ˈpæspɔːrt/
      "vi_phonetic_hint": str,               // Vietnamese-friendly read-aloud hint, e.g. "pát-pọt"
      "gloss_vi": str, "gloss_en": str,
      "example_en": str, "example_vi": str
    }
  ]
}
Suggested: gems_reward 2-3, xp_reward 40-80, min_completion_pct 80.
"""

_SECTION_SHAPE_GRAMMAR = """\
JSON shape for a grammar_lesson:
{
  "title_vi": str, "title_en": str,
  "summary_vi": str, "summary_en": str,
  "body_vi": str, "body_en": str,            // markdown overview of the grammar point
  "duration_min": int, "gems_reward": int, "xp_reward": int, "min_completion_pct": int,
  "sections": [                              // 3 to 5 sections
    { "kind": "intro"|"pattern"|"drill", "body_vi": str, "body_en": str, "meta": {} }
  ]
}
Use 'intro' for the concept, 'pattern' for forms/structures, 'drill' for practice items.
Suggested: gems_reward 3, xp_reward 40-80, min_completion_pct 80.
"""

_SECTION_SHAPE_DIALOGUE = """\
JSON shape for a dialogue:
{
  "title_vi": str, "title_en": str,
  "summary_vi": str, "summary_en": str,
  "body_vi": str, "body_en": str,            // markdown scenario setup
  "duration_min": int, "gems_reward": int, "xp_reward": int, "min_completion_pct": int,
  "sections": [                              // 8 to 14 dialogue lines, in order
    {
      "kind": "dialogue_line",
      "body_vi": str,                        // the line in Vietnamese (translation)
      "body_en": str,                        // the line in English (the line learners study)
      "meta": { "speaker": str }             // e.g. "Customer" / "Waiter"
    }
  ]
}
Suggested: gems_reward 3, xp_reward 40-80, min_completion_pct 80.
"""

_SECTION_SHAPE_READING = """\
JSON shape for a reading_passage:
{
  "title_vi": str, "title_en": str,
  "summary_vi": str, "summary_en": str,
  "body_vi": str, "body_en": str,            // the FULL passage (en is the text learners read)
  "duration_min": int, "gems_reward": int, "xp_reward": int, "min_completion_pct": int,
  "sections": [
    { "kind": "passage", "body_vi": str, "body_en": str, "meta": {} },   // the passage body
    { "kind": "drill", "body_vi": str, "body_en": str,                   // comprehension Qs
      "meta": { "questions": [ {"q_en": str, "q_vi": str, "answer_en": str} ] } }
  ]
}
Passage length scales with level: A2 ~200 words, B1 ~300-350, B2 ~450, C1 ~600.
Suggested: gems_reward 3, xp_reward 40-80, min_completion_pct 60.
"""

_SHAPES = {
    "vocabulary_pack": _VOCAB_SHAPE,
    "grammar_lesson": _SECTION_SHAPE_GRAMMAR,
    "dialogue": _SECTION_SHAPE_DIALOGUE,
    "reading_passage": _SECTION_SHAPE_READING,
}


def build_prompt(spec: MaterialSpec) -> str:
    shape = _SHAPES[spec.type]
    goal = spec.goal or "general"
    return (
        f"You are an expert Vietnamese English-teacher and curriculum writer.\n"
        f"Create ONE {spec.type} at CEFR level {spec.level.upper()} for the learning goal "
        f"'{goal}'.\n"
        f"Topic (Vietnamese): {spec.topic_vi}\n"
        f"Topic (English): {spec.topic_en}\n\n"
        f"{_COMMON_RULES}\n{shape}"
    )


def _extract_json(raw: str) -> dict:
    text = raw.strip()
    # Prefer an explicit ```json ... ``` or ``` ... ``` fenced block.
    fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fence:
        try:
            return json.loads(fence.group(1))
        except json.JSONDecodeError as e:
            raise ValueError(f"invalid JSON in model response: {e}") from e

    # No fence: scan for the first balanced JSON object. raw_decode parses a
    # single JSON value starting at a given index and ignores trailing text,
    # so we try each '{' until one decodes to a dict.
    decoder = json.JSONDecoder()
    for start in range(len(text)):
        if text[start] != "{":
            continue
        try:
            obj, _ = decoder.raw_decode(text, start)
        except json.JSONDecodeError:
            continue
        if isinstance(obj, dict):
            return obj
    raise ValueError("no JSON object found in model response")


def _coerce_int(data: dict, key: str) -> int:
    try:
        return int(data[key])
    except (TypeError, ValueError) as e:
        raise ValueError(f"field '{key}' is not an integer: {data.get(key)!r}") from e


def parse_response(spec: MaterialSpec, raw: str) -> Material:
    data = _extract_json(raw)

    required = ["title_vi", "title_en", "summary_vi", "summary_en", "body_vi", "body_en",
                "duration_min", "gems_reward", "xp_reward", "min_completion_pct"]
    missing = [k for k in required if k not in data]
    if missing:
        raise ValueError(f"response missing keys: {missing}")

    vocab_items: list[VocabItem] = []
    sections: list[Section] = []

    if spec.type == "vocabulary_pack":
        for i, v in enumerate(data.get("vocab_items", [])):
            vocab_items.append(VocabItem(
                idx=i,
                term=v.get("term", ""),
                pos=v.get("pos"),
                ipa=v.get("ipa"),
                vi_phonetic_hint=v.get("vi_phonetic_hint"),
                gloss_vi=v.get("gloss_vi", ""),
                gloss_en=v.get("gloss_en"),
                example_en=v.get("example_en", ""),
                example_vi=v.get("example_vi", ""),
            ))
    else:
        for i, s in enumerate(data.get("sections", [])):
            sections.append(Section(
                idx=i,
                kind=s.get("kind", ""),
                body_vi=s.get("body_vi"),
                body_en=s.get("body_en"),
                meta=s.get("meta", {}) or {},
            ))

    return Material(
        slug=spec.slug,
        type=spec.type,
        level=spec.level,
        goal=spec.goal,
        title_vi=data["title_vi"],
        title_en=data["title_en"],
        summary_vi=data["summary_vi"],
        summary_en=data["summary_en"],
        body_vi=data["body_vi"],
        body_en=data["body_en"],
        duration_min=_coerce_int(data, "duration_min"),
        gems_reward=_coerce_int(data, "gems_reward"),
        xp_reward=_coerce_int(data, "xp_reward"),
        min_completion_pct=_coerce_int(data, "min_completion_pct"),
        vocab_items=vocab_items,
        sections=sections,
    )
