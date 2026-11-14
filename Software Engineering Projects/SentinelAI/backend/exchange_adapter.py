"""One detector interface; explicit learned selection, otherwise legacy baseline."""
from .visual_exchange import LocalVisualExchange


def configured(config):
    return bool(getattr(config, 'learned_exchange_model', '') or config.exchange_model and config.gesture_model)


def sample_hz(config):
    return 4 if getattr(config, 'learned_exchange_model', '') else 2


def create_exchange(config):
    if getattr(config, 'learned_exchange_model', ''):
        from .learned_exchange import LearnedExchange
        return LearnedExchange(config.learned_exchange_model)
    return LocalVisualExchange(config.exchange_model, config.gesture_model)
