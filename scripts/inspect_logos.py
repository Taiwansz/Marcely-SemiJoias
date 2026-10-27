import json, re

JSON_PATH = r"C:\Users\stdma\.gemini\antigravity-cli\brain\099c1d8b-95ee-413d-9070-a71cf1d2eeb5\.system_generated\steps\142\output.txt"
with open(JSON_PATH, "r", encoding="utf-8") as f:
    data = json.load(f)

screens = data.get("screens", [])
logo_screens = []
for s in screens:
    t = s.get("title", "")
    if re.search(r"\b(logo|monograma|hallmark|logotipo)\b", t, re.IGNORECASE):
        logo_screens.append(s)

print(f"EXACT LOGO SCREENS FOUND: {len(logo_screens)}\n")
for s in logo_screens:
    screen_id = s.get("name", "").split("/")[-1]
    title = s.get("title", "")
    url = s.get("screenshot", {}).get("downloadUrl", "")
    w = s.get("width")
    h = s.get("height")
    print(f"ID: {screen_id} ({w}x{h})")
    print(f"TITLE: {title}")
    print(f"URL: {url}")
    print("=" * 60)
