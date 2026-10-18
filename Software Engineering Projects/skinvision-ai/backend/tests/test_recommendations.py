from app.schemas import Concern
from app.services.recommendations import generate_recommendations


def _concern(label, status, probability=0.7) -> Concern:
    return Concern(
        label=label,
        display_name=label,
        probability=probability,
        confidence_level="medium",
        status=status,
        explanation="test",
    )


def test_not_detected_concerns_produce_no_recommendations():
    concerns = [_concern("acne", "not_detected", probability=0.1)]
    recs, professional_eval = generate_recommendations(concerns)
    assert recs == []
    assert professional_eval is False


def test_detected_concern_maps_to_its_rule():
    concerns = [_concern("redness", "detected")]
    recs, _ = generate_recommendations(concerns)
    assert any(r.concern == "redness" for r in recs)


def test_high_confidence_acne_suggests_professional_evaluation():
    concerns = [_concern("acne", "detected", probability=0.8)]
    recs, professional_eval = generate_recommendations(concerns)
    assert professional_eval is True
    assert any(r.priority == "professional_evaluation" for r in recs)


def test_no_recommendation_ever_contains_prohibited_wording():
    concerns = [_concern(label, "detected") for label in (
        "acne", "blackheads", "whiteheads", "visible_pores",
        "redness", "dark_spots", "pigmentation", "wrinkles", "acne_scars",
    )]
    recs, _ = generate_recommendations(concerns)
    prohibited = ["definitely have", "% blocked", "cure your skin", "stop taking"]
    for rec in recs:
        for phrase in prohibited:
            assert phrase not in rec.text.lower()
