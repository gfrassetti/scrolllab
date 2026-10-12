"""
Paint mask + fixed metal/roughness for an AI-generated car texture atlas.

The generator bakes the paint as a metallic surface (metal ~0.7): under a dark
showroom it renders almost black. Real car paint is a dielectric base under a
clear coat. This finds the paint (the biggest colour cluster that is not
near-black), writes a soft mask for the clear coat and a new metal/roughness map:
paint -> metal 0.12 / rough 0.38 (the coat brings the gloss), tyres and black
trim -> rough 0.9 / metal 0, the rest untouched.

usage: python paintmask.py <base.png> <mr.png> <out_prefix> <r,g,b paint hint> <lum_lo> <lum_hi> [chroma_tol]
"""
import sys
import numpy as np
from PIL import Image

base_p, mr_p, out = sys.argv[1:4]
base = np.asarray(Image.open(base_p).convert('RGB')).astype(np.float32) / 255.0
mr = np.asarray(Image.open(mr_p).convert('RGB')).astype(np.float32) / 255.0
H, W, _ = base.shape

lum = base @ np.array([0.2126, 0.7152, 0.0722], np.float32)
mx, mn = base.max(-1), base.min(-1)
sat = (mx - mn) / np.maximum(mx, 1e-4)

# Paint = texels whose chromaticity is close to the paint hint and whose
# luminance is in the paint's range (shading baked by the generator spans a lot).
hint = np.array([float(x) for x in sys.argv[4].split(',')], np.float32)
lum_lo, lum_hi = float(sys.argv[5]), float(sys.argv[6])
tol = float(sys.argv[7]) if len(sys.argv) > 7 else 0.05
chroma = base / np.maximum(base.sum(-1, keepdims=True), 1e-4)
hint_c = hint / hint.sum()
cd = np.sqrt(((chroma - hint_c) ** 2).sum(-1))
c_ok = np.clip(1.0 - (cd - tol * 0.5) / tol, 0.0, 1.0)
l_ok = np.clip((lum - lum_lo) / 0.03, 0, 1) * np.clip((lum_hi - lum) / 0.08, 0, 1)
mask = c_ok * l_ok
print('hint chroma', np.round(hint_c, 3).tolist())
tyre = np.clip((0.07 - lum) / 0.04, 0, 1) * np.clip((0.25 - sat) / 0.15, 0, 1) * (1 - mask)

rough = mr[..., 1]
metal = mr[..., 2]
rough_n = rough * (1 - mask) + 0.38 * mask
metal_n = metal * (1 - mask) + 0.12 * mask
rough_n = rough_n * (1 - tyre) + 0.9 * tyre
metal_n = metal_n * (1 - tyre)
new_mr = np.stack([mask, rough_n, metal_n], -1)  # R = clear coat (glTF reads it from R), G = roughness, B = metal

Image.fromarray((new_mr * 255).astype(np.uint8)).save(out + '_mr.png')
Image.fromarray((mask * 255).astype(np.uint8)).save(out + '_coat.png')
print('paint coverage', round(float(mask[lum > 0.035].mean()), 3), 'tyre coverage', round(float(tyre[lum > 0.0].mean()), 3))
