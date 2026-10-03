"""Download real archival images from Wikimedia Commons into public/img/.

Usage: python3 scripts/fetch_images.py [--force]
Needs network access to commons.wikimedia.org and upload.wikimedia.org.
Writes public/img/<key>.jpg and public/img/credits.json.
"""
import json, os, re, sys, time, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "img")
API = "https://commons.wikimedia.org/w/api.php"
UA = {"User-Agent": "PentagonPapersDoc/1.0 (educational documentary render)"}
OK_LICENSE = re.compile(r"public domain|^pd|cc0|cc[- ]by", re.I)


def api(**params):
    params.update(format="json", formatversion="2")
    req = urllib.request.Request(API + "?" + urllib.parse.urlencode(params), headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def info(titles, page=None):
    extra = {"iiurlparam": f"page{page}-2600px"} if page else {"iiurlwidth": 2600}
    d = api(action="query", prop="imageinfo", titles="|".join(titles),
            iiprop="url|size|mime|extmetadata", **extra)
    pages = {p["title"]: p for p in d["query"].get("pages", [])}
    out = []
    for t in titles:
        p = pages.get(t)
        if not p or "imageinfo" not in p:
            continue
        ii = p["imageinfo"][0]
        meta = ii.get("extmetadata", {})
        lic = meta.get("LicenseShortName", {}).get("value", "")
        if not OK_LICENSE.search(lic):
            continue
        if ii.get("width", 0) < 900 and not ii["mime"].endswith("pdf"):
            continue
        artist = re.sub("<[^>]+>", "", meta.get("Artist", {}).get("value", "")).strip()
        out.append({"title": t, "url": ii.get("thumburl") or ii["url"], "license": lic,
                    "artist": artist, "page": ii.get("descriptionurl")})
    return out


def search(q):
    d = api(action="query", list="search", srsearch=q + " filetype:bitmap|drawing|pdf",
            srnamespace=6, srlimit=10)
    return [h["title"] for h in d["query"]["search"]]


def main():
    force = "--force" in sys.argv
    os.makedirs(OUT, exist_ok=True)
    spec = json.load(open(os.path.join(ROOT, "scripts", "images.json")))
    credits_path = os.path.join(OUT, "credits.json")
    credits = json.load(open(credits_path)) if os.path.exists(credits_path) else {}
    for key, s in spec.items():
        if key.startswith("_"):
            continue
        dest = os.path.join(OUT, key + ".jpg")
        if os.path.exists(dest) and not force:
            continue
        cands = info(s["files"], s.get("page")) if s["files"] else []
        for q in s["search"]:
            if cands:
                break
            titles = search(q)
            cands = info(titles, s.get("page")) if titles else []
        if not cands:
            print(f"!! {key}: nothing found")
            continue
        c = cands[0]
        req = urllib.request.Request(c["url"], headers=UA)
        with urllib.request.urlopen(req, timeout=60) as r, open(dest + ".tmp", "wb") as f:
            f.write(r.read())
        # normalise to an RGB JPEG
        os.system(f'ffmpeg -loglevel error -y -i "{dest}.tmp" -frames:v 1 -q:v 2 "{dest}" && rm "{dest}.tmp"')
        credits[key] = c
        print(f"ok {key}: {c['title']} ({c['license']})")
        time.sleep(0.5)
    json.dump(credits, open(credits_path, "w"), indent=1, ensure_ascii=False)
    write_meta()


def write_meta():
    """Record pixel sizes so the composition can pick a layout per image."""
    import subprocess
    meta = {}
    for f in sorted(os.listdir(OUT)):
        if not f.endswith(".jpg"):
            continue
        wh = subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                                      "stream=width,height", "-of", "csv=p=0", os.path.join(OUT, f)]).decode().strip()
        w, h = map(int, wh.split(","))
        meta[f[:-4]] = {"w": w, "h": h}
    json.dump(meta, open(os.path.join(ROOT, "src", "imageMeta.json"), "w"), indent=1)
    print(f"meta: {len(meta)} images")


if __name__ == "__main__":
    if "--meta-only" in sys.argv:
        write_meta()
    else:
        main()
