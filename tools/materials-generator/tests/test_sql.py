from materials_generator.models import Material, VocabItem, Section
from materials_generator.sql import sql_str, sql_text_array, render_material, render_file


def test_sql_str_escapes_single_quotes():
    assert sql_str("it's") == "'it''s'"


def test_sql_str_none_is_null():
    assert sql_str(None) == "NULL"


def test_sql_str_preserves_vietnamese_diacritics():
    out = sql_str("Phở bò")
    assert "Phở bò" in out
    assert out.startswith("'") and out.endswith("'")


def test_sql_text_array():
    assert sql_text_array(["a", "b'c"]) == "ARRAY['a','b''c']::text[]"


def _vocab_material():
    return Material(
        slug="vocab-airport-a1", type="vocabulary_pack", level="a1", goal="travel",
        title_vi="Sân bay", title_en="Airport",
        summary_vi="Tóm tắt", summary_en="Summary",
        body_vi="Thân", body_en="Body",
        duration_min=10, gems_reward=2, xp_reward=40, min_completion_pct=80,
        vocab_items=[VocabItem(0, "gate", "noun", "/ɡeɪt/", "gết",
                               "cổng ra máy bay", "boarding gate",
                               "Go to gate 5.", "Đến cổng số 5.")],
        sections=[],
    )


def test_render_material_is_idempotent_and_typed():
    out = render_material(_vocab_material())
    assert "DO $$" in out and "END $$;" in out
    assert "ON CONFLICT" in out
    assert "role = 'admin'" in out
    assert "INSERT INTO materials" in out
    assert "INSERT INTO vocabulary_items" in out
    assert "vocab-airport-a1" in out


def test_render_material_sections_for_non_vocab():
    m = Material(
        slug="grammar-articles-a1", type="grammar_lesson", level="a1", goal="school",
        title_vi="Mạo từ", title_en="Articles",
        summary_vi="Tóm tắt", summary_en="Summary",
        body_vi="Thân", body_en="Body",
        duration_min=10, gems_reward=3, xp_reward=40, min_completion_pct=80,
        vocab_items=[],
        sections=[Section(0, "intro", "Giới thiệu", "Intro", {}),
                  Section(1, "pattern", "Mẫu", "Pattern", {"note": "a/an/the"})],
    )
    out = render_material(m)
    assert "INSERT INTO material_sections" in out
    assert "'intro'" in out and "'pattern'" in out
    # meta rendered as jsonb
    assert "jsonb" in out.lower()


def test_render_file_has_header_and_all_blocks():
    out = render_file([_vocab_material()])
    assert out.lstrip().startswith("--")
    assert out.count("DO $$") == 1
