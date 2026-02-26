#!/usr/bin/env python3
"""
Generate promotional App Store / Google Play screenshots for TechTrust Auto Solutions.
Creates 1290x2796 screenshots (iPhone 6.7") with marketing text and mock UI.
"""
from PIL import Image, ImageDraw, ImageFont
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(BASE, "store-screenshots")
os.makedirs(OUT_DIR, exist_ok=True)

# Screen dimensions (iPhone 6.7")
W, H = 1290, 2796

# Brand colors
NAVY = (27, 58, 107)
BLUE = (43, 94, 167)
WHITE = (255, 255, 255)
LIGHT_GRAY = (245, 247, 250)
DARK_TEXT = (30, 30, 30)
RED = (192, 57, 43)
GREEN = (39, 174, 96)
GOLD = (243, 156, 18)

def get_font(size, bold=False):
    """Try system fonts, fallback to default."""
    font_paths = [
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/SFNSDisplay.ttf",
        "/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
    ]
    for fp in font_paths:
        try:
            return ImageFont.truetype(fp, size)
        except:
            continue
    return ImageFont.load_default()

def draw_rounded_rect(draw, xy, fill, radius=30):
    x0, y0, x1, y1 = xy
    draw.rounded_rectangle(xy, radius=radius, fill=fill)

def draw_status_bar(draw, y=60):
    """Draw a mock iOS status bar."""
    font_small = get_font(28)
    draw.text((60, y), "9:41", fill=WHITE, font=font_small)
    # Battery icon area
    draw.rounded_rectangle((1140, y+2, 1220, y+24), radius=4, fill=WHITE)

def draw_phone_frame(img, screen_area):
    """Draw subtle phone frame around screen area."""
    draw = ImageDraw.Draw(img)
    x0, y0, x1, y1 = screen_area
    # Outer frame
    draw.rounded_rectangle((x0-4, y0-4, x1+4, y1+4), radius=44, outline=(180,180,180), width=3)

def create_screenshot_1():
    """Screenshot 1: Find Trusted Auto Services"""
    img = Image.new("RGB", (W, H), NAVY)
    draw = ImageDraw.Draw(img)
    
    # Header text
    title_font = get_font(72, bold=True)
    sub_font = get_font(42)
    
    draw.text((W//2, 200), "Find Trusted", fill=WHITE, font=title_font, anchor="mt")
    draw.text((W//2, 290), "Auto Services", fill=WHITE, font=title_font, anchor="mt")
    draw.text((W//2, 400), "Near You", fill=GOLD, font=title_font, anchor="mt")
    
    draw.text((W//2, 530), "Verified mechanics & shops at your fingertips", fill=(200, 210, 230), font=sub_font, anchor="mt")
    
    # Mock phone screen
    phone_x, phone_y = 145, 650
    phone_w, phone_h = 1000, 1900
    
    # Phone body
    draw.rounded_rectangle((phone_x, phone_y, phone_x+phone_w, phone_y+phone_h), radius=40, fill=WHITE)
    
    # Mock landing page content
    # Top bar
    draw.rounded_rectangle((phone_x+20, phone_y+20, phone_x+phone_w-20, phone_y+120), radius=20, fill=BLUE)
    small_font = get_font(32)
    draw.text((phone_x+phone_w//2, phone_y+70), "TechTrust Auto Solutions", fill=WHITE, font=small_font, anchor="mm")
    
    # Search area
    draw.rounded_rectangle((phone_x+40, phone_y+150, phone_x+phone_w-40, phone_y+320), radius=20, fill=LIGHT_GRAY)
    draw.text((phone_x+80, phone_y+180), "🔍 Search by service...", fill=(150,150,150), font=get_font(28))
    
    # Dropdown filters
    filter_y = phone_y + 350
    for i, label in enumerate(["State", "City", "Service Type"]):
        x = phone_x + 40 + i * 310
        draw.rounded_rectangle((x, filter_y, x+290, filter_y+60), radius=12, fill=(230,235,245))
        draw.text((x+20, filter_y+18), label, fill=(100,100,120), font=get_font(24))
    
    # Featured services cards
    card_y = filter_y + 100
    for i, (service, color) in enumerate([("Oil Change", BLUE), ("Brake Service", RED), ("A/C Repair", GREEN)]):
        cy = card_y + i * 180
        draw.rounded_rectangle((phone_x+40, cy, phone_x+phone_w-40, cy+160), radius=16, fill=WHITE, outline=(220,220,220))
        draw.rounded_rectangle((phone_x+40, cy, phone_x+140, cy+160), radius=16, fill=color)
        draw.text((phone_x+160, cy+30), service, fill=DARK_TEXT, font=get_font(30, bold=True))
        draw.text((phone_x+160, cy+75), "Get quotes from verified shops", fill=(120,120,140), font=get_font(22))
        draw.text((phone_x+160, cy+110), "⭐ 4.8  •  12 providers nearby", fill=(100,100,120), font=get_font(20))
    
    # Benefits row
    ben_y = card_y + 570
    for i, (icon, text) in enumerate([("🛡️", "Verified"), ("💰", "Fair Price"), ("⏱️", "Fast"), ("⭐", "Rated")]):
        bx = phone_x + 50 + i * 235
        draw.rounded_rectangle((bx, ben_y, bx+210, ben_y+100), radius=12, fill=(240,245,255))
        draw.text((bx+105, ben_y+30), icon, fill=DARK_TEXT, font=get_font(28), anchor="mt")
        draw.text((bx+105, ben_y+70), text, fill=BLUE, font=get_font(20), anchor="mt")
    
    # Bottom CTA
    draw.text((W//2, 2620), "Download Free on iOS & Android", fill=(180, 190, 210), font=get_font(32), anchor="mt")
    
    img.save(os.path.join(OUT_DIR, "01_find_services.png"), "PNG")
    print("Created: 01_find_services.png")

def create_screenshot_2():
    """Screenshot 2: Discover on Map"""
    img = Image.new("RGB", (W, H), BLUE)
    draw = ImageDraw.Draw(img)
    
    title_font = get_font(72, bold=True)
    sub_font = get_font(42)
    
    draw.text((W//2, 200), "Discover Services", fill=WHITE, font=title_font, anchor="mt")
    draw.text((W//2, 290), "On the Map", fill=GOLD, font=title_font, anchor="mt")
    draw.text((W//2, 400), "Find auto shops, car washes & more nearby", fill=(200, 210, 230), font=sub_font, anchor="mt")
    
    # Phone screen
    phone_x, phone_y = 145, 580
    phone_w, phone_h = 1000, 1950
    draw.rounded_rectangle((phone_x, phone_y, phone_x+phone_w, phone_y+phone_h), radius=40, fill=WHITE)
    
    # Map area (green/beige tones like Google Maps)
    map_h = 1000
    draw.rounded_rectangle((phone_x+10, phone_y+10, phone_x+phone_w-10, phone_y+map_h), radius=30, fill=(234, 239, 220))
    
    # Roads
    draw.line([(phone_x+100, phone_y+300), (phone_x+900, phone_y+300)], fill=(255,255,255), width=8)
    draw.line([(phone_x+100, phone_y+600), (phone_x+900, phone_y+600)], fill=(255,255,255), width=8)
    draw.line([(phone_x+300, phone_y+50), (phone_x+300, phone_y+map_h-50)], fill=(255,255,255), width=8)
    draw.line([(phone_x+700, phone_y+50), (phone_x+700, phone_y+map_h-50)], fill=(255,255,255), width=6)
    draw.line([(phone_x+500, phone_y+150), (phone_x+500, phone_y+map_h-100)], fill=(253,251,240), width=6)
    
    # Map pins
    pins = [(250, 250, BLUE, "Mechanic"), (500, 400, GREEN, "Express"), (750, 200, RED, "Body Shop"), 
            (400, 700, (155,89,182), "Full Svc"), (650, 550, GOLD, "Car Wash")]
    for px_off, py_off, color, _ in pins:
        cx, cy = phone_x + px_off, phone_y + py_off
        # Pin shape
        draw.ellipse((cx-20, cy-20, cx+20, cy+20), fill=color, outline=WHITE, width=3)
        draw.ellipse((cx-8, cy-8, cx+8, cy+8), fill=WHITE)
    
    # Search bar on map
    draw.rounded_rectangle((phone_x+60, phone_y+40, phone_x+phone_w-60, phone_y+100), radius=25, fill=WHITE, outline=(200,200,200))
    draw.text((phone_x+100, phone_y+58), "🔍 Search location...", fill=(150,150,150), font=get_font(26))
    
    # Filter chips
    chip_y = phone_y + map_h + 20
    for i, (label, col) in enumerate([("All", BLUE), ("Tunnel", BLUE), ("Express", GREEN), ("Self-Svc", GOLD), ("Hand", (255,105,180))]):
        cx = phone_x + 50 + i * 190
        draw.rounded_rectangle((cx, chip_y, cx+170, chip_y+50), radius=25, fill=col if i == 0 else (240,240,245))
        text_col = WHITE if i == 0 else col
        draw.text((cx+85, chip_y+25), label, fill=text_col, font=get_font(22), anchor="mm")
    
    # List cards below map
    list_y = chip_y + 80
    for i, (name, dist, rating) in enumerate([("Mike's Auto Repair", "0.8 mi", "4.9"), ("Express Lube & Tune", "1.2 mi", "4.7"), ("City Auto Body", "1.5 mi", "4.8")]):
        cy = list_y + i * 160
        draw.rounded_rectangle((phone_x+30, cy, phone_x+phone_w-30, cy+140), radius=16, fill=WHITE, outline=(230,230,235))
        # Avatar
        draw.ellipse((phone_x+50, cy+25, phone_x+130, cy+105), fill=BLUE)
        draw.text((phone_x+90, cy+65), name[0], fill=WHITE, font=get_font(36, bold=True), anchor="mm")
        # Text
        draw.text((phone_x+150, cy+30), name, fill=DARK_TEXT, font=get_font(26, bold=True))
        draw.text((phone_x+150, cy+70), f"⭐ {rating}  •  {dist}  •  Open Now", fill=(100,110,130), font=get_font(22))
        draw.text((phone_x+150, cy+105), "Oil Change, Brakes, Diagnostics", fill=(140,140,160), font=get_font(20))
    
    img.save(os.path.join(OUT_DIR, "02_map_discovery.png"), "PNG")
    print("Created: 02_map_discovery.png")

def create_screenshot_3():
    """Screenshot 3: Get Instant Quotes"""
    img = Image.new("RGB", (W, H), (39, 174, 96))  # Green
    draw = ImageDraw.Draw(img)
    
    title_font = get_font(72, bold=True)
    sub_font = get_font(42)
    
    draw.text((W//2, 200), "Get Instant", fill=WHITE, font=title_font, anchor="mt")
    draw.text((W//2, 290), "Quotes", fill=GOLD, font=title_font, anchor="mt")
    draw.text((W//2, 400), "Compare prices from multiple shops", fill=(200, 240, 220), font=sub_font, anchor="mt")
    
    # Phone
    phone_x, phone_y = 145, 560
    phone_w, phone_h = 1000, 1980
    draw.rounded_rectangle((phone_x, phone_y, phone_x+phone_w, phone_y+phone_h), radius=40, fill=WHITE)
    
    # Header
    draw.rounded_rectangle((phone_x+10, phone_y+10, phone_x+phone_w-10, phone_y+120), radius=30, fill=NAVY)
    draw.text((phone_x+phone_w//2, phone_y+65), "Service Request #1247", fill=WHITE, font=get_font(30), anchor="mm")
    
    # Progress steps
    step_y = phone_y + 150
    steps = ["Submitted", "Sent", "Quotes", "Accepted", "Scheduled"]
    for i, step in enumerate(steps):
        sx = phone_x + 60 + i * 185
        col = GREEN if i < 3 else (200,200,210)
        draw.ellipse((sx, step_y, sx+40, step_y+40), fill=col)
        if i < 3:
            draw.text((sx+20, step_y+20), "✓", fill=WHITE, font=get_font(22), anchor="mm")
        draw.text((sx+20, step_y+55), step, fill=(80,80,100) if i < 3 else (180,180,190), font=get_font(16), anchor="mt")
        if i < 4:
            draw.line([(sx+45, step_y+20), (sx+185, step_y+20)], fill=col, width=3)
    
    # Vehicle info
    vi_y = step_y + 110
    draw.rounded_rectangle((phone_x+40, vi_y, phone_x+phone_w-40, vi_y+100), radius=16, fill=(240,245,255))
    draw.text((phone_x+80, vi_y+20), "🚗  2022 Toyota Camry SE", fill=DARK_TEXT, font=get_font(28, bold=True))
    draw.text((phone_x+80, vi_y+60), "VIN: 4T1BK1FK...  •  Oil Change + Filter", fill=(100,110,130), font=get_font(22))
    
    # Quote cards
    quotes_y = vi_y + 130
    quotes = [
        ("Mike's Auto", "4.9", "$42", "$35", "$77", True),
        ("Quick Lube Pro", "4.7", "$38", "$30", "$68", False),
        ("City Auto Care", "4.8", "$45", "$40", "$85", False),
    ]
    for i, (name, rating, parts, labor, total, best) in enumerate(quotes):
        qy = quotes_y + i * 260
        border_col = GREEN if best else (220,220,230)
        draw.rounded_rectangle((phone_x+40, qy, phone_x+phone_w-40, qy+240), radius=16, fill=WHITE, outline=border_col, width=3 if best else 1)
        
        if best:
            draw.rounded_rectangle((phone_x+phone_w-230, qy+8, phone_x+phone_w-50, qy+42), radius=12, fill=GREEN)
            draw.text((phone_x+phone_w-140, qy+25), "Best Value", fill=WHITE, font=get_font(20), anchor="mm")
        
        # Provider info
        draw.ellipse((phone_x+60, qy+20, phone_x+115, qy+75), fill=BLUE)
        draw.text((phone_x+88, qy+47), name[0], fill=WHITE, font=get_font(26), anchor="mm")
        draw.text((phone_x+130, qy+28), name, fill=DARK_TEXT, font=get_font(26, bold=True))
        draw.text((phone_x+130, qy+60), f"⭐ {rating}  •  2.3 mi  •  Verified ✓", fill=(100,110,130), font=get_font(20))
        
        # Price breakdown
        draw.line([(phone_x+60, qy+95), (phone_x+phone_w-60, qy+95)], fill=(240,240,245), width=2)
        draw.text((phone_x+80, qy+115), "Parts:", fill=(100,100,120), font=get_font(22))
        draw.text((phone_x+280, qy+115), parts, fill=DARK_TEXT, font=get_font(22, bold=True))
        draw.text((phone_x+450, qy+115), "Labor:", fill=(100,100,120), font=get_font(22))
        draw.text((phone_x+650, qy+115), labor, fill=DARK_TEXT, font=get_font(22, bold=True))
        
        # Total + buttons
        draw.text((phone_x+80, qy+160), "Total:", fill=(80,80,100), font=get_font(28))
        draw.text((phone_x+200, qy+155), total, fill=GREEN if best else NAVY, font=get_font(36, bold=True))
        
        # Accept button
        btn_col = GREEN if best else BLUE
        draw.rounded_rectangle((phone_x+550, qy+150, phone_x+phone_w-60, qy+200), radius=12, fill=btn_col)
        draw.text((phone_x + 550 + (phone_w-60-550)//2, qy+175), "Accept", fill=WHITE, font=get_font(24), anchor="mm")
    
    # Bottom hint
    qy_end = quotes_y + 3 * 260
    draw.text((phone_x+phone_w//2, qy_end + 20), "3 of 5 quotes received", fill=(140,140,160), font=get_font(22), anchor="mt")
    
    img.save(os.path.join(OUT_DIR, "03_instant_quotes.png"), "PNG")
    print("Created: 03_instant_quotes.png")

def create_screenshot_4():
    """Screenshot 4: Track Your Services"""
    img = Image.new("RGB", (W, H), (155, 89, 182))  # Purple
    draw = ImageDraw.Draw(img)
    
    title_font = get_font(72, bold=True)
    sub_font = get_font(42)
    
    draw.text((W//2, 200), "Track Your", fill=WHITE, font=title_font, anchor="mt")
    draw.text((W//2, 290), "Services", fill=GOLD, font=title_font, anchor="mt")
    draw.text((W//2, 400), "Dashboard with real-time updates", fill=(220, 200, 240), font=sub_font, anchor="mt")
    
    # Phone
    phone_x, phone_y = 145, 560
    phone_w, phone_h = 1000, 1980
    draw.rounded_rectangle((phone_x, phone_y, phone_x+phone_w, phone_y+phone_h), radius=40, fill=(248,249,252))
    
    # Top bar
    draw.rounded_rectangle((phone_x+10, phone_y+10, phone_x+phone_w-10, phone_y+180), radius=30, fill=NAVY)
    draw.text((phone_x+80, phone_y+45), "Good morning, John! 👋", fill=WHITE, font=get_font(30, bold=True))
    draw.text((phone_x+80, phone_y+90), "Here's your dashboard overview", fill=(180,190,220), font=get_font(22))
    # Notification bell
    draw.ellipse((phone_x+phone_w-110, phone_y+40, phone_x+phone_w-50, phone_y+100), fill=(255,255,255,30))
    draw.text((phone_x+phone_w-80, phone_y+70), "🔔", fill=WHITE, font=get_font(30), anchor="mm")
    # Wallet
    draw.rounded_rectangle((phone_x+60, phone_y+130, phone_x+350, phone_y+165), radius=10, fill=GREEN)
    draw.text((phone_x+80, phone_y+137), "💰 Wallet: $150.00", fill=WHITE, font=get_font(20))
    
    # Stat cards
    stats_y = phone_y + 210
    stats = [("2", "Active", BLUE), ("3", "Pending\nQuotes", GOLD), ("12", "Completed", GREEN), ("$1,240", "Total\nSpent", (155,89,182))]
    for i, (val, label, col) in enumerate(stats):
        row = i // 2
        col_idx = i % 2
        sx = phone_x + 40 + col_idx * 475
        sy = stats_y + row * 175
        draw.rounded_rectangle((sx, sy, sx+450, sy+155), radius=16, fill=WHITE)
        draw.rounded_rectangle((sx, sy, sx+8, sy+155), radius=4, fill=col)
        draw.text((sx+40, sy+30), val, fill=col, font=get_font(42, bold=True))
        draw.text((sx+40, sy+85), label.replace("\n", " "), fill=(100,110,130), font=get_font(22))
    
    # Recent services
    recent_y = stats_y + 380
    draw.text((phone_x+60, recent_y), "Recent Services", fill=DARK_TEXT, font=get_font(28, bold=True))
    
    services = [
        ("Oil Change", "Toyota Camry", "In Progress", (52, 152, 219), "🔧"),
        ("Brake Pads", "Honda Civic", "Quoted", GOLD, "🛞"),
        ("A/C Service", "Ford F-150", "Completed", GREEN, "❄️"),
        ("Diagnostics", "BMW 328i", "Scheduled", (155,89,182), "🔍"),
    ]
    for i, (service, vehicle, status, col, emoji) in enumerate(services):
        sy = recent_y + 50 + i * 155
        draw.rounded_rectangle((phone_x+40, sy, phone_x+phone_w-40, sy+135), radius=16, fill=WHITE)
        # Emoji circle
        draw.ellipse((phone_x+60, sy+20, phone_x+130, sy+90), fill=(240,245,255))
        draw.text((phone_x+95, sy+55), emoji, fill=DARK_TEXT, font=get_font(28), anchor="mm")
        # Text
        draw.text((phone_x+150, sy+25), service, fill=DARK_TEXT, font=get_font(26, bold=True))
        draw.text((phone_x+150, sy+60), vehicle, fill=(120,120,140), font=get_font(22))
        # Status badge
        draw.rounded_rectangle((phone_x+150, sy+95, phone_x+150+len(status)*16, sy+125), radius=10, fill=col)
        draw.text((phone_x+150 + len(status)*8, sy+110), status, fill=WHITE, font=get_font(18), anchor="mm")
        # Date
        draw.text((phone_x+phone_w-80, sy+30), "Today", fill=(160,160,180), font=get_font(18))
    
    # Bottom tab bar
    tab_y = phone_y + phone_h - 100
    draw.rounded_rectangle((phone_x+10, tab_y, phone_x+phone_w-10, phone_y+phone_h-10), radius=0, fill=WHITE)
    tabs = ["🏠", "🔍", "➕", "💬", "👤"]
    for i, tab in enumerate(tabs):
        tx = phone_x + 100 + i * 185
        draw.text((tx, tab_y+35), tab, fill=NAVY if i == 0 else (180,180,190), font=get_font(30), anchor="mm")
    
    img.save(os.path.join(OUT_DIR, "04_dashboard.png"), "PNG")
    print("Created: 04_dashboard.png")

def create_screenshot_5():
    """Screenshot 5: Chat with Mechanics"""
    img = Image.new("RGB", (W, H), RED)
    draw = ImageDraw.Draw(img)
    
    title_font = get_font(72, bold=True)
    sub_font = get_font(42)
    
    draw.text((W//2, 200), "Chat Directly", fill=WHITE, font=title_font, anchor="mt")
    draw.text((W//2, 290), "with Your Mechanic", fill=GOLD, font=title_font, anchor="mt")
    draw.text((W//2, 400), "Real-time messaging & updates", fill=(255, 200, 200), font=sub_font, anchor="mt")
    
    # Phone
    phone_x, phone_y = 145, 560
    phone_w, phone_h = 1000, 1980
    draw.rounded_rectangle((phone_x, phone_y, phone_x+phone_w, phone_y+phone_h), radius=40, fill=WHITE)
    
    # Chat header
    draw.rounded_rectangle((phone_x+10, phone_y+10, phone_x+phone_w-10, phone_y+130), radius=30, fill=NAVY)
    draw.ellipse((phone_x+40, phone_y+30, phone_x+110, phone_y+100), fill=BLUE)
    draw.text((phone_x+75, phone_y+65), "M", fill=WHITE, font=get_font(30), anchor="mm")
    draw.text((phone_x+130, phone_y+45), "Mike's Auto Repair", fill=WHITE, font=get_font(26, bold=True))
    draw.text((phone_x+130, phone_y+80), "🟢 Online  •  ⭐ 4.9  •  Verified ✓", fill=(180,200,230), font=get_font(20))
    
    # Chat messages
    messages = [
        (True, "Hi! I saw your quote for the oil change. Can you also check the air filter?", "9:15 AM"),
        (False, "Of course! I'll add an air filter inspection to the service. No extra charge for the check.", "9:16 AM"),
        (True, "Great! How long will it take?", "9:17 AM"),
        (False, "About 45 minutes total. I have a slot open at 2 PM today. Want to book it?", "9:18 AM"),
        (True, "Perfect! 2 PM works for me. 👍", "9:19 AM"),
        (False, "Awesome! I've scheduled you for 2 PM. See you then! I'll send a reminder 30 min before.", "9:20 AM"),
        (True, "Thanks Mike! See you later.", "9:21 AM"),
    ]
    
    msg_y = phone_y + 160
    for is_user, text, time in messages:
        # Word wrap simulation
        max_chars = 40
        lines = []
        words = text.split()
        current_line = ""
        for word in words:
            if len(current_line + " " + word) > max_chars:
                lines.append(current_line)
                current_line = word
            else:
                current_line = (current_line + " " + word).strip()
        if current_line:
            lines.append(current_line)
        
        bubble_h = 30 + len(lines) * 34 + 25
        
        if is_user:
            bx = phone_x + phone_w - 60 - 600
            draw.rounded_rectangle((bx, msg_y, phone_x+phone_w-60, msg_y+bubble_h), radius=20, fill=BLUE)
            for j, line in enumerate(lines):
                draw.text((bx+20, msg_y+15+j*34), line, fill=WHITE, font=get_font(24))
            draw.text((phone_x+phone_w-80, msg_y+bubble_h-25), time, fill=(180,200,230), font=get_font(16))
        else:
            bx = phone_x + 60
            draw.rounded_rectangle((bx, msg_y, bx+650, msg_y+bubble_h), radius=20, fill=(240,242,248))
            for j, line in enumerate(lines):
                draw.text((bx+20, msg_y+15+j*34), line, fill=DARK_TEXT, font=get_font(24))
            draw.text((bx+600, msg_y+bubble_h-25), time, fill=(150,150,170), font=get_font(16))
        
        msg_y += bubble_h + 20
    
    # Input bar
    input_y = phone_y + phone_h - 120
    draw.rounded_rectangle((phone_x+30, input_y, phone_x+phone_w-30, input_y+80), radius=30, fill=(245,246,250))
    draw.text((phone_x+80, input_y+28), "Type a message...", fill=(160,160,180), font=get_font(24))
    draw.ellipse((phone_x+phone_w-110, input_y+10, phone_x+phone_w-50, input_y+70), fill=BLUE)
    draw.text((phone_x+phone_w-80, input_y+40), "➤", fill=WHITE, font=get_font(28), anchor="mm")
    
    img.save(os.path.join(OUT_DIR, "05_chat.png"), "PNG")
    print("Created: 05_chat.png")

def create_screenshot_6():
    """Screenshot 6: Secure Payments"""
    img = Image.new("RGB", (W, H), (44, 62, 80))  # Dark blue-gray
    draw = ImageDraw.Draw(img)
    
    title_font = get_font(72, bold=True)
    sub_font = get_font(42)
    
    draw.text((W//2, 200), "Secure Payments", fill=WHITE, font=title_font, anchor="mt")
    draw.text((W//2, 290), "& VIN Decoder", fill=GOLD, font=title_font, anchor="mt")
    draw.text((W//2, 400), "Pay safely & decode your vehicle instantly", fill=(180, 195, 215), font=sub_font, anchor="mt")
    
    # Phone
    phone_x, phone_y = 145, 560
    phone_w, phone_h = 1000, 1980
    draw.rounded_rectangle((phone_x, phone_y, phone_x+phone_w, phone_y+phone_h), radius=40, fill=WHITE)
    
    # VIN Decoder section
    draw.rounded_rectangle((phone_x+10, phone_y+10, phone_x+phone_w-10, phone_y+120), radius=30, fill=NAVY)
    draw.text((phone_x+phone_w//2, phone_y+65), "🔍 VIN Decoder & OE Parts", fill=WHITE, font=get_font(30), anchor="mm")
    
    # VIN input
    vin_y = phone_y + 150
    draw.rounded_rectangle((phone_x+40, vin_y, phone_x+phone_w-40, vin_y+80), radius=16, fill=(245,247,252), outline=BLUE, width=2)
    draw.text((phone_x+70, vin_y+28), "VIN: 4T1BK1FK5MU123456", fill=DARK_TEXT, font=get_font(26))
    
    # Decoded vehicle info
    dec_y = vin_y + 100
    draw.rounded_rectangle((phone_x+40, dec_y, phone_x+phone_w-40, dec_y+200), radius=16, fill=(240,255,240))
    draw.text((phone_x+70, dec_y+20), "✅ Vehicle Decoded", fill=GREEN, font=get_font(26, bold=True))
    info_items = [("Make:", "Toyota"), ("Model:", "Camry SE"), ("Year:", "2022"), ("Engine:", "2.5L 4-Cyl")]
    for i, (k, v) in enumerate(info_items):
        draw.text((phone_x+70, dec_y+60+i*35), k, fill=(100,110,130), font=get_font(22))
        draw.text((phone_x+250, dec_y+60+i*35), v, fill=DARK_TEXT, font=get_font(22, bold=True))
    
    # OE Parts section
    oe_y = dec_y + 230
    draw.text((phone_x+60, oe_y), "OE Part Numbers", fill=DARK_TEXT, font=get_font(28, bold=True))
    parts = [("Oil Filter", "04152-YZZA1"), ("Air Filter", "17801-YZZ04"), ("Brake Pads (Front)", "04465-06200"), ("Cabin Filter", "87139-YZZ10")]
    for i, (part, num) in enumerate(parts):
        py = oe_y + 50 + i * 80
        draw.rounded_rectangle((phone_x+40, py, phone_x+phone_w-40, py+65), radius=12, fill=(248,249,252), outline=(230,230,240))
        draw.text((phone_x+70, py+10), part, fill=DARK_TEXT, font=get_font(22))
        draw.text((phone_x+70, py+38), num, fill=BLUE, font=get_font(20, bold=True))
        # Copy icon
        draw.text((phone_x+phone_w-100, py+20), "📋", fill=(150,150,170), font=get_font(24))
    
    # Payment section
    pay_y = oe_y + 400
    draw.line([(phone_x+60, pay_y), (phone_x+phone_w-60, pay_y)], fill=(230,230,240), width=2)
    draw.text((phone_x+60, pay_y+20), "💳 Payment Summary", fill=DARK_TEXT, font=get_font(28, bold=True))
    
    draw.rounded_rectangle((phone_x+40, pay_y+70, phone_x+phone_w-40, pay_y+280), radius=16, fill=(248,249,252))
    pay_items = [("Oil Change Service", "$42.00"), ("Parts (OE Filter)", "$18.50"), ("Labor", "$35.00"), ("Tax", "$7.64")]
    for i, (item, price) in enumerate(pay_items):
        iy = pay_y + 90 + i * 40
        draw.text((phone_x+70, iy), item, fill=(80,80,100), font=get_font(22))
        draw.text((phone_x+phone_w-120, iy), price, fill=DARK_TEXT, font=get_font(22))
    
    # Total
    draw.line([(phone_x+60, pay_y+260), (phone_x+phone_w-60, pay_y+260)], fill=(200,200,210), width=2)
    draw.text((phone_x+70, pay_y+275), "Total", fill=DARK_TEXT, font=get_font(28, bold=True))
    draw.text((phone_x+phone_w-120, pay_y+275), "$103.14", fill=GREEN, font=get_font(28, bold=True))
    
    # Pay button
    draw.rounded_rectangle((phone_x+60, pay_y+325, phone_x+phone_w-60, pay_y+395), radius=16, fill=GREEN)
    draw.text((phone_x+phone_w//2, pay_y+360), "🔒 Pay Securely with Stripe", fill=WHITE, font=get_font(26), anchor="mm")
    
    # Trust badges
    badge_y = pay_y + 420
    for i, badge in enumerate(["🔐 256-bit SSL", "🛡️ Verified Providers", "💯 Guaranteed"]):
        bx = phone_x + 50 + i * 320
        draw.text((bx, badge_y), badge, fill=(120,130,150), font=get_font(20))
    
    img.save(os.path.join(OUT_DIR, "06_payments_vin.png"), "PNG")
    print("Created: 06_payments_vin.png")

# Generate all screenshots
print("Generating App Store screenshots (1290x2796)...")
create_screenshot_1()
create_screenshot_2()
create_screenshot_3()
create_screenshot_4()
create_screenshot_5()
create_screenshot_6()
print(f"\nAll screenshots saved to: {OUT_DIR}")
print("These are ready for iPhone 6.7\" display. Apple will auto-scale for 6.5\".")
