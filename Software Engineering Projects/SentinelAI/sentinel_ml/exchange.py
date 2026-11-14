"""Small ordered-RGB transfer classifier shared by training and inference.

No currency, identity, audio or guilt classifier. Runtime never downloads.
"""
import cv2
import numpy as np
import torch
from torch import nn
from torchvision.models import mobilenet_v3_small

CONTRACT = {'architecture': 'mobilenet-v3-small-gru-v1', 'frames': 8, 'size': 160,
            'max_window_seconds': 2.0, 'sample_hz': 4.0, 'feature_dim': 576,
            'mean': [.485, .456, .406], 'std': [.229, .224, .225],
            'resize': 'letterbox-rgb-linear', 'padding': 114,
            'labels': ['no_observed_transfer', 'possible_object_transfer']}


def preprocess(rgb, contract=CONTRACT):
    if rgb.ndim != 3 or rgb.shape[2] != 3 or rgb.dtype != np.uint8 or not rgb.size:
        raise ValueError('Expected a nonempty RGB uint8 frame')
    height, width = rgb.shape[:2]
    size = contract['size']
    scale = size / max(height, width)
    w, h = max(1, round(width * scale)), max(1, round(height * scale))
    resized = cv2.resize(rgb, (w, h), interpolation=cv2.INTER_LINEAR)
    padded = np.full((size, size, 3), contract['padding'], dtype=np.uint8)
    x, y = (size - w) // 2, (size - h) // 2
    padded[y:y+h, x:x+w] = resized
    normalized = (padded.astype(np.float32) / 255 - np.array(contract['mean'], np.float32)) / np.array(contract['std'], np.float32)
    return torch.from_numpy(np.ascontiguousarray(normalized.transpose(2, 0, 1)))


class Encoder(nn.Module):
    def __init__(self, weights=None):
        super().__init__()
        backbone = mobilenet_v3_small(weights=weights)
        self.features = backbone.features
        self.pool = nn.AdaptiveAvgPool2d(1)

    def forward(self, frames):
        return self.pool(self.features(frames)).flatten(1)


class TemporalHead(nn.Module):
    def __init__(self, feature_dim=576):
        super().__init__()
        self.feature_dim = feature_dim
        self.norm = nn.LayerNorm(feature_dim)
        self.project = nn.Sequential(nn.Linear(feature_dim, 64), nn.ReLU(), nn.Dropout(.25))
        self.gru = nn.GRU(64, 48, batch_first=True)
        self.classifier = nn.Linear(96, 2)

    def forward(self, features):
        if features.ndim != 3 or features.shape[1:] != (8, self.feature_dim):
            raise ValueError('Expected eight ordered frame embeddings')
        values, _ = self.gru(self.project(self.norm(features)))
        return self.classifier(torch.cat([values[:, -1], values.mean(1)], 1))
