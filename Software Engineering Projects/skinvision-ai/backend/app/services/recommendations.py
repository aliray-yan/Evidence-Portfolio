"""
Rule-based recommendation engine — PRD section 6.

Unlike the classifier/detector, this is a complete, real
implementation. Per PRD section 6.2 and section 26 rule 8, the MVP
must use a transparent, auditable rule engine rather than an LLM that
could invent medical advice, so there is nothing here waiting on a
trained model.
"""

from __future__ import annotations

from app.schemas import Concern, ConcernLabel, Recommendation

# PRD section 5.7.D table, expressed as one-or-more educational,
# non-prescriptive recommendations per concern. Every "text" here
# avoids the prohibited wording in PRD section 3 (no certainty claims,
# no percentages, no treatment guarantees, no telling users to stop
# prescribed medication).
_RULES: dict[ConcernLabel, list[dict[str, str]]] = {
    "acne": [
        {
            "id": "acne-gentle-cleansing",
            "title": "Use a gentle cleansing routine",
            "text": (
                "A gentle, fragrance-free cleanser may help remove excess oil and "
                "impurities without unnecessarily irritating the skin. Avoid picking "
                "or squeezing, which can worsen inflammation."
            ),
        },
        {
            "id": "acne-derm-consult",
            "title": "Consider a dermatologist consultation",
            "text": (
                "If acne persists or bothers you, a dermatologist can discuss "
                "treatment options suited to your skin."
            ),
        },
    ],
    "blackheads": [
        {
            "id": "blackheads-noncomedogenic",
            "title": "Consider non-comedogenic skincare",
            "text": (
                "Gentle cleansing and non-comedogenic (won't clog pores) products may "
                "help. Avoid squeezing, which can push material deeper into the pore."
            ),
        }
    ],
    "whiteheads": [
        {
            "id": "whiteheads-avoid-squeezing",
            "title": "Avoid squeezing and monitor",
            "text": (
                "Avoid squeezing whiteheads. If they are persistent or widespread, "
                "professional guidance can help identify a suitable routine."
            ),
        }
    ],
    "visible_pores": [
        {
            "id": "pores-gentle-sunscreen",
            "title": "Gentle cleansing and daily sunscreen",
            "text": (
                "Gentle cleansing, regular sunscreen use, and avoiding harsh "
                "scrubbing may help pores look less prominent over time."
            ),
        }
    ],
    "redness": [
        {
            "id": "redness-fragrance-free",
            "title": "Use fragrance-free, gentle products",
            "text": (
                "Fragrance-free skincare and avoiding known irritants (harsh scrubs, "
                "very hot water) may help reduce visible redness."
            ),
        }
    ],
    "dark_spots": [
        {
            "id": "dark-spots-sunscreen",
            "title": "Daily sunscreen",
            "text": (
                "Daily sunscreen and avoiding picking at the skin may help prevent "
                "dark spots from becoming more noticeable."
            ),
        }
    ],
    "pigmentation": [
        {
            "id": "pigmentation-sun-protection",
            "title": "Consistent sun protection",
            "text": (
                "Uneven pigmentation is commonly influenced by sun exposure; "
                "consistent daily sunscreen is a general first step."
            ),
        }
    ],
    "wrinkles": [
        {
            "id": "wrinkles-sun-protection",
            "title": "Sun protection and gentle skincare",
            "text": "Daily sun protection and gentle, consistent skincare are general supportive steps.",
        }
    ],
    "acne_scars": [
        {
            "id": "scars-derm-consult",
            "title": "Discuss options with a dermatologist",
            "text": (
                "Approaches to the appearance of acne scarring vary by scar type; a "
                "dermatologist can help identify what may be appropriate for you."
            ),
        }
    ],
}

_PROFESSIONAL_EVAL_NOTE = Recommendation(
    id="general-professional-evaluation",
    concern="acne",
    title="Consider a professional skin evaluation",
    text=(
        "Based on the visible features detected, a dermatologist or other "
        "qualified professional can give you a more complete picture than an "
        "image-based estimate."
    ),
    priority="professional_evaluation",
)


def generate_recommendations(concerns: list[Concern]) -> tuple[list[Recommendation], bool]:
    """Maps detected/possible concerns to educational recommendations.

    Returns (recommendations, professional_evaluation_suggested).
    `not_detected` concerns are skipped entirely — PRD FR-07 only
    wants recommendations tied to things that were actually flagged.
    """
    recommendations: list[Recommendation] = []
    seen_ids: set[str] = set()

    relevant = [c for c in concerns if c.status in ("detected", "possible")]

    for concern in relevant:
        for rule in _RULES.get(concern.label, []):
            if rule["id"] in seen_ids:
                continue
            seen_ids.add(rule["id"])
            recommendations.append(
                Recommendation(
                    id=rule["id"],
                    concern=concern.label,
                    title=rule["title"],
                    text=rule["text"],
                    priority="general",
                )
            )

    # Simple, documented trigger (PRD section 6.5): a single image-based
    # "detected" (not just "possible") acne finding above this
    # threshold suggests, but never diagnoses, professional evaluation.
    # This is NOT the same as the symptom-based triggers in PRD 6.5
    # (pain, rapid worsening, infection) — those require the user to
    # report symptoms, which an image alone cannot determine.
    professional_eval = any(
        c.label == "acne" and c.status == "detected" and c.probability >= 0.6 for c in concerns
    )
    if professional_eval:
        recommendations.append(_PROFESSIONAL_EVAL_NOTE)

    return recommendations, professional_eval
