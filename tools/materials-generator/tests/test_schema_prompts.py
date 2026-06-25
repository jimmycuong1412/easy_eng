import json
import pytest
from materials_generator.catalog import MaterialSpec
from materials_generator.schema_prompts import build_prompt, parse_response


VOCAB_SPEC = MaterialSpec("vocabulary_pack", "a1", "travel",
                          "Tại sân bay", "At the airport", "vocab-airport-a1")
GRAMMAR_SPEC = MaterialSpec("grammar_lesson", "a1", "school",
                            "Động từ to be", "The verb to be", "grammar-verb-to-be-a1")


def test_prompt_mentions_topic_and_demands_json():
    p = build_prompt(VOCAB_SPEC)
    assert "At the airport" in p or "Tại sân bay" in p
    assert "JSON" in p
    assert "vocabulary_pack" in p


def test_prompt_for_grammar_asks_for_sections():
    p = build_prompt(GRAMMAR_SPEC)
    assert "sections" in p.lower()


def _vocab_payload():
    return {
        "title_vi": "Từ vựng sân bay", "title_en": "Airport vocabulary",
        "summary_vi": "Tóm tắt.", "summary_en": "Summary.",
        "body_vi": "# Sân bay", "body_en": "# Airport",
        "duration_min": 10, "gems_reward": 2, "xp_reward": 40, "min_completion_pct": 80,
        "vocab_items": [
            {"term": "gate", "pos": "noun", "ipa": "/ɡeɪt/", "vi_phonetic_hint": "gết",
             "gloss_vi": "cổng ra máy bay", "gloss_en": "boarding gate",
             "example_en": "Go to gate 5.", "example_vi": "Đến cổng số 5."}
        ],
    }


def test_parse_plain_json():
    m = parse_response(VOCAB_SPEC, json.dumps(_vocab_payload()))
    assert m.slug == "vocab-airport-a1"
    assert m.type == "vocabulary_pack"
    assert m.level == "a1"
    assert m.goal == "travel"
    assert len(m.vocab_items) == 1
    assert m.vocab_items[0].idx == 0
    assert m.vocab_items[0].term == "gate"


def test_parse_json_in_code_fence_with_prose():
    raw = "Here you go:\n```json\n" + json.dumps(_vocab_payload()) + "\n```\nThanks!"
    m = parse_response(VOCAB_SPEC, raw)
    assert m.title_en == "Airport vocabulary"


def test_parse_grammar_sections():
    payload = {
        "title_vi": "Động từ to be", "title_en": "The verb to be",
        "summary_vi": "Tóm tắt.", "summary_en": "Summary.",
        "body_vi": "Thân", "body_en": "Body",
        "duration_min": 10, "gems_reward": 3, "xp_reward": 40, "min_completion_pct": 80,
        "sections": [
            {"kind": "intro", "body_vi": "Giới thiệu", "body_en": "Intro", "meta": {}},
            {"kind": "pattern", "body_vi": "Mẫu", "body_en": "Pattern", "meta": {"note": "am/is/are"}},
        ],
    }
    m = parse_response(GRAMMAR_SPEC, json.dumps(payload))
    assert len(m.sections) == 2
    assert m.sections[0].kind == "intro"
    assert m.sections[1].idx == 1
    assert m.sections[1].meta == {"note": "am/is/are"}


def test_parse_no_json_raises():
    with pytest.raises(ValueError):
        parse_response(VOCAB_SPEC, "I cannot help with that.")


def test_parse_unfenced_json_with_prose_braces():
    # No code fence; prose before the real JSON contains stray braces.
    raw = ("Note: the shape {like this} is just an example. "
           "Here is the result: " + json.dumps(_vocab_payload()) + " -- done.")
    m = parse_response(VOCAB_SPEC, raw)
    assert m.title_en == "Airport vocabulary"
    assert len(m.vocab_items) == 1


def test_parse_unfenced_json_with_trailing_braces():
    raw = json.dumps(_vocab_payload()) + " Note: {trailing} commentary."
    m = parse_response(VOCAB_SPEC, raw)
    assert m.title_en == "Airport vocabulary"


def test_parse_missing_required_keys_raises():
    incomplete = {"title_vi": "x", "title_en": "x"}  # missing summary/body/numbers
    with pytest.raises(ValueError):
        parse_response(VOCAB_SPEC, json.dumps(incomplete))


def test_parse_null_numeric_field_raises_valueerror():
    payload = _vocab_payload()
    payload["duration_min"] = None
    with pytest.raises(ValueError):
        parse_response(VOCAB_SPEC, json.dumps(payload))


def test_parse_non_numeric_string_field_raises_valueerror():
    payload = _vocab_payload()
    payload["gems_reward"] = "abc"
    with pytest.raises(ValueError):
        parse_response(VOCAB_SPEC, json.dumps(payload))
