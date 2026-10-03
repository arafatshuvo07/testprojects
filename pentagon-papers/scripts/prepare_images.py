"""Gather the real archival images used by the film into public/img/.

Sources (all reachable from a locked-down build box over S3):
  * Pentagon Papers scans  – DocumentCloud's S3 bucket (declassified 2011 release,
    Part IV.B.1 "Evolution of the War: Counterinsurgency"), public domain (US Gov).
  * Smithsonian Open Access – CC0 portraits / objects (NPG, NMAAHC).
  * Open Images Dataset V4 – Flickr photos under CC BY 2.0, pulled out of the
    dataset's tar shards on s3://open-images-dataset (shards are ~33 GB each).

Usage:
  python3 scripts/prepare_images.py            # everything (slow: streams OI shards)
  python3 scripts/prepare_images.py --no-oi    # skip Open Images; reuse raw/ cache
Writes public/img/<slot>.jpg, public/img/credits.json and src/imageMeta.json.
"""
import json, os, subprocess, sys, urllib.request
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "img")
RAW = os.path.join(ROOT, "raw")  # git-ignored download cache

DC = "https://s3.amazonaws.com/s3.documentcloud.org/documents/205511/pentagon-papers-part-iv-b-1.pdf"
SI = "https://smithsonian-open-access.s3-us-west-2.amazonaws.com/media/"
OI = "https://open-images-dataset.s3.amazonaws.com/tar/train_{}.tar.gz"

# slot: (source, id, crop "w:h:x:y" or None, credit)
SLOTS = json.load(open(os.path.join(ROOT, "scripts", "slots.json")))


def sh(*a):
    subprocess.run(a, check=True)


def fetch(url, dest):
    if not os.path.exists(dest):
        with urllib.request.urlopen(url, timeout=300) as r, open(dest + ".part", "wb") as f:
            while chunk := r.read(1 << 20):
                f.write(chunk)
        os.rename(dest + ".part", dest)
    return dest


def oi_extract(ids):
    by_shard = defaultdict(list)
    for i in ids:
        if not os.path.exists(os.path.join(RAW, "oi", f"train_{i[0]}", i + ".jpg")):
            by_shard[i[0]].append(f"train_{i[0]}/{i}.jpg")
    os.makedirs(os.path.join(RAW, "oi"), exist_ok=True)
    procs = []
    for shard, names in by_shard.items():
        cmd = f"curl -s {OI.format(shard)} | tar -xzf - --occurrence -C '{os.path.join(RAW, 'oi')}' " + " ".join(names)
        procs.append(subprocess.Popen(cmd, shell=True))
    for p in procs:
        p.wait()


def main():
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(RAW, exist_ok=True)
    pdf = fetch(DC, os.path.join(RAW, "pentagon-papers-part-iv-b-1.pdf"))
    if "--no-oi" not in sys.argv:
        oi_extract([s["id"] for s in SLOTS.values() if s["src"] == "oi"])
    credits = {}
    for slot, s in SLOTS.items():
        if s["src"] == "pdf":
            base = os.path.join(RAW, f"pp-p{s['id']}")
            if not os.path.exists(base + ".jpg"):
                sh("pdftoppm", "-r", "170", "-f", str(s["id"]), "-l", str(s["id"]), "-jpeg", "-singlefile", pdf, base)
            src = base + ".jpg"
            credit = f"Pentagon Papers, Part IV.B.1, p. {s['id']} (U.S. Department of Defense; declassified 2011; public domain)"
        elif s["src"] == "si":
            src = fetch(SI + s["id"] + ".jpg", os.path.join(RAW, s["id"].replace("/", "_") + ".jpg"))
            credit = s["credit"] + " (Smithsonian Open Access, CC0)"
        else:
            src = os.path.join(RAW, "oi", f"train_{s['id'][0]}", s["id"] + ".jpg")
            if not os.path.exists(src):
                print(f"!! missing {slot} ({s['id']})")
                continue
            credit = s["credit"] + " (via Open Images, CC BY 2.0)"
        vf = ["-vf", f"crop={s['crop']}"] if s.get("crop") else []
        vf = vf[:1] + [vf[1] + ",scale='min(2600,iw)':-2"] if vf else ["-vf", "scale='min(2600,iw)':-2"]
        sh("ffmpeg", "-loglevel", "error", "-y", "-i", src, *vf, "-q:v", "2", os.path.join(OUT, slot + ".jpg"))
        credits[slot] = credit
    json.dump(credits, open(os.path.join(OUT, "credits.json"), "w"), indent=1, ensure_ascii=False)
    meta = {}
    for f in sorted(os.listdir(OUT)):
        if f.endswith(".jpg"):
            wh = subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                                          "stream=width,height", "-of", "csv=p=0", os.path.join(OUT, f)]).decode().strip()
            w, h = map(int, wh.split(","))
            meta[f[:-4]] = {"w": w, "h": h}
    json.dump(meta, open(os.path.join(ROOT, "src", "imageMeta.json"), "w"), indent=1)
    print(f"{len(meta)} images ready")


if __name__ == "__main__":
    main()
