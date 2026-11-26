"""
Marcely SemiJoias — Precision Bento Grid RGBA Cutout & Visual Audit Contact Sheet Generator

Generates 3 decontaminated RGBA transparent cutouts from real studio white-bg product photos:
  - site/assets/img/bento-brincos-cutout.png   (Argolas Croissant Oval Crystal)
  - site/assets/img/bento-colares-cutout.png   (Choker Triade Trevo Flora 18k)
  - site/assets/img/bento-pulseiras-cutout.png (Pulseira Cordao Baiano Torcido 18k)

And builds the unified visual audit proof sheet:
  - scratch/marcely_assets_audit.png
    showing the 4 Blender 3D ring renders + all 5 Bento cutouts composited over the exact
    5 Apple Bento Grid colors (#1F1915, #121214, #12291E, #EAE3D5, #0E1A2E).
"""

import collections
import os
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

PROJECT_ROOT = r"C:\Users\stdma\projetos\Marcely - SemiJoias"
PRODUCTS_DIR = os.path.join(PROJECT_ROOT, "site", "assets", "products")
IMG_DIR = os.path.join(PROJECT_ROOT, "site", "assets", "img")
RENDERS_DIR = os.path.join(PROJECT_ROOT, "blender", "renders")
SCRATCH_DIR = r"C:\Users\stdma\.gemini\antigravity-cli\brain\464f3836-51bf-4907-a7b3-4da40817f148\scratch"

os.makedirs(IMG_DIR, exist_ok=True)
os.makedirs(SCRATCH_DIR, exist_ok=True)

BENTO_SOURCES = {
    "bento-brincos-cutout.png": {
        "src": os.path.join(PRODUCTS_DIR, "item_ebfbd1db1ad54b988583f7e8d90cad4e.jpg"),
        "label": "Brincos — Argolas Croissant Oval Crystal",
        "bg_luma": 178,        # strips pure white + soft warm beige cast shadows under gold hoops
        "bg_sat": 0.28,        # smooth table cast shadow has low gradient; gold ribbing has high gradient!
        "bg_warmth": 0.28,
        "use_grad_gate": True, # blocks flood-fill from leaking into faceted oval crystal!
        "max_bg_grad": 11.5,
        "inner_holes": False,
        "erode_px": 1,
    },
    "bento-colares-cutout.png": {
        "src": os.path.join(PRODUCTS_DIR, "item_b42cc2ca9d7a4c7599a37c45df25d914.jpg"),
        "label": "Colares — Choker Triade Trevo Flora 18k",
        "bg_luma": 205,
        "bg_sat": 0.125,
        "bg_warmth": 0.085,
        "inner_holes": True,
        "hole_min_area": 18,
        "hole_luma": 218,
        "hole_sat": 0.105,
        "erode_px": 1,
    },
    "bento-pulseiras-cutout.png": {
        "src": os.path.join(PRODUCTS_DIR, "item_ec9cfa80d69344d1b65699909362d33f.jpg"),
        "label": "Pulseiras — Cordao Baiano Torcido 18k",
        "bg_luma": 206,
        "bg_sat": 0.130,
        "bg_warmth": 0.085,
        "inner_holes": True,
        "hole_min_area": 10,
        "hole_luma": 216,
        "hole_sat": 0.115,
        "erode_px": 1,
    },
}


def rgb_to_luma_sat(arr_f32: np.ndarray):
    r, g, b = arr_f32[..., 0], arr_f32[..., 1], arr_f32[..., 2]
    luma = 0.299 * r + 0.587 * g + 0.114 * b
    cmax = np.maximum(np.maximum(r, g), b)
    cmin = np.minimum(np.minimum(r, g), b)
    sat = np.where(cmax > 1e-5, (cmax - cmin) / np.maximum(cmax, 1e-5), 0.0)
    # Warmth bias: gold has strong R - B > 0 even when bright!
    warmth = (r - b) / 255.0
    return luma, sat, warmth


def flood_fill_exterior(candidate_mask: np.ndarray) -> np.ndarray:
    """BFS flood-fill from image borders on boolean `candidate_mask`."""
    h, w = candidate_mask.shape
    bg = np.zeros((h, w), dtype=bool)
    q = collections.deque()

    for x in range(w):
        if candidate_mask[0, x] and not bg[0, x]:
            bg[0, x] = True
            q.append((0, x))
        if candidate_mask[h - 1, x] and not bg[h - 1, x]:
            bg[h - 1, x] = True
            q.append((h - 1, x))
    for y in range(h):
        if candidate_mask[y, 0] and not bg[y, 0]:
            bg[y, 0] = True
            q.append((y, 0))
        if candidate_mask[y, w - 1] and not bg[y, w - 1]:
            bg[y, w - 1] = True
            q.append((y, w - 1))

    while q:
        y, x = q.popleft()
        if y > 0 and candidate_mask[y - 1, x] and not bg[y - 1, x]:
            bg[y - 1, x] = True
            q.append((y - 1, x))
        if y + 1 < h and candidate_mask[y + 1, x] and not bg[y + 1, x]:
            bg[y + 1, x] = True
            q.append((y + 1, x))
        if x > 0 and candidate_mask[y, x - 1] and not bg[y, x - 1]:
            bg[y, x - 1] = True
            q.append((y, x - 1))
        if x + 1 < w and candidate_mask[y, x + 1] and not bg[y, x + 1]:
            bg[y, x + 1] = True
            q.append((y, x + 1))
    return bg


def find_interior_holes(bg: np.ndarray, hole_cand: np.ndarray, min_area: int) -> np.ndarray:
    """Finds enclosed neutral-white holes (e.g. inside bracelet loop, links) not touching border."""
    h, w = bg.shape
    visited = bg.copy()
    holes = np.zeros((h, w), dtype=bool)
    cand = hole_cand & (~bg)
    ys, xs = np.where(cand)

    for sy, sx in zip(ys.tolist(), xs.tolist()):
        if visited[sy, sx]:
            continue
        comp = []
        q = collections.deque([(sy, sx)])
        visited[sy, sx] = True
        while q:
            y, x = q.popleft()
            comp.append((y, x))
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and cand[ny, nx]:
                    visited[ny, nx] = True
                    q.append((ny, nx))
        if len(comp) >= min_area:
            for y, x in comp:
                holes[y, x] = True
    return holes


def dilate_bool(mask: np.ndarray, radius: int = 1) -> np.ndarray:
    out = mask.copy()
    for _ in range(radius):
        m = out.copy()
        out[1:, :] |= m[:-1, :]
        out[:-1, :] |= m[1:, :]
        out[:, 1:] |= m[:, :-1]
        out[:, :-1] |= m[:, 1:]
        # diagonals
        out[1:, 1:] |= m[:-1, :-1]
        out[1:, :-1] |= m[:-1, 1:]
        out[:-1, 1:] |= m[1:, :-1]
        out[:-1, :-1] |= m[1:, 1:]
    return out


def bleed_foreground_rgb(rgb: np.ndarray, solid_fg: np.ndarray, steps: int = 6) -> np.ndarray:
    """
    Propagates true interior opaque jewelry colors outward into anti-aliased edge
    pixels so zero white studio fringe contaminates dark Bento card backgrounds.
    """
    out = rgb.copy()
    known = solid_fg.copy()
    for _ in range(steps):
        if np.all(known):
            break
        acc = np.zeros_like(out)
        cnt = np.zeros(known.shape, dtype=np.float32)
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)):
            w_dir = 1.0 if (dy == 0 or dx == 0) else 0.707
            sy0, sy1 = max(0, -dy), out.shape[0] - max(0, dy)
            sx0, sx1 = max(0, -dx), out.shape[1] - max(0, dx)
            ty0, ty1 = max(0, dy), out.shape[0] - max(0, -dy)
            tx0, tx1 = max(0, dx), out.shape[1] - max(0, -dx)
            m = known[sy0:sy1, sx0:sx1].astype(np.float32) * w_dir
            acc[ty0:ty1, tx0:tx1] += out[sy0:sy1, sx0:sx1] * m[..., None]
            cnt[ty0:ty1, tx0:tx1] += m
        update = (~known) & (cnt > 0.0)
        out[update] = acc[update] / cnt[update, None]
        known[update] = True
    return out


def make_clean_cutout(cfg: dict, out_path: str, canvas_size: int = 1024):
    # Work at 2x resolution first for ultra-smooth anti-aliased subpixel edge matting!
    im_orig = Image.open(cfg["src"]).convert("RGB")
    im_hi = im_orig.resize((im_orig.width * 2, im_orig.height * 2), Image.Resampling.LANCZOS)
    rgb = np.asarray(im_hi, dtype=np.float32)
    luma, sat, warmth = rgb_to_luma_sat(rgb)

    # 1. Exterior background + soft studio contact shadow candidate:
    # Neutral/pale-warm pixels (white studio sweep OR soft gray/beige shadow under piece).
    # When `use_grad_gate` is enabled, smooth blurred table shadows (low local gradient) are
    # stripped completely while sharp high-gradient crystal facets block flood-fill leakage!
    max_warmth = cfg.get("bg_warmth", 0.085)
    if cfg.get("use_grad_gate", False):
        # Compute Sobel-like local luminance gradient magnitude at 2x resolution
        gx = np.zeros_like(luma)
        gy = np.zeros_like(luma)
        gx[:, 1:-1] = np.abs(luma[:, 2:] - luma[:, :-2]) * 0.5
        gy[1:-1, :] = np.abs(luma[2:, :] - luma[:-2, :]) * 0.5
        grad = np.hypot(gx, gy)
        # Local 3x3 max gradient to create an unbroken barrier around faceted crystals & gold rims
        grad_max = grad.copy()
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            sy0, sy1 = max(0, -dy), grad.shape[0] - max(0, dy)
            sx0, sx1 = max(0, -dx), grad.shape[1] - max(0, dx)
            ty0, ty1 = max(0, dy), grad.shape[0] - max(0, -dy)
            tx0, tx1 = max(0, dx), grad.shape[1] - max(0, -dx)
            grad_max[ty0:ty1, tx0:tx1] = np.maximum(grad_max[ty0:ty1, tx0:tx1], grad[sy0:sy1, sx0:sx1])

        pure_white = (luma >= 249.0) & (sat <= 0.04)
        smooth_shadow = (
            (luma >= cfg["bg_luma"])
            & (sat <= cfg["bg_sat"])
            & (warmth <= max_warmth)
            & (grad_max <= cfg.get("max_bg_grad", 11.5))
        )
        ext_cand = pure_white | smooth_shadow
    else:
        ext_cand = (
            ((luma >= cfg["bg_luma"]) & (sat <= cfg["bg_sat"]) & (warmth <= max_warmth))
            | ((luma >= 242.0) & (sat <= 0.08))
        )
    bg_ext = flood_fill_exterior(ext_cand)
    # For gradient-gated cutouts, also trim 1px of soft shadow transition pixels right adjacent to bg_ext
    if cfg.get("use_grad_gate", False):
        for _ in range(3):
            adj = dilate_bool(bg_ext, radius=1) & (~bg_ext)
            soft_rim = adj & (luma >= 200.0) & (sat <= 0.24) & (grad_max <= 22.0)
            if not np.any(soft_rim):
                break
            bg_ext |= soft_rim

    # 2. Interior enclosed holes (inside bracelet circle, chain links, necklace loop)
    bg_total = bg_ext.copy()
    if cfg.get("inner_holes", True):
        hole_cand = (luma >= cfg["hole_luma"]) & (sat <= cfg["hole_sat"]) & (warmth <= 0.075)
        holes = find_interior_holes(bg_ext, hole_cand, min_area=cfg["hole_min_area"] * 4)
        bg_total |= holes

    # 3. Trim 1px bright fringe touching bg (white halo elimination)
    if cfg.get("erode_px", 1) > 0:
        near_bg = dilate_bool(bg_total, radius=cfg["erode_px"])
        bright_fringe = near_bg & (~bg_total) & (luma >= 210.0) & (sat <= 0.18)
        bg_total |= bright_fringe

    # 4. Build soft anti-aliased alpha matte
    fg_hard = (~bg_total).astype(np.float32)
    alpha_img = Image.fromarray((fg_hard * 255.0).astype(np.uint8), mode="L")
    # Smooth 1.1px feather at 2x resolution -> crisp 0.55px optical anti-aliasing at final scale!
    alpha_soft = np.asarray(alpha_img.filter(ImageFilter.GaussianBlur(radius=1.15)), dtype=np.float32) / 255.0
    # Slight S-curve tighten so core stays 100% opaque while outer edge stays velvety & fringe-free
    alpha = np.clip((alpha_soft - 0.14) / 0.72, 0.0, 1.0)
    # Zero out anything firmly in bg_total that leaked outside 1px
    bg_far = ~dilate_bool(~bg_total, radius=1)
    alpha[bg_far] = 0.0

    # 5. Edge Color Decontamination (unmix white background + bleed interior gold color onto rim!)
    solid_fg = (alpha >= 0.96) & (~dilate_bool(bg_total, radius=2))
    rgb_bled = bleed_foreground_rgb(rgb, solid_fg, steps=7)

    # Unmix formula against pure white background (255, 255, 255) for mid-alpha pixels
    safe_a = np.maximum(alpha, 0.25)[..., None]
    rgb_unmixed = np.clip((rgb - (1.0 - alpha[..., None]) * 255.0) / safe_a, 0.0, 255.0)

    # Blend smoothly: deep interior uses exact original rgb; transition rim uses bled+unmixed color!
    rim_mask = (alpha > 0.0) & (~solid_fg)
    # Stronger bled weight near low alpha to kill all residual white glow on dark cards
    w_orig = np.clip((alpha - 0.35) / 0.65, 0.0, 1.0)[..., None] ** 1.4
    rgb_clean = rgb.copy()
    rgb_rim = rgb_unmixed * (0.45 * w_orig) + rgb_bled * (1.0 - 0.45 * w_orig)
    rgb_clean[rim_mask] = rgb_rim[rim_mask]
    # Zero RGB on fully transparent pixels for clean PNG compression & texture filtering
    rgb_clean[alpha <= 0.004] = 0.0

    rgba = np.dstack([
        np.clip(rgb_clean, 0, 255).astype(np.uint8),
        np.clip(alpha * 255.0, 0, 255).astype(np.uint8),
    ])
    cut_img = Image.fromarray(rgba, mode="RGBA")

    # 6. Crop tightly to non-transparent bbox and compose onto balanced 1024x1024 transparent canvas
    bbox = cut_img.getbbox()
    if bbox is None:
        raise RuntimeError(f"Empty cutout produced for {cfg['src']}")
    cropped = cut_img.crop(bbox)

    # Subtle micro-polish on RGB only (preserve alpha untouched)
    r_ch, g_ch, b_ch, a_ch = cropped.split()
    rgb_only = Image.merge("RGB", (r_ch, g_ch, b_ch))
    rgb_only = ImageEnhance.Contrast(rgb_only).enhance(1.05)
    rgb_only = ImageEnhance.Sharpness(rgb_only).enhance(1.12)
    r2, g2, b2 = rgb_only.split()
    cropped = Image.merge("RGBA", (r2, g2, b2, a_ch))

    # Fit cleanly inside 84% of canvas (apple product framing with breathing margin)
    target_max = int(canvas_size * 0.84)
    scale = min(target_max / cropped.width, target_max / cropped.height)
    new_w = max(1, int(round(cropped.width * scale)))
    new_h = max(1, int(round(cropped.height * scale)))
    resized = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    px = (canvas_size - new_w) // 2
    py = (canvas_size - new_h) // 2
    canvas.paste(resized, (px, py), resized)
    canvas.save(out_path, format="PNG", optimize=True)
    kb = os.path.getsize(out_path) / 1024.0
    print(f"[CUTOUT OK] {out_path} ({canvas_size}x{canvas_size}, {kb:.1f} KB, fg_bbox={new_w}x{new_h})")


def build_audit_contact_sheet():
    """
    Creates scratch/marcely_assets_audit.png:
      Row 1 (4 tiles): 01_ring_hero_gold, 02_ring_closeup_crown, 03_ring_rhodium, 04_ring_side_gallery
      Row 2 (5 tiles): All 5 Bento transparent cutouts composited onto the exact 5 Apple Bento colors:
        #1F1915 (Espresso Gold), #121214 (Obsidian Rhodium), #12291E (Emerald Earrings),
        #EAE3D5 (Champagne Cream Necklaces), #0E1A2E (Midnight Sapphire Bracelets)
    """
    ring_renders = [
        ("01 Hero Gold 18k", os.path.join(RENDERS_DIR, "01_ring_hero_gold.png")),
        ("02 Macro Crown 57-Facet", os.path.join(RENDERS_DIR, "02_ring_closeup_crown.png")),
        ("03 Rhodium Nobre", os.path.join(RENDERS_DIR, "03_ring_rhodium.png")),
        ("04 Side Openwork Gallery", os.path.join(RENDERS_DIR, "04_ring_side_gallery.png")),
    ]
    bento_tiles = [
        ("Gold Ring Cutout (#1F1915)", os.path.join(IMG_DIR, "ring-gold-cutout.png"), "#1F1915", (245, 236, 220)),
        ("Rhodium Ring Cutout (#121214)", os.path.join(IMG_DIR, "ring-rhodium-cutout.png"), "#121214", (235, 240, 245)),
        ("Brincos Cutout (#12291E)", os.path.join(IMG_DIR, "bento-brincos-cutout.png"), "#12291E", (235, 242, 235)),
        ("Colares Cutout (#EAE3D5)", os.path.join(IMG_DIR, "bento-colares-cutout.png"), "#EAE3D5", (35, 28, 22)),
        ("Pulseiras Cutout (#0E1A2E)", os.path.join(IMG_DIR, "bento-pulseiras-cutout.png"), "#0E1A2E", (232, 238, 248)),
    ]

    pad = 24
    header_h = 56
    # Row 1: 4 tiles of 440x440 -> width = 4*440 + 5*24 = 1880
    w_sheet = 1880
    r1_size = 440
    # Row 2: 5 tiles of 347x380 -> 5*347 + 6*24 = 1735 + 144 = 1879
    r2_w = 347
    r2_h = 380
    h_sheet = header_h + r1_size + 46 + pad + r2_h + 46 + pad * 2

    sheet = Image.new("RGB", (w_sheet, h_sheet), (16, 15, 14))
    draw = ImageDraw.Draw(sheet)
    draw.text((pad, 18), "MARCELY HIGH JEWELRY 3D & APPLE BENTO CUTOUT VISUAL AUDIT PROOF SHEET", fill=(240, 200, 110))

    # Row 1: 4 Blender 3D Ring Renders
    y1 = header_h
    for idx, (title, path) in enumerate(ring_renders):
        x = pad + idx * (r1_size + pad)
        if os.path.exists(path):
            im = Image.open(path).convert("RGB").resize((r1_size, r1_size), Image.Resampling.LANCZOS)
            sheet.paste(im, (x, y1))
        else:
            draw.rectangle([x, y1, x + r1_size, y1 + r1_size], fill=(45, 20, 20))
            draw.text((x + 20, y1 + 20), f"MISSING:\n{os.path.basename(path)}", fill=(255, 120, 120))
        draw.rectangle([x, y1, x + r1_size, y1 + r1_size], outline=(68, 60, 52), width=1)
        draw.text((x + 6, y1 + r1_size + 10), title, fill=(235, 228, 218))

    # Row 2: 5 Bento RGBA Cutouts over exact Apple Bento Card Colors
    y2 = y1 + r1_size + 46 + pad
    for idx, (title, path, bg_hex, txt_col) in enumerate(bento_tiles):
        x = pad + idx * (r2_w + pad)
        bg_rgb = tuple(int(bg_hex.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4))
        card = Image.new("RGBA", (r2_w, r2_h), bg_rgb + (255,))
        if os.path.exists(path):
            cut = Image.open(path).convert("RGBA")
            # Fit inside card cleanly
            fit = min(r2_w - 28, r2_h - 56)
            cut_r = cut.resize((fit, fit), Image.Resampling.LANCZOS)
            cx = (r2_w - fit) // 2
            cy = (r2_h - 32 - fit) // 2 + 6
            card.alpha_composite(cut_r, (cx, cy))
        else:
            cd = ImageDraw.Draw(card)
            cd.text((20, 20), f"MISSING:\n{os.path.basename(path)}", fill=(255, 120, 120, 255))

        cd = ImageDraw.Draw(card)
        cd.text((14, r2_h - 26), title, fill=txt_col + (255,))
        sheet.paste(card.convert("RGB"), (x, y2))
        draw.rectangle([x, y2, x + r2_w, y2 + r2_h], outline=(76, 68, 58), width=1)

    out_sheet = os.path.join(SCRATCH_DIR, "marcely_assets_audit.png")
    sheet.save(out_sheet, format="PNG")
    print(f"[AUDIT SHEET OK] {out_sheet} ({w_sheet}x{h_sheet})")


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"
    if mode in ("all", "cutouts"):
        for fname, cfg in BENTO_SOURCES.items():
            make_clean_cutout(cfg, os.path.join(IMG_DIR, fname))
    if mode in ("all", "sheet"):
        build_audit_contact_sheet()
