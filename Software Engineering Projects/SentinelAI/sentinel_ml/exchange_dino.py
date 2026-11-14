"""Optional frozen DINOv2 Small RGB features; no runtime network access."""
import torch
from torch import nn

from .exchange import CONTRACT as MOBILE_CONTRACT, TemporalHead as BaseHead, preprocess as letterbox

CONTRACT = {**MOBILE_CONTRACT, 'architecture': 'dinov2-small-gru-v1',
            'size': 224, 'feature_dim': 768, 'embedding': 'cls-and-mean-patches'}


def preprocess(rgb):
    return letterbox(rgb, CONTRACT)


class Encoder(nn.Module):
    def __init__(self):
        super().__init__()
        from transformers import Dinov2Config, Dinov2Model
        # Explicit known architecture; no downloaded Python/config execution.
        config = Dinov2Config(hidden_size=384, num_hidden_layers=12,
                              num_attention_heads=6, image_size=518, patch_size=14,
                              mlp_ratio=4, layer_norm_eps=1e-6, layerscale_value=1.,
                              use_swiglu_ffn=False, qkv_bias=True)
        self.model = Dinov2Model(config)

    def forward(self, frames):
        tokens = self.model(pixel_values=frames).last_hidden_state
        return torch.cat([tokens[:, 0], tokens[:, 1:].mean(1)], dim=1)


class TemporalHead(BaseHead):
    def __init__(self):
        super().__init__(feature_dim=CONTRACT['feature_dim'])
