#!/usr/bin/env python3
"""
Generate Google Play Featured Graphic (1024x500px)
Uses the TechTrust logo + tagline + app screenshots.
No prohibited words: no "best", "free", "top", "#1", "promotions", etc.
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_PATH = os.path.join(BASE_DIR, "store-screenshots", "featured_graphic_1024x500.png")

# Brand colors
DARK_NAVY = (18, 32, 64)       # #122040
MEDIUM_BLUE = (30, 58, 110)    # #1e3a6e
ACCENT_BLUE = (45, 100, 180)   # #2d64b4
WHITE = (255, 255, 255)
LIGHT_GRAY = (200, 210, 225)

WIDTH, HEIGHT = 1024, 500


def create_gradient(width, height, color_start, color_end):
    """Create a horizontal gradient background."""
    img = Image.new("RGB", (width, height))
    draw = ImageDraw.Draw(img)
    for x in range(width):
        ratio = x / width
        r = int(color_start[0] + (color_end[0] - color_start[0]) * ratio)
        g = int(color_start[1] + (color_end[1] - color_start[1]) * ratio)
        b = int(color_start[2] + (color_end[2] - color_start[2]) * ratio)
        draw.line([(x, 0), (x, height)], fill=(r, g, b))
    return img


def get_font(size, bold=False):
    """Try to load a nice font, fall back to default."""
    font_paths = [
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/SFNSDisplay.ttf",
        "/System/Library/Fonts/SFCompact.ttf",
        "/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
    ]
    for path in font_paths:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def add_phone_mockup(canvas, screenshot_path, x, y, phone_height):
    """Add a screenshot in a phone-like frame."""
    if not os.path.exists(screenshot_path):
        return

    screenshot = Image.open(screenshot_path).convert("RGBA")

    # Calculate dimensions for the phone
    aspect = screenshot.width / screenshot.height
    screen_h = int(phone_height * 0.88)
    screen_w = int(screen_h * aspect)
    phone_w = screen_w + 16
    phone_h = phone_height

    # Create phone frame
    phone = Image.new("RGBA", (phone_w, phone_h), (0, 0, 0, 0))
    phone_draw = ImageDraw.Draw(phone)

    # Phone body (rounded rectangle)
    phone_draw.rounded_rectangle(
        [0, 0, phone_w - 1, phone_h - 1],
        radius=18,
        fill=(20, 20, 25, 255),
        outline=(60, 60, 70, 255),
        width=2,
    )

    # Screen area
    screen_x = 8
    screen_y = int(phone_h * 0.06)
    resized = screenshot.resize((screen_w, screen_h), Image.LANCZOS)
    phone.paste(resized, (screen_x, screen_y))

    # Add subtle shadow
    shadow = Image.new("RGBA", (phone_w + 20, phone_h + 20), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle(
        [10, 10, phone_w + 9, phone_h + 9],
        radius=18,
        fill=(0, 0, 0, 80),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(8))

    # Composite shadow then phone
    canvas.paste(shadow, (x - 10, y - 5), shadow)
    canvas.paste(phone, (x, y), phone)

    return phone_w


def main():
    print("Generating Featured Graphic (1024x500)...")

    # 1. Create gradient background
    canvas = create_gradient(WIDTH, HEIGHT, DARK_NAVY, MEDIUM_BLUE).convert("RGBA")

    # 2. Add subtle decorative elements
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)

    # Subtle circles for visual interest
    overlay_draw.ellipse([WIDTH - 350, -100, WIDTH + 100, 350], fill=(255, 255, 255, 8))
    overlay_draw.ellipse([WIDTH - 250, 150, WIDTH + 50, 450], fill=(255, 255, 255, 5))
    overlay_draw.ellipse([-150, 200, 200, 550], fill=(255, 255, 255, 5))
    canvas = Image.alpha_composite(canvas, overlay)

    # 3. Add logo
    logo_path = os.path.join(BASE_DIR, "assets", "images", "logo_icon_blue.png")
    if os.path.exists(logo_path):
        logo = Image.open(logo_path).convert("RGBA")
        logo_size = 80
        logo = logo.resize((logo_size, logo_size), Image.LANCZOS)
        canvas.paste(logo, (60, 60), logo)

    # 4. Add text
    draw = ImageDraw.Draw(canvas)

    # Company name
    font_title = get_font(42, bold=True)
    font_subtitle = get_font(22)
    font_tagline = get_font(18)
    font_features = get_font(16)

    text_x = 155

    # "TechTrust" title
    draw.text((text_x, 65), "TechTrust", fill=WHITE, font=font_title)
    draw.text((text_x, 115), "AutoSolutions", fill=ACCENT_BLUE, font=font_subtitle)

    # Tagline
    draw.text((60, 170), "Driven by Technology. Trusted by You.", fill=LIGHT_GRAY, font=font_tagline)

    # Separator line
    draw.line([(60, 210), (380, 210)], fill=ACCENT_BLUE, width=2)

    # Feature bullets (safe language only)
    features = [
        "🔧  Auto Repair & Maintenance Services",
        "📋  Compare Quotes from Verified Providers",
        "💬  Chat Directly with Mechanics",
        "💳  Secure In-App Payments",
    ]

    y_pos = 230
    for feat in features:
        draw.text((60, y_pos), feat, fill=WHITE, font=font_features)
        y_pos += 32

    # Bottom tagline
    draw.text((60, 440), "Find Verified Mechanics Near You", fill=LIGHT_GRAY, font=font_tagline)

    # 5. Add phone mockups on the right side
    screenshots_dir = os.path.join(BASE_DIR, "store-screenshots")
    screenshots = [
        os.path.join(screenshots_dir, "01_find_services.png"),
        os.path.join(screenshots_dir, "03_instant_quotes.png"),
        os.path.join(screenshots_dir, "04_dashboard.png"),
    ]

    phone_height = 380
    start_x = 560
    spacing = 155

    for i, ss_path in enumerate(screenshots):
        if os.path.exists(ss_path):
            x = start_x + (i * spacing)
            y = 60 + (i * 15)  # Slight stagger
            add_phone_mockup(canvas, ss_path, x, y, phone_height)

    # 6. Save
    final = canvas.convert("RGB")
    final.save(OUTPUT_PATH, "PNG", quality=95)
    print(f"✅ Saved: {OUTPUT_PATH}")
    print(f"   Size: {WIDTH}x{HEIGHT}px")


if __name__ == "__main__":
    main()
