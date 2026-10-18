"""
Single source of truth for label names — used by the manifest
preparer, both training scripts, and the inference wrappers. These
match `ConcernLabel` / `LesionClass` in backend/app/schemas.py exactly;
if you add or rename a label, update both places.
"""

# Multi-label skin-concern classifier output (PRD FR-05).
CONCERN_LABELS: list[str] = [
    "acne",
    "blackheads",
    "whiteheads",
    "visible_pores",
    "redness",
    "dark_spots",
    "pigmentation",
    "wrinkles",
    "acne_scars",
]

# Lesion-detector bounding-box classes (PRD FR-06 / Dataset C).
#
# NOTE: this is a *default suggestion* for training a new detector
# from scratch, not a fixed contract — backend/app/schemas.py's
# LesionClass is a plain string precisely because the class list
# actually used depends on whatever dataset a given checkpoint was
# trained on. The checkpoint currently shipped in
# backend/app/ml_models/detector/ was trained on a different Kaggle
# dataset than originally planned and actually uses:
#   ["blackheads", "dark spot", "nodules", "papules", "pustules", "whiteheads"]
# (verified directly from that checkpoint's embedded model.names — see
# docs/model_card.md). The list below is kept as the PRD's originally
# planned taxonomy for anyone training a fresh detector against
# Dataset C specifically; it is NOT what the currently shipped
# checkpoint uses.
LESION_CLASSES: list[str] = [
    "comedone",
    "papule",
    "pustule",
    "nodule",
    "cyst",
    "scar",
]
