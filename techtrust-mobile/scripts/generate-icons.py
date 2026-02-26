#!/usr/bin/env python3
from PIL import Image
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Load the blue icon (best square candidate: 203x197)
icon = Image.open(os.path.join(BASE, "assets/images/logo_icon_blue.png")).convert("RGBA")
print(f"Original: {icon.size}")

# === iOS App Store Icon (1024x1024, no transparency) ===
ios_icon = Image.new("RGBA", (1024, 1024), (255, 255, 255, 255))
target_size = 820
ratio = min(target_size / icon.width, target_size / icon.height)
new_w = int(icon.width * ratio)
new_h = int(icon.height * ratio)
resized = icon.resize((new_w, new_h), Image.LANCZOS)
x = (1024 - new_w) // 2
y = (1024 - new_h) // 2
ios_icon.paste(resized, (x, y), resized)
ios_final = ios_icon.convert("RGB")
ios_final.save(os.path.join(BASE, "assets/icon.png"), "PNG")
print("Saved icon.png (1024x1024, no transparency)")

# === Android Adaptive Icon (1024x1024, transparent bg) ===
android_icon = Image.new("RGBA", (1024, 1024), (255, 255, 255, 0))
target_android = 680
ratio_a = min(target_android / icon.width, target_android / icon.height)
new_wa = int(icon.width * ratio_a)
new_ha = int(icon.height * ratio_a)
resized_a = icon.resize((new_wa, new_ha), Image.LANCZOS)
xa = (1024 - new_wa) // 2
ya = (1024 - new_ha) // 2
android_icon.paste(resized_a, (xa, ya), resized_a)
android_icon.save(os.path.join(BASE, "assets/adaptive-icon.png"), "PNG")
print("Saved adaptive-icon.png (1024x1024, transparent bg)")

# === Splash Icon (centered on white) ===
splash = Image.new("RGBA", (1284, 2778), (255, 255, 255, 255))
target_splash = 600
ratio_s = min(target_splash / icon.width, target_splash / icon.height)
new_ws = int(icon.width * ratio_s)
new_hs = int(icon.height * ratio_s)
resized_s = icon.resize((new_ws, new_hs), Image.LANCZOS)
xs = (1284 - new_ws) // 2
ys = (2778 - new_hs) // 2
splash.paste(resized_s, (xs, ys), resized_s)
splash_final = splash.convert("RGB")
splash_final.save(os.path.join(BASE, "assets/splash-icon.png"), "PNG")
print("Saved splash-icon.png (1284x2778)")

print("Done!")
