import json, re

STEP_130_PATH = r"C:\Users\stdma\.gemini\antigravity-cli\brain\099c1d8b-95ee-413d-9070-a71cf1d2eeb5\.system_generated\steps\130\output.txt"

with open(STEP_130_PATH, "r", encoding="utf-8") as f:
    data = json.load(f)

proj = data["projects"][0]
instances = proj.get("screenInstances", [])

print(f"Total screen instances: {len(instances)}")

logo_instances = []
for inst in instances:
    label = inst.get("label", "")
    if re.search(r"\b(logo|monograma|hallmark|m cursivo|marca)\b", label, re.IGNORECASE):
        logo_instances.append(inst)

print(f"Logo instances found in Stitch Canvas: {len(logo_instances)}\n")
for li in logo_instances:
    print(f"ID: {li.get('id')}")
    print(f"SOURCE SCREEN: {li.get('sourceScreen')}")
    print(f"LABEL: {li.get('label')}")
    print(f"HIDDEN: {li.get('hidden')}")
    print("=" * 60)
