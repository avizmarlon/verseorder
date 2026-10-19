#!/usr/bin/env python3
"""Card banner + trailer media pipeline for VerseOrder.

Per-title settings live in scripts/media/manifest.json. Steps (run any subset, in order):

  resolve    TMDB lookup: official YouTube videos, textless backdrops, posters  -> work/<id>/tmdb.json
  backdrops  download textless backdrop candidates and draw a numbered contact sheet
  fetch      download the chosen official trailer (video only, best <=1080p)  -> work/<id>/src.*
  analyze    detect leading black / rating card and letterbox; write a contact sheet of the start
  encode     H.264 MP4 (+faststart) and AV1 WebM, muted, cropped, trimmed -> public/clips/<clip>.*
  apply      write bannerUrl / bannerFocus / clip / trailerYouTubeId / posterPath to watch-order.json

  python3 scripts/media/build_media.py resolve backdrops --only iron-man
  python3 scripts/media/build_media.py fetch analyze encode apply

The TMDB token is read at runtime from $TMDB_ENV (default ~/.secrets/tmdb_verseorder.env, keys
TMDB_READ_TOKEN or TMDB_API_KEY) or from the environment. It is never written anywhere.
Requires: yt-dlp, ffmpeg (libx264, libsvtav1), python3 with numpy + Pillow (analyze/backdrops).
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = Path(__file__).with_name("manifest.json")
DATA = ROOT / "src" / "data" / "watch-order.json"
CLIPS = ROOT / "public" / "clips"
IMG = "https://image.tmdb.org/t/p"

# Encode settings (kept identical for every title).
WIDTH, HEIGHT = 768, 320  # 2.4:1 card banner
GOP = 48  # 2 s at 24 fps
X264 = ["-c:v", "libx264", "-preset", "slow", "-profile:v", "main", "-level", "3.1", "-crf", "27",
        "-maxrate", "450k", "-bufsize", "900k", "-g", str(GOP), "-keyint_min", "24",
        "-sc_threshold", "40", "-x264-params", "open-gop=0", "-movflags", "+faststart", "-tag:v", "avc1"]
AV1 = ["-c:v", "libsvtav1", "-preset", "6", "-crf", "42", "-g", str(GOP), "-svtav1-params", "tune=0",
       "-cues_to_front", "1"]  # seek index up front: one range request for metadata, no tail fetch


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def run(cmd, **kw):
    log("$", " ".join(str(c) for c in cmd))
    return subprocess.run([str(c) for c in cmd], check=True, **kw)


def tool(name, env_var):
    found = os.environ.get(env_var) or shutil.which(name)
    if not found:
        sys.exit(f"{name} not found (set {env_var})")
    return found


# ---------------------------------------------------------------- TMDB
def tmdb_token():
    env = dict(os.environ)
    path = Path(os.environ.get("TMDB_ENV", Path.home() / ".secrets" / "tmdb_verseorder.env"))
    if path.exists():
        for line in path.read_text().splitlines():
            m = re.match(r"\s*(?:export\s+)?(\w+)\s*=\s*['\"]?([^'\"\s]+)", line)
            if m:
                env.setdefault(m.group(1), m.group(2))
    if env.get("TMDB_READ_TOKEN"):
        return {"Authorization": "Bearer " + env["TMDB_READ_TOKEN"]}, {}
    if env.get("TMDB_API_KEY"):
        return {}, {"api_key": env["TMDB_API_KEY"]}
    sys.exit("No TMDB credentials (TMDB_READ_TOKEN / TMDB_API_KEY)")


def tmdb(path, **q):
    headers, extra = tmdb_token()
    url = "https://api.themoviedb.org/3" + path + "?" + urllib.parse.urlencode({**q, **extra})
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=30) as r:
        return json.load(r)


def resolve(t, work):
    kind, tid = t["tmdb"]["type"], t["tmdb"]["id"]
    base = f"/{kind}/{tid}"
    videos = tmdb(base + "/videos", include_video_language="en,null")["results"]
    if kind == "tv" and t["tmdb"].get("season"):
        videos += tmdb(f"{base}/season/{t['tmdb']['season']}/videos", include_video_language="en,null")["results"]
    images = tmdb(base + "/images", include_image_language="en,null")
    yt = [{k: v[k] for k in ("key", "name", "type", "official", "size", "published_at")}
          for v in videos if v["site"] == "YouTube"]
    rank = {"Trailer": 0, "Teaser": 1, "Clip": 2}
    yt.sort(key=lambda v: (rank.get(v["type"], 9), not v["official"], v["published_at"]))
    backs = [b for b in images["backdrops"] if b["iso_639_1"] is None]  # textless
    backs.sort(key=lambda b: (-b["vote_average"], -b["width"]))
    posters = [p for p in images["posters"] if p["iso_639_1"] in ("en", None)]
    posters.sort(key=lambda p: -p["vote_average"])
    out = {"videos": yt,
           "backdrops": [{k: b[k] for k in ("file_path", "width", "height", "vote_average")} for b in backs],
           "posters": [p["file_path"] for p in posters[:5]]}
    (work / "tmdb.json").write_text(json.dumps(out, indent=2))
    log(f"[{t['id']}] {len(yt)} YouTube videos, {len(backs)} textless backdrops")
    for v in yt[:8]:
        log(f"   {v['type']:<8} official={v['official']!s:<5} {v['key']}  {v['name']}")


def backdrops(t, work, count=8):
    from PIL import Image, ImageDraw
    data = json.loads((work / "tmdb.json").read_text())
    tiles = []
    for i, b in enumerate(data["backdrops"][:count]):
        f = work / f"backdrop-{i}.jpg"
        if not f.exists():
            urllib.request.urlretrieve(f"{IMG}/w780{b['file_path']}", f)
        im = Image.open(f).convert("RGB").resize((390, 219))
        d = ImageDraw.Draw(im)
        d.rectangle((0, 0, 360, 18), fill=(0, 0, 0))
        d.text((4, 3), f"#{i} {b['file_path']} {b['vote_average']:.1f}", fill=(255, 255, 0))
        tiles.append(im)
    if not tiles:
        log(f"[{t['id']}] no textless backdrops")
        return
    cols = 2
    sheet = Image.new("RGB", (390 * cols, 219 * ((len(tiles) + cols - 1) // cols)))
    for i, im in enumerate(tiles):
        sheet.paste(im, ((i % cols) * 390, (i // cols) * 219))
    sheet.save(work / "backdrops.jpg", quality=85)
    log(f"[{t['id']}] contact sheet {work / 'backdrops.jpg'}")


# ---------------------------------------------------------------- trailer source
def source_url(src):
    if src["source"] == "youtube":
        return "https://www.youtube.com/watch?v=" + src["id"]
    if src["source"] == "brightcove":  # marvel.com hosts its official trailers on Brightcove
        return (f"https://players.brightcove.net/{src['account']}/{src['player']}_default/index.html"
                f"?videoId={src['id']}")
    sys.exit("unknown trailer source " + src["source"])


def source_file(work):
    files = sorted(work.glob("src.*"))
    return files[0] if files else None


def fetch(t, work):
    if source_file(work):
        log(f"[{t['id']}] source already downloaded")
        return
    ytdlp = tool("yt-dlp", "YTDLP")
    run([ytdlp, "--no-warnings", "--no-playlist", "--no-write-subs", "--no-progress",
         # best video-only stream up to 1080p, H.264 preferred (no audio is needed)
         "-f", "bv*[height<=1080][vcodec^=avc1]/bv*[height<=1080]/bv*/b",
         "-o", str(work / "src.%(ext)s"), source_url(t["trailer"])])


def probe(f):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                          "stream=width,height:format=duration", "-of", "json", str(f)],
                         capture_output=True, text=True, check=True).stdout
    j = json.loads(out)
    return j["streams"][0]["width"], j["streams"][0]["height"], float(j["format"]["duration"])


def frames(f, start, dur, fps, w=64, h=36):
    import numpy as np
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(start), "-t", str(dur), "-i", str(f),
                          "-vf", f"fps={fps},scale={w}:{h}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3).astype(np.float32)


def classify(fr):
    """'black' | 'card' (MPAA/age-rating style: one flat saturated colour) | 'content'."""
    import numpy as np
    y = fr @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    if y.mean() < 9 or (y.mean() < 22 and y.std() < 5):  # black, or a flat near-black fade
        return "black"
    lit = y > 24  # ignore letterbox / pillarbox bars
    if lit.mean() > 0.3:
        r, g, b = fr[..., 0][lit], fr[..., 1][lit], fr[..., 2][lit]
        share = max(((g > r + 40) & (g > b + 40)).mean(), ((r > g + 60) & (r > b + 60)).mean())
        if share > 0.6:
            return "card"
    return "content"


def detect_start(f, window=25.0, fps=8):
    """Skip leading black and any rating card (plus the black after it). Returns seconds."""
    labels = [classify(x) for x in frames(f, 0, window, fps)]
    i = 0
    while i < len(labels) and labels[i] == "black":
        i += 1
    # A rating card only counts as a lead-in when it opens the upload (right after the leading
    # black) and holds for a while: MPAA / age-rating cards sit for ~4-5 s, a red studio logo or a
    # saturated shot later on is trailer content and is kept.
    run_end = i
    while run_end < len(labels) and (labels[run_end] == "card" or "card" in labels[run_end + 1 : run_end + 3]):
        run_end += 1
    if i < len(labels) and labels[i] == "card" and i / fps < 3 and (run_end - i) / fps >= 1.5:
        i = run_end
        while i < len(labels) and labels[i] == "black":  # the fade after the card
            i += 1
    start = refine_start(f, i / fps) if i else 0.0
    return start, "".join({"black": ".", "card": "C", "content": "#"}[l] for l in labels)


def refine_start(f, rough):
    """Frame-accurate: the first frame at/after rough-0.25 s that is not black (Y average)."""
    lo = max(0.0, rough - 0.25)
    out = subprocess.run(["ffmpeg", "-v", "info", "-ss", str(lo), "-t", "0.75", "-i", str(f), "-vf",
                          "signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-", "-f", "null", "-"],
                         capture_output=True, text=True).stdout
    for t, y in re.findall(r"pts_time:([0-9.]+)\s+lavfi.signalstats.YAVG=([0-9.]+)", out):
        if float(y) > 22:
            return round(lo + float(t), 3)
    return round(rough, 3)


def detect_crop(f, dur):
    out = subprocess.run(["ffmpeg", "-v", "info", "-ss", str(max(1, dur * 0.1)), "-t", str(dur * 0.8),
                          "-i", str(f), "-vf", "fps=2,cropdetect=24:2:0", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    crops = re.findall(r"crop=(\d+):(\d+):(\d+):(\d+)", out)
    if not crops:
        return None
    # the most common box with the largest height wins (bright scenes reveal the real frame)
    from collections import Counter
    c = Counter(crops).most_common(6)
    best = max(c, key=lambda kv: (int(kv[0][1]), kv[1]))[0]
    w, h, x, y = map(int, best)
    return f"{w - w % 2}:{h - h % 2}:{x}:{y}"


def analyze(t, work):
    f = source_file(work)
    w, h, dur = probe(f)
    start, strip = detect_start(f)
    crop = detect_crop(f, dur)
    res = {"source": f.name, "width": w, "height": h, "duration": dur, "start": start, "crop": crop,
           "strip": strip}
    (work / "analysis.json").write_text(json.dumps(res, indent=2))
    log(f"[{t['id']}] {w}x{h} {dur:.1f}s start={start}s crop={crop}\n   first 25 s @8fps: {strip}")
    # contact sheet: first 16 s every 0.5 s, plus 6 frames across the body (subtitle check)
    stamps = [i * 0.5 for i in range(32)] + [dur * p for p in (0.2, 0.35, 0.5, 0.65, 0.8, 0.95)]
    from PIL import Image, ImageDraw
    tiles = []
    for s in stamps:
        p = work / f"_f{s:07.2f}.jpg"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(s), "-i", str(f), "-frames:v", "1",
                        "-vf", "scale=240:-2", str(p)], check=True)
        im = Image.open(p).convert("RGB")
        ImageDraw.Draw(im).text((3, 3), f"{s:.1f}", fill=(255, 255, 0))
        tiles.append(im)
        p.unlink()
    tw, th = tiles[0].size
    sheet = Image.new("RGB", (tw * 8, th * ((len(tiles) + 7) // 8)))
    for i, im in enumerate(tiles):
        sheet.paste(im.resize((tw, th)), ((i % 8) * tw, (i // 8) * th))
    sheet.save(work / "start.jpg", quality=80)
    log(f"[{t['id']}] contact sheet {work / 'start.jpg'}")


def encode(t, work, force=False):
    f = source_file(work)
    a = json.loads((work / "analysis.json").read_text()) if (work / "analysis.json").exists() else {}
    start = t.get("trim", {}).get("start", "auto")
    start = a.get("start", 0) if start == "auto" else float(start)
    end = t.get("trim", {}).get("end")
    crop = t.get("crop", "auto")
    crop = a.get("crop") if crop == "auto" else crop
    vf = ([f"crop={crop}"] if crop else []) + [
        f"scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=increase:flags=lanczos",
        f"crop={WIDTH}:{HEIGHT}", "setsar=1", "format=yuv420p"]
    CLIPS.mkdir(parents=True, exist_ok=True)
    common = ["-ss", str(start), "-i", str(f)] + (["-to", str(float(end) - start)] if end else []) + [
        "-an", "-sn", "-dn", "-map_metadata", "-1", "-vf", ",".join(vf)]
    for ext, codec in (("mp4", X264), ("webm", AV1)):
        out = CLIPS / f"{t['clip']}.{ext}"
        if out.exists() and not force:
            log(f"[{t['id']}] {out.name} exists (use --force)")
            continue
        run(["ffmpeg", "-v", "error", "-y"] + common + codec + [str(out)])
        log(f"[{t['id']}] {out.name} {out.stat().st_size / 1e6:.2f} MB")


def apply(titles):
    doc = json.loads(DATA.read_text())
    by_id = {e["id"]: e for e in doc["entries"]}
    for t in titles:
        e = by_id[t["id"]]
        if t.get("backdrop"):
            e["bannerUrl"] = f"{IMG}/w780{t['backdrop']}"
            e["bannerFocus"] = t.get("bannerFocus", "50% 30%")
        if t.get("clip") and ((CLIPS / f"{t['clip']}.mp4").exists() or t.get("clipHosted")):
            e["clip"] = t["clip"]
        if t.get("drawerYouTubeId"):
            e["trailerYouTubeId"] = t["drawerYouTubeId"]
        if t.get("poster") and not e.get("posterPath"):
            e["posterPath"] = f"{IMG}/w342{t['poster']}"
    DATA.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n")
    log(f"updated {DATA.relative_to(ROOT)} for {len(titles)} titles")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("steps", nargs="+",
                    choices=["resolve", "backdrops", "fetch", "analyze", "encode", "apply", "all"])
    ap.add_argument("--only", help="comma-separated entry ids")
    ap.add_argument("--work", default=os.environ.get("MEDIA_WORK", ROOT / ".media-work"))
    ap.add_argument("--force", action="store_true", help="re-encode existing clips")
    args = ap.parse_args()
    titles = json.loads(MANIFEST.read_text())["titles"]
    if args.only:
        keep = set(args.only.split(","))
        titles = [t for t in titles if t["id"] in keep]
    steps = ["fetch", "analyze", "encode", "apply"] if "all" in args.steps else args.steps
    for step in ("resolve", "backdrops", "fetch", "analyze", "encode"):
        if step not in steps:
            continue
        for t in titles:
            work = Path(args.work) / t["id"]
            work.mkdir(parents=True, exist_ok=True)
            if step in ("fetch", "analyze", "encode") and not t.get("trailer"):
                continue
            {"resolve": resolve, "backdrops": backdrops, "fetch": fetch, "analyze": analyze,
             "encode": lambda t, w: encode(t, w, args.force)}[step](t, work)
    if "apply" in steps:
        apply(titles)


if __name__ == "__main__":
    main()
