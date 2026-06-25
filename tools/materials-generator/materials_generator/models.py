"""Dataclasses mirroring the materials DB schema, with client-side validation.

Validation enforces the same constraints the DB enforces, so we never emit SQL
that would violate a CHECK constraint or the published-bilingual rule.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

VALID_TYPES = {
    "vocabulary_pack", "grammar_lesson", "reading_passage",
    "listening_audio", "dialogue", "mock_test",
}
VALID_LEVELS = {"a1", "a2", "b1", "b2", "c1"}
VALID_GOALS = {
    "school", "vstep", "toeic", "ielts", "business",
    "study_abroad", "conversation", "travel",
}
VALID_SECTION_KINDS = {
    "intro", "pattern", "drill", "passage",
    "audio", "dialogue_line", "test_block",
}
SLUG_RE = re.compile(r"^[a-z0-9-]+\Z")


@dataclass
class VocabItem:
    idx: int
    term: str
    pos: str | None
    ipa: str | None
    vi_phonetic_hint: str | None
    gloss_vi: str
    gloss_en: str | None
    example_en: str
    example_vi: str

    def validate(self) -> list[str]:
        errs: list[str] = []
        if not self.term.strip():
            errs.append(f"vocab[{self.idx}].term is empty")
        if not self.gloss_vi.strip():
            errs.append(f"vocab[{self.idx}].gloss_vi is empty")
        if not self.example_en.strip():
            errs.append(f"vocab[{self.idx}].example_en is empty")
        if not self.example_vi.strip():
            errs.append(f"vocab[{self.idx}].example_vi is empty")
        return errs


@dataclass
class Section:
    idx: int
    kind: str
    body_vi: str | None
    body_en: str | None
    meta: dict = field(default_factory=dict)

    def validate(self) -> list[str]:
        errs: list[str] = []
        if self.kind not in VALID_SECTION_KINDS:
            errs.append(f"section[{self.idx}].kind '{self.kind}' invalid")
        if not (self.body_vi or self.body_en):
            errs.append(f"section[{self.idx}] has no body")
        return errs


@dataclass
class Material:
    slug: str
    type: str
    level: str
    goal: str | None
    title_vi: str
    title_en: str
    summary_vi: str
    summary_en: str
    body_vi: str
    body_en: str
    duration_min: int
    gems_reward: int
    xp_reward: int
    min_completion_pct: int
    vocab_items: list[VocabItem] = field(default_factory=list)
    sections: list[Section] = field(default_factory=list)

    def validate(self) -> list[str]:
        errs: list[str] = []

        if not SLUG_RE.match(self.slug) or len(self.slug) > 96:
            errs.append(f"slug '{self.slug}' invalid (regex ^[a-z0-9-]+\\Z, <=96 chars)")
        if self.type not in VALID_TYPES:
            errs.append(f"type '{self.type}' invalid")
        if self.level not in VALID_LEVELS:
            errs.append(f"level '{self.level}' invalid")
        if self.goal is not None and self.goal not in VALID_GOALS:
            errs.append(f"goal '{self.goal}' invalid")

        # Published-bilingual rule
        if not self.title_en.strip():
            errs.append("title_en is required (published)")
        if not self.summary_en.strip():
            errs.append("summary_en is required (published)")
        if not self.body_en.strip():
            errs.append("body_en is required (published)")

        # Length caps
        if len(self.title_vi) > 200:
            errs.append("title_vi exceeds 200 chars")
        if len(self.summary_vi) > 500:
            errs.append("summary_vi exceeds 500 chars")

        # Numeric ranges
        if not (1 <= self.duration_min <= 90):
            errs.append("duration_min out of range [1,90]")
        if self.gems_reward < 0:
            errs.append("gems_reward must be >= 0")
        if self.xp_reward < 0:
            errs.append("xp_reward must be >= 0")
        if not (0 <= self.min_completion_pct <= 100):
            errs.append("min_completion_pct out of range [0,100]")

        # Children: vocab packs need items; everything else needs sections
        if self.type == "vocabulary_pack":
            if not self.vocab_items:
                errs.append("vocabulary_pack requires vocab_items")
            for vi in self.vocab_items:
                errs.extend(vi.validate())
        else:
            if not self.sections:
                errs.append(f"{self.type} requires sections")
            for s in self.sections:
                errs.extend(s.validate())

        return errs
