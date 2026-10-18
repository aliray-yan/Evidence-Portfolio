"""
Model architecture + preprocessing shared between train_classifier.py
and the backend's inference path (backend/app/services/model_loader.py).

Deliberately imports ONLY torch/torchvision — no pandas, sklearn, or
tqdm — so the backend can import this module for inference without
needing the heavier training-only dependencies installed.

Keeping this in one place matters: if training and inference ever
build the model differently (different head shape, different resize
size, different normalization), `load_state_dict` will either fail
loudly or — worse — load "successfully" onto a mismatched
architecture and produce silently wrong predictions.
"""

from __future__ import annotations

import torch.nn as nn
from torchvision import models, transforms

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]
INPUT_SIZE = 224


def build_classifier_model(num_labels: int) -> nn.Module:
    model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.IMAGENET1K_V1)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_labels)
    return model


def build_classifier_model_no_pretrained_download(num_labels: int) -> nn.Module:
    """Same architecture, without fetching ImageNet weights — used at
    inference time where we're about to overwrite every weight with
    our own checkpoint anyway, so downloading the pretrained weights
    first would just waste time and require network access."""
    model = models.efficientnet_b0(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_labels)
    return model


def build_train_transforms() -> transforms.Compose:
    return transforms.Compose(
        [
            transforms.Resize((256, 256)),
            transforms.RandomCrop((INPUT_SIZE, INPUT_SIZE)),
            transforms.RandomHorizontalFlip(),
            transforms.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.1),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ]
    )


def build_eval_transforms() -> transforms.Compose:
    return transforms.Compose(
        [
            transforms.Resize((INPUT_SIZE, INPUT_SIZE)),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ]
    )
