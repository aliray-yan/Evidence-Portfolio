# Dataset audit checklist (manual portion)

`ml/dataset_audit.py` covers the mechanical checks (class balance,
duplicates, corrupt files, license file presence). The items below
need a human to actually look at the data — fill this in per dataset
before using it for training (PRD section 21 Phase 1, section 11).

## Dataset: ______________________
## Source URL: ______________________
## Date reviewed: ______________________

### Licensing & consent
- [ ] License terms read in full (not just "license present")
- [ ] License permits the intended use (training a commercial/public product)
- [ ] Attribution requirements identified, if any
- [ ] For any dataset containing real identifiable people: sourcing
      appears to have documented consent (not scraped without
      permission)

### Content spot-check (sample at least 30 images across classes)
- [ ] Images are actually of the labeled condition, not mislabeled
- [ ] No images of minors without clear, appropriate context
- [ ] No duplicate images across supposedly-different classes
- [ ] Reasonable diversity of skin tones represented — note any gaps here:

  ______________________

### Automated report
- [ ] `dataset_audit.py` run, report attached/linked: ______________________
- [ ] Class imbalance addressed (weighting, resampling, or accepted
      as-is with reasoning): ______________________

### Decision
- [ ] Approved for training
- [ ] Approved with caveats: ______________________
- [ ] Rejected — reason: ______________________
