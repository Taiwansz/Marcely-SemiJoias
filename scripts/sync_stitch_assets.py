import json, urllib.request, ssl, os, re

BASE_DIR = r"C:\Users\stdma\projetos\Marcely - SemiJoias"
RAW_DIR = os.path.join(BASE_DIR, "brand", "raw")
REF_DIR = os.path.join(BASE_DIR, "brand", "ref_site")
REF_HTML_DIR = os.path.join(BASE_DIR, "site", "reference_screens")
PROD_IMG_DIR = os.path.join(BASE_DIR, "site", "assets", "products")
ASSETS_DIR = os.path.join(BASE_DIR, "site", "assets")

for d in [RAW_DIR, REF_DIR, REF_HTML_DIR, PROD_IMG_DIR, ASSETS_DIR]:
    os.makedirs(d, exist_ok=True)

ctx = ssl.create_default_context()

JSON_PATH = r"C:\Users\stdma\.gemini\antigravity-cli\brain\099c1d8b-95ee-413d-9070-a71cf1d2eeb5\.system_generated\steps\142\output.txt"
with open(JSON_PATH, "r", encoding="utf-8") as f:
    data = json.load(f)

screens = data.get("screens", [])
print(f"Total screens in Stitch export: {len(screens)}")

def sanitize_filename(name):
    clean = re.sub(r'[^a-zA-Z0-9_\-]', '_', name)
    return clean[:60]

downloaded_html = 0
downloaded_imgs = 0
catalog_items = []

for idx, s in enumerate(screens):
    title = s.get("title", f"screen_{idx}")
    screen_id = s.get("name", "").split("/")[-1]
    
    # 1. Download HTML Code if present
    html_info = s.get("htmlCode")
    if html_info and html_info.get("downloadUrl"):
        url = html_info["downloadUrl"]
        slug = sanitize_filename(title).lower()
        filepath = os.path.join(REF_HTML_DIR, f"{slug}.html")
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
                content = resp.read()
                with open(filepath, "wb") as out_f:
                    out_f.write(content)
                print(f"[HTML OK] {title} -> {filepath} ({len(content)} bytes)")
                downloaded_html += 1
        except Exception as e:
            print(f"[HTML ERR] {title}: {e}")

    # 2. Download Screenshot or Enhanced Photo
    shot_info = s.get("screenshot")
    if shot_info and shot_info.get("downloadUrl"):
        img_url = shot_info["downloadUrl"]
        # Check if it's an enhanced catalog photo or UI screen
        is_ui = any(kw in title.lower() for kw in ["página inicial", "catálogo", "lookbook", "detalhes do produto"])
        
        if is_ui:
            slug = sanitize_filename(title).lower()
            target_path = os.path.join(REF_DIR, f"{slug}.png")
        else:
            # It is a product photo or logo
            is_logo = "logo" in title.lower() or "monograma" in title.lower()
            if is_logo:
                target_path = os.path.join(RAW_DIR, f"logo_{screen_id[:8]}.png")
            else:
                target_path = os.path.join(PROD_IMG_DIR, f"prod_{screen_id[:8]}.jpg")
                catalog_items.append({
                    "id": f"marcely_{screen_id[:8]}",
                    "title": title,
                    "image": f"assets/products/prod_{screen_id[:8]}.jpg",
                    "width": s.get("width"),
                    "height": s.get("height")
                })

        # Download image if not exists
        if not os.path.exists(target_path):
            try:
                req = urllib.request.Request(img_url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
                    content = resp.read()
                    with open(target_path, "wb") as out_f:
                        out_f.write(content)
                    downloaded_imgs += 1
            except Exception as e:
                pass

print(f"Download complete: {downloaded_html} HTML files, {downloaded_imgs} Images.")
print(f"Catalog items recorded: {len(catalog_items)}")

# Save catalog metadata JSON
with open(os.path.join(BASE_DIR, "site", "catalog_raw.json"), "w", encoding="utf-8") as f:
    json.dump(catalog_items, f, ensure_ascii=False, indent=2)
print("Catalog JSON generated.")
