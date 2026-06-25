"""Deterministic run plan: ~30 MaterialSpecs across the thin types.

Slugs are precomputed and verified (in tests) not to collide with the live DB
snapshot taken 2026-06-25. Deterministic => re-running is resumable: anything
already in the DB is skipped by ON CONFLICT.
"""

from __future__ import annotations

from dataclasses import dataclass

# Snapshot of existing slugs for the four thin types (live DB, 2026-06-25).
EXISTING_SLUGS: set[str] = {
    "vocab-food-a1", "vocab-greetings-a1", "vocab-ielts-academic-b2",
    "vocab-interview-b1", "vocab-school-a2",
    "grammar-conditionals-b1", "grammar-passive-voice-b1", "grammar-past-simple-a2",
    "grammar-present-simple-a1", "grammar-reported-speech-b2",
    "dialogue-bargaining-a2", "dialogue-business-meeting-c1", "dialogue-doctor-visit-b1",
    "dialogue-job-interview-b2", "dialogue-meeting-friend-a1",
}


@dataclass
class MaterialSpec:
    type: str
    level: str
    goal: str | None
    topic_vi: str
    topic_en: str
    slug: str


CATALOG: list[MaterialSpec] = [
    # ---- vocabulary_pack × 9 ----
    MaterialSpec("vocabulary_pack", "a1", "travel", "Tại sân bay", "At the airport", "vocab-airport-a1"),
    MaterialSpec("vocabulary_pack", "a1", "conversation", "Gia đình", "Family", "vocab-family-a1"),
    MaterialSpec("vocabulary_pack", "a2", "travel", "Đặt phòng khách sạn", "Hotel booking", "vocab-hotel-a2"),
    MaterialSpec("vocabulary_pack", "a2", "conversation", "Thời tiết", "Weather", "vocab-weather-a2"),
    MaterialSpec("vocabulary_pack", "b1", "business", "Email công việc", "Work email", "vocab-work-email-b1"),
    MaterialSpec("vocabulary_pack", "b1", "toeic", "Văn phòng & công sở", "Office life (TOEIC)", "vocab-office-toeic-b1"),
    MaterialSpec("vocabulary_pack", "b2", "ielts", "Môi trường", "Environment (IELTS)", "vocab-environment-ielts-b2"),
    MaterialSpec("vocabulary_pack", "b2", "study_abroad", "Du học", "Studying abroad", "vocab-study-abroad-b2"),
    MaterialSpec("vocabulary_pack", "c1", "ielts", "Công nghệ", "Technology (IELTS)", "vocab-technology-ielts-c1"),

    # ---- grammar_lesson × 8 ----
    MaterialSpec("grammar_lesson", "a1", "school", "Động từ to be", "The verb to be", "grammar-verb-to-be-a1"),
    MaterialSpec("grammar_lesson", "a2", "school", "Thì hiện tại tiếp diễn", "Present continuous", "grammar-present-continuous-a2"),
    MaterialSpec("grammar_lesson", "a2", "school", "Danh từ đếm được & không đếm được", "Countable & uncountable nouns", "grammar-countable-nouns-a2"),
    MaterialSpec("grammar_lesson", "b1", "vstep", "Thì hiện tại hoàn thành", "Present perfect", "grammar-present-perfect-b1"),
    MaterialSpec("grammar_lesson", "b1", "ielts", "Mệnh đề quan hệ", "Relative clauses", "grammar-relative-clauses-b1"),
    MaterialSpec("grammar_lesson", "b2", "ielts", "Câu giả định & wish", "Subjunctive & wish", "grammar-wish-b2"),
    MaterialSpec("grammar_lesson", "b2", "toeic", "Giới từ thường gặp", "Common prepositions", "grammar-prepositions-b2"),
    MaterialSpec("grammar_lesson", "c1", "ielts", "Đảo ngữ", "Inversion", "grammar-inversion-c1"),

    # ---- dialogue × 8 ----
    MaterialSpec("dialogue", "a1", "conversation", "Gọi món ở quán phở", "Ordering at a phở shop", "dialogue-ordering-pho-a1"),
    MaterialSpec("dialogue", "a1", "travel", "Hỏi đường", "Asking for directions", "dialogue-directions-a1"),
    MaterialSpec("dialogue", "a2", "travel", "Bắt taxi/Grab", "Taking a taxi/Grab", "dialogue-taxi-a2"),
    MaterialSpec("dialogue", "b1", "conversation", "Mở tài khoản ngân hàng", "Opening a bank account", "dialogue-bank-account-b1"),
    MaterialSpec("dialogue", "b1", "business", "Gọi điện chăm sóc khách hàng", "Customer service call", "dialogue-customer-service-b1"),
    MaterialSpec("dialogue", "b2", "business", "Thương lượng hợp đồng", "Negotiating a contract", "dialogue-contract-negotiation-b2"),
    MaterialSpec("dialogue", "b2", "study_abroad", "Phỏng vấn visa du học", "Student visa interview", "dialogue-visa-interview-b2"),
    MaterialSpec("dialogue", "c1", "business", "Họp brainstorm dự án", "Project brainstorming meeting", "dialogue-brainstorm-c1"),

    # ---- reading_passage × 5 ----
    MaterialSpec("reading_passage", "a2", "travel", "Chợ nổi miền Tây", "Mekong floating markets", "reading-floating-market-a2"),
    MaterialSpec("reading_passage", "b1", "conversation", "Văn hoá xe máy ở Việt Nam", "Motorbike culture in Vietnam", "reading-motorbike-culture-b1"),
    MaterialSpec("reading_passage", "b1", "school", "Hệ thống giáo dục Việt Nam", "Vietnam's education system", "reading-education-system-b1"),
    MaterialSpec("reading_passage", "b2", "business", "Khởi nghiệp công nghệ tại Việt Nam", "Tech startups in Vietnam", "reading-tech-startups-b2"),
    MaterialSpec("reading_passage", "c1", "ielts", "Đô thị hoá ở Đông Nam Á", "Urbanization in Southeast Asia", "reading-urbanization-c1"),
]
