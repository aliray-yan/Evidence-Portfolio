# RETIRED 2026-11-05: historical research regression code only; not imported by application inference.
"""Bounded English phrase context, not trained intent or a legal classification."""
import re

VERSION = 'english-context-v1'
PHRASES = [
    ('official receipt', 'routine', 'English', 'Receipt wording is procedural context; verify whether a receipt was actually offered.'),
    ('pay at the counter', 'routine', 'English', 'Payment at an official counter can be routine procedure.'),
    ('pay the fine online', 'routine', 'English', 'Official online fine payment is routine context.'),
    ('published fee', 'routine', 'English', 'Published-fee wording supports procedural context, not proof of legitimacy.'),
    ('pay me cash', 'coercive', 'English', 'A personal cash request may be relevant to an unofficial-payment concern. Verify purpose, speaker and surrounding exchange.'),
    ('give me cash', 'coercive', 'English', 'A personal cash demand needs context; words alone do not establish bribery.'),
    ('pay me directly', 'coercive', 'English', 'Direct personal-payment wording requires review of payment purpose and authority.'),
    ('no receipt needed', 'coercive', 'English', 'Undocumented-payment wording requires corroboration; it is not proof of misconduct.'),
    ('no receipt is needed', 'coercive', 'English', 'Possible undocumented-payment context; check surrounding conversation.'),
    ('without a receipt', 'ambiguous', 'English', 'A missing-receipt reference can be a complaint, request or description; review context.'),
    ('keep this off the record', 'coercive', 'English', 'Concealment wording requires review; it may be quoted or refer to another matter.'),
    ('make the ticket disappear', 'coercive', 'English', 'Possible offer to remove an official consequence; verify context and any requested exchange.'),
    ('forget about the ticket', 'ambiguous', 'English', 'Ticket-dismissal wording may be legitimate or concerning; context is required.'),
    ('something for me', 'ambiguous', 'English', 'An unspecified personal benefit may be relevant but cannot establish an unofficial payment.'),
    ('accept a bribe', 'coercive', 'English', 'Explicit bribery wording may be a refusal, quotation or allegation; no guilt determination is made.'),
    ('offer a bribe', 'coercive', 'English', 'Explicit bribery wording requires context, especially refusals and educational examples.'),
    ('pay a bribe', 'coercive', 'English', 'Explicit bribery wording requires context; verify whether this is a refusal or reported allegation.'),
    ('pay me or', 'coercive', 'English', 'Conditional personal-payment demand; human review is required.'),
    ('give me money or', 'coercive', 'English', 'Conditional money demand may indicate pressure; verify the words and situation.'),
    ('officer down', 'safety', 'English', 'Possible officer-danger report; urgent human verification is required.'),
    ('send an ambulance', 'safety', 'English', 'Explicit medical-assistance request; verify promptly without automatic dispatch.'),
]


def scope(text, start, end):
    """Return scope only for a matched phrase, with contrast boundaries respected."""
    prefix, suffix = text[:start].strip(), text[end:].strip()
    # Never let a denial before 'but/however' cancel the demand that follows.
    prefix = re.split(r'\b(?:but|however|instead)\b', prefix)[-1]
    denial = re.search(r'(?:\bdo not|\bdon t|\bdoes not|\bdoesn t|\bwill not|\bwon t|\bwould not|\bwouldn t|\bmust not|\bmustn t|\bnever|\brefuse to|\bnot allowed to)\s+(?:(?:ever|personally)\s+)?$', prefix + ' ')
    if denial or re.match(r'^(?:is|was)\s+(?:not permitted|prohibited|unacceptable|forbidden)\b', suffix):
        return 'negated'
    if re.search(r'\b(?:training example|fictional example|example sentence|phrase|quote)\s*$', prefix) or re.match(r'^is (?:only |just )?(?:a training |an? )?example\b', suffix):
        return 'quoted'
    if re.search(r'\b(?:he|she|they|the officer) (?:said|asked|demanded)\b', prefix):
        return 'reported'
    return 'direct_or_unknown'
