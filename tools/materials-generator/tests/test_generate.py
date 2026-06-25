# tests/test_generate.py
import asyncio
import json
from pathlib import Path

from materials_generator.catalog import MaterialSpec
from materials_generator.generate import generate_one, run


VOCAB_SPEC = MaterialSpec("vocabulary_pack", "a1", "travel",
                          "Tại sân bay", "At the airport", "vocab-airport-a1")


def _good_payload():
    return json.dumps({
        "title_vi": "Từ vựng sân bay", "title_en": "Airport vocabulary",
        "summary_vi": "Tóm tắt.", "summary_en": "Summary.",
        "body_vi": "# Sân bay", "body_en": "# Airport",
        "duration_min": 10, "gems_reward": 2, "xp_reward": 40, "min_completion_pct": 80,
        "vocab_items": [
            {"term": "gate", "pos": "noun", "ipa": "/ɡeɪt/", "vi_phonetic_hint": "gết",
             "gloss_vi": "cổng ra máy bay", "gloss_en": "boarding gate",
             "example_en": "Go to gate 5.", "example_vi": "Đến cổng số 5."}
        ],
    })


def test_generate_one_returns_valid_material():
    async def fake_query(prompt): return _good_payload()
    m = asyncio.run(generate_one(VOCAB_SPEC, fake_query))
    assert m is not None
    assert m.slug == "vocab-airport-a1"


def test_generate_one_returns_none_on_invalid():
    # vocab pack with no items -> fails validation
    bad = json.dumps({
        "title_vi": "x", "title_en": "x", "summary_vi": "x", "summary_en": "x",
        "body_vi": "x", "body_en": "x",
        "duration_min": 10, "gems_reward": 2, "xp_reward": 40, "min_completion_pct": 80,
        "vocab_items": [],
    })
    async def fake_query(prompt): return bad
    assert asyncio.run(generate_one(VOCAB_SPEC, fake_query)) is None


def test_generate_one_returns_none_on_no_json():
    async def fake_query(prompt): return "Sorry, no."
    assert asyncio.run(generate_one(VOCAB_SPEC, fake_query)) is None


def test_run_writes_sql_and_summary(tmp_path):
    async def fake_query(prompt): return _good_payload()
    out = tmp_path / "materials_insert.sql"
    summary = asyncio.run(run([VOCAB_SPEC], fake_query, out))
    assert summary == {"generated": 1, "failed": 0, "specs": 1}
    text = out.read_text(encoding="utf-8")
    assert "INSERT INTO materials" in text
    assert "vocab-airport-a1" in text


def test_run_skips_file_when_nothing_generated(tmp_path):
    async def fake_query(prompt): return "no json here"
    out = tmp_path / "materials_insert.sql"
    summary = asyncio.run(run([VOCAB_SPEC], fake_query, out))
    assert summary == {"generated": 0, "failed": 1, "specs": 1}
    assert not out.exists()
