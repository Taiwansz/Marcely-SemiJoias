import urllib.request, ssl, os

ctx = ssl.create_default_context()
BASE_DIR = r"C:\Users\stdma\projetos\Marcely - SemiJoias\brand\logo_inspection"

# 1. Download SVG from 3e02a1f548414799be9377b3755a275e
svg_url = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1ZWM5MGYzOTQzOWYwNmZmY2IyODRkM2MyNmI5EgsSBxDjup2d5w4YAZIBJAoKcHJvamVjdF9pZBIWQhQxNjMwMTU3MDQyODgwNzE2NDM5Mw&filename=&opi=89354086"
png_url = "https://lh3.googleusercontent.com/aida/AEtjO1Vg3hJVEqMgWEh5UgkBlPTuEV8FSVy1H_EEiNffUpGfIUbxeTJD4iSMp_AIqljYZE_Moo59BSeQ3QkTR58p8QeRlM5TwCpDkTJYwi8L7ey2coyDywRohS1gZctjA8wGPe_-I1x-oSwFaLtYiUBOFCsYCcAGlPAXAMeLHqMBY8UA41udfGP5CILvPG-rNFzEY6gzQ_Oi-I44jHCMGeiWMSQESO0MdoFVObokeATG3G7RoIU30_8s1W3ypH76"
img198_url = "https://lh3.googleusercontent.com/aida/AEtjO1WQd7OuRV1kSVAA4OY5sJwcAe4wvKDrOuEBanMHYkxDk_b7BRGrT9oaOxH3DOtXxjNc9UfY8mX3hXjb7kINSXvOyKqpU19BmHDVVYUAMttF-nhBG4o332LuquzUvrKSl3pCBeBK9MVLCkvEbjaVtIUS-z8lScFMNRZOMHcK_qmSQfJOdTEs6d1w_DwaGEEiZncnlXCV_zVt4vUueLakDsRfTFA3WFvDQ4RZcFyHLPaG_X4fXv8i_MfLyi-1xAgGdVr2eaCok-DXeu8"

def dl(url, path):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, context=ctx) as r:
        b = r.read()
        with open(path, "wb") as f:
            f.write(b)
        print(f"Downloaded {path} ({len(b)} bytes)")

dl(svg_url, os.path.join(BASE_DIR, "logo_3e02a1f5.svg"))
dl(png_url, os.path.join(BASE_DIR, "logo_3e02a1f5.png"))
dl(img198_url, os.path.join(BASE_DIR, "image_19810319.png"))
