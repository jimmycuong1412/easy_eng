from materials_generator.models import Material, VocabItem, Section


def _base_material(**overrides):
    data = dict(
        slug="vocab-airport-a1",
        type="vocabulary_pack",
        level="a1",
        goal="travel",
        title_vi="Từ vựng sân bay",
        title_en="Airport vocabulary",
        summary_vi="Học từ vựng sân bay cơ bản.",
        summary_en="Learn basic airport vocabulary.",
        body_vi="# Sân bay\nNội dung.",
        body_en="# Airport\nContent.",
        duration_min=10,
        gems_reward=2,
        xp_reward=40,
        min_completion_pct=80,
        vocab_items=[
            VocabItem(0, "passport", "noun", "/ˈpæspɔːrt/", "pát-pọt",
                      "hộ chiếu", "travel document", "Show your passport.", "Đưa hộ chiếu ra.")
        ],
        sections=[],
    )
    data.update(overrides)
    return Material(**data)


def test_valid_material_has_no_errors():
    assert _base_material().validate() == []


def test_published_requires_english_fields():
    m = _base_material(title_en="", summary_en="", body_en="")
    errors = m.validate()
    assert any("title_en" in e for e in errors)
    assert any("summary_en" in e for e in errors)
    assert any("body_en" in e for e in errors)


def test_bad_slug_rejected():
    assert any("slug" in e for e in _base_material(slug="Vocab Airport!").validate())


def test_summary_vi_length_cap():
    assert any("summary_vi" in e for e in _base_material(summary_vi="x" * 501).validate())


def test_title_vi_length_cap():
    assert any("title_vi" in e for e in _base_material(title_vi="x" * 201).validate())


def test_duration_out_of_range():
    assert any("duration_min" in e for e in _base_material(duration_min=0).validate())
    assert any("duration_min" in e for e in _base_material(duration_min=91).validate())


def test_invalid_type_level_goal_kind():
    assert any("type" in e for e in _base_material(type="podcast").validate())
    assert any("level" in e for e in _base_material(level="z9").validate())
    assert any("goal" in e for e in _base_material(goal="cooking").validate())
    m = _base_material(type="grammar_lesson", vocab_items=[],
                       sections=[Section(0, "bogus_kind", "vi", "en", {})])
    assert any("kind" in e for e in m.validate())


def test_vocab_pack_requires_items():
    assert any("vocab" in e.lower() for e in _base_material(vocab_items=[]).validate())


def test_vocab_item_missing_required_fields():
    bad = VocabItem(0, "", None, None, None, "", None, "", "")
    m = _base_material(vocab_items=[bad])
    errors = m.validate()
    assert any("term" in e for e in errors)
    assert any("gloss_vi" in e for e in errors)
    assert any("example_en" in e for e in errors)


def test_non_vocab_type_requires_sections():
    m = _base_material(type="grammar_lesson", vocab_items=[], sections=[])
    assert any("section" in e.lower() for e in m.validate())
