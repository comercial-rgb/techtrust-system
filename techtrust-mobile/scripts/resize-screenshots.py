#!/usr/bin/env python3
"""Resize screenshots for all App Store required sizes."""
from PIL import Image
import os

SRC = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "store-screenshots")

# All Apple required sizes
SIZES = {
    "6.7inch": (1290, 2796),   # iPhone 15 Pro Max, 14 Pro Max
    "6.5inch": (1284, 2778),   # iPhone 15 Plus, 14 Plus, 11 Pro Max
    "6.1inch": (1179, 2556),   # iPhone 15, 14
    "5.5inch": (1242, 2208),   # iPhone 8 Plus
    "ipad_13inch": (2064, 2752), # iPad Pro 13"
    "ipad_129inch": (2048, 2732), # iPad Pro 12.9"
}

for size_name, (w, h) in SIZES.items():
    out_dir = os.path.join(SRC, size_name)
    os.makedirs(out_dir, exist_ok=True)
    
    for fname in sorted(os.listdir(SRC)):
        if not fname.endswith(".png"):
            continue
        src_path = os.path.join(SRC, fname)
        if not os.path.isfile(src_path):
            continue
        
        img = Image.open(src_path)
        resized = img.resize((w, h), Image.LANCZOS)
        # Ensure RGB (no alpha) and save as JPEG too for compatibility
        resized_rgb = resized.convert("RGB")
        
        # Save PNG
        resized_rgb.save(os.path.join(out_dir, fname), "PNG")
        # Save JPEG too (some stores prefer JPEG)
        jpg_name = fname.replace(".png", ".jpg")
        resized_rgb.save(os.path.join(out_dir, jpg_name), "JPEG", quality=95)
    
    print(f"Created {size_name} ({w}x{h})")

print(f"\nAll sizes saved in subfolders of: {SRC}")
print("\nFor App Store Connect, use the folder matching the device size you see in the upload area.")
