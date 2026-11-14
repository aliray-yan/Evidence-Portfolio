"""Explicit, closed registry. Unknown manifests cannot import arbitrary code."""
from . import exchange


def profile(name='mobilenet-v3-small-gru-v1'):
    if name == 'mobilenet-v3-small-gru-v1':
        return exchange
    if name == 'dinov2-small-gru-v1':
        from . import exchange_dino
        return exchange_dino
    raise ValueError('Unsupported exchange architecture')
