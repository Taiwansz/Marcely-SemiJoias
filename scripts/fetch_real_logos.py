import json, urllib.request, ssl, os

ctx = ssl.create_default_context()
BASE_DIR = r"C:\Users\stdma\projetos\Marcely - SemiJoias\brand\logo_inspection"
os.makedirs(BASE_DIR, exist_ok=True)

STEP_130_PATH = r"C:\Users\stdma\.gemini\antigravity-cli\brain\099c1d8b-95ee-413d-9070-a71cf1d2eeb5\.system_generated\steps\130\output.txt"
with open(STEP_130_PATH, "r", encoding="utf-8") as f:
    data = json.load(f)

proj = data["projects"][0]
instances = proj.get("screenInstances", [])

# Also check screens
STEP_142_PATH = r"C:\Users\stdma\.gemini\antigravity-cli\brain\099c1d8b-95ee-413d-9070-a71cf1d2eeb5\.system_generated\steps\142\output.txt"
with open(STEP_142_PATH, "r", encoding="utf-8") as f:
    screens_data = json.load(f)

screens_by_id = {}
for s in screens_data.get("screens", []):
    sid = s.get("name", "").split("/")[-1]
    screens_by_id[sid] = s

# Target IDs that represent logos or uploaded brand images
target_ids = [
    "3164908805586745513", # image.png (512x286)
    "1981031971536170404", # image.png (427x432)
    "fcd01be2ea6245e9b7be0ddabe57674a", # Main Logo prompt
    "3e02a1f548414799be9377b3755a275e", # Logo Monograma M
    "11895401064955588031",
    "4d4537f974a6464ba07dc28a9ffca2b3", # Var 1
    "deb834c996b2468e83324f3e3a412b30", # Var 2
    "4817e536914548018cc37fd0a625d116", # Var 3
]

print("Inspecting candidate logo screens...")
for tid in target_ids:
    if tid in screens_by_id:
        s = screens_by_id[tid]
        title = s.get("title", "")
        url = s.get("screenshot", {}).get("downloadUrl", "")
        out_name = f"{tid}.png"
        out_path = os.path.join(BASE_DIR, out_name)
        if url:
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, context=ctx, timeout=20) as resp:
                    data_bytes = resp.read()
                    with open(out_path, "wb") as f_out:
                        f_out.write(data_bytes)
                print(f"[SAVED] {tid}: {len(data_bytes)} bytes | {title[:60]}")
            except Exception as e:
                print(f"[ERR] {tid}: {e}")
    else:
        print(f"[NOT IN SCREENS LIST] {tid}")
