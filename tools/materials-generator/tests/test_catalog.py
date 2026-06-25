from collections import Counter
from materials_generator.catalog import CATALOG, EXISTING_SLUGS, MaterialSpec
from materials_generator.models import SLUG_RE, VALID_TYPES, VALID_LEVELS, VALID_GOALS


def test_catalog_size_is_30():
    assert len(CATALOG) == 30


def test_type_distribution():
    counts = Counter(s.type for s in CATALOG)
    assert counts["vocabulary_pack"] == 9
    assert counts["grammar_lesson"] == 8
    assert counts["dialogue"] == 8
    assert counts["reading_passage"] == 5


def test_all_specs_valid_fields():
    for s in CATALOG:
        assert s.type in VALID_TYPES
        assert s.level in VALID_LEVELS
        assert s.goal is None or s.goal in VALID_GOALS
        assert SLUG_RE.match(s.slug) and len(s.slug) <= 96


def test_slugs_unique_and_not_colliding():
    slugs = [s.slug for s in CATALOG]
    assert len(slugs) == len(set(slugs))                     # internally unique
    assert not (set(slugs) & EXISTING_SLUGS)                 # no DB collisions
