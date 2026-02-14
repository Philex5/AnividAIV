#!/usr/bin/env python3
import argparse
import base64
import hashlib
import json
import os
import pathlib
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from datetime import date, datetime


def load_env() -> None:
    for env_file in [".env.production", ".env.development", ".env"]:
        p = pathlib.Path(env_file)
        if not p.exists():
            continue
        for raw in p.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and value and key not in os.environ:
                os.environ[key] = value


def run_generation(args, work_dir: pathlib.Path) -> tuple[pathlib.Path, pathlib.Path]:
    run_id = datetime.now().strftime("%Y%m%d%H%M%S") + f"-{os.getpid()}"
    requests_jsonl = work_dir / "requests.jsonl"

    cmd = [
        "python3",
        "skills/model-example-quick-generator/scripts/batch_generate_examples.py",
        "--model-uuid",
        args.model_uuid,
        "--types",
        args.types,
        "--aspect-ratio",
        args.aspect_ratio,
        "--run-id",
        run_id,
        "--output",
        str(requests_jsonl),
    ]
    if args.theme:
        cmd.extend(["--theme", args.theme])
    if args.character:
        cmd.extend(["--character", args.character])
    if args.lock_character:
        cmd.append("--lock-character")

    subprocess.run(cmd, check=True)

    summary_path = work_dir / "generation-summary.json"

    python = f'''
import json, pathlib, urllib.request, urllib.parse, time
rows = [json.loads(x) for x in pathlib.Path(r"{requests_jsonl}").read_text(encoding="utf-8").splitlines() if x.strip()]
api_key = {json.dumps(os.environ.get("KIE_AI_API_KEY") or os.environ.get("API_KEY") or "")}
if not api_key:
    raise SystemExit("Missing KIE key")
headers = {{"Authorization": f"Bearer {{api_key}}", "Content-Type": "application/json"}}

def post_json(url, body):
    req = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"), headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode("utf-8"))

def get_json(url):
    req = urllib.request.Request(url, headers={{"Authorization": headers["Authorization"]}}, method="GET")
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode("utf-8"))

work_dir = pathlib.Path(r"{work_dir}")
manifest = {{"tasks": [], "model": {json.dumps(args.model_uuid)}, "run_id": {json.dumps(run_id)}, "created_at": {json.dumps(datetime.now().isoformat())}}}

types = {json.dumps(args.types.split(","))}
for i, row in enumerate(rows, start=1):
    body = {{"model": {json.dumps(args.model_uuid)}, "input": {{"prompt": row["prompt"], "aspect_ratio": {json.dumps(args.aspect_ratio)}}}}}
    resp = post_json("https://api.kie.ai/api/v1/jobs/createTask", body)
    task_id = (resp.get("data") or {{}}).get("taskId")
    if not task_id:
        manifest["tasks"].append({{"index": i, "style_key": types[i-1], "status": "create_failed", "prompt": row["prompt"]}})
        continue
    manifest["tasks"].append({{"index": i, "style_key": types[i-1], "status": "submitted", "task_id": task_id, "prompt": row["prompt"], "files": []}})

for task in manifest["tasks"]:
    if task["status"] != "submitted":
        continue
    end = time.time() + 900
    while time.time() < end:
        qurl = "https://api.kie.ai/api/v1/jobs/recordInfo?" + urllib.parse.urlencode({{"taskId": task["task_id"]}})
        q = get_json(qurl)
        state = ((q.get("data") or {{}}).get("state") or "").lower()
        task["last_query"] = q
        if state in {{"success", "fail"}}:
            task["status"] = state
            break
        time.sleep(6)
    else:
        task["status"] = "timeout"

    if task["status"] != "success":
        continue

    result_json = ((task.get("last_query") or {{}}).get("data") or {{}}).get("resultJson")
    urls = []
    if isinstance(result_json, str) and result_json.strip():
        try:
            parsed = json.loads(result_json)
            urls = parsed.get("resultUrls") or parsed.get("urls") or []
        except Exception:
            pass

    for image_index, url in enumerate(urls, start=1):
        ext = pathlib.Path(urllib.parse.urlparse(url).path).suffix.lower() or ".png"
        out = work_dir / f"{{task['index']:02d}}-{{task['style_key']}}-{{image_index:02d}}{{ext}}"
        req = urllib.request.Request(url, headers={{"User-Agent": "Mozilla/5.0"}}, method="GET")
        with urllib.request.urlopen(req, timeout=180) as r:
            out.write_bytes(r.read())
        task["files"].append({{"source_url": url, "local_path": str(out)}})

pathlib.Path(r"{summary_path}").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
print(pathlib.Path(r"{summary_path}"))
'''
    subprocess.run(["python3", "-c", python], check=True)
    return requests_jsonl, summary_path


def cloudinary_to_webp(work_dir: pathlib.Path) -> pathlib.Path:
    cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME", "")
    api_key = os.environ.get("CLOUDINARY_API_KEY", "")
    api_secret = os.environ.get("CLOUDINARY_API_SECRET", "")
    if not cloud_name or not api_key or not api_secret:
        raise RuntimeError("Cloudinary env is missing")

    png_files = sorted(work_dir.glob("*.png"))
    if not png_files:
        raise RuntimeError("No PNG files found to convert")

    webp_dir = work_dir / "webp"
    webp_dir.mkdir(exist_ok=True)

    def sign(fields):
        raw = "&".join([f"{k}={fields[k]}" for k in sorted(fields.keys())]) + api_secret
        return hashlib.sha1(raw.encode("utf-8")).hexdigest()

    upload_url = f"https://api.cloudinary.com/v1_1/{cloud_name}/image/upload"
    items = []

    for idx, png_path in enumerate(png_files, start=1):
        timestamp = int(time.time())
        public_id = f"anivid-temp/z-image-examples/{png_path.stem}-{timestamp}-{idx}"
        sign_fields = {
            "format": "webp",
            "overwrite": "true",
            "public_id": public_id,
            "timestamp": str(timestamp),
        }
        form = {
            "file": "data:image/png;base64," + base64.b64encode(png_path.read_bytes()).decode("ascii"),
            "public_id": public_id,
            "timestamp": str(timestamp),
            "overwrite": "true",
            "format": "webp",
            "api_key": api_key,
            "signature": sign(sign_fields),
        }

        req = urllib.request.Request(
            upload_url,
            data=urllib.parse.urlencode(form).encode("utf-8"),
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=240) as resp:
            payload = json.loads(resp.read().decode("utf-8"))

        secure_url = payload.get("secure_url")
        if not secure_url:
            raise RuntimeError(f"Missing Cloudinary secure_url for {png_path.name}")

        out_path = webp_dir / f"{png_path.stem}.webp"
        with urllib.request.urlopen(
            urllib.request.Request(secure_url, headers={"User-Agent": "Mozilla/5.0"}),
            timeout=240,
        ) as r:
            out_path.write_bytes(r.read())

        items.append(
            {
                "source_png": str(png_path),
                "webp_path": str(out_path),
                "cloudinary_url": secure_url,
                "png_size": png_path.stat().st_size,
                "webp_size": out_path.stat().st_size,
            }
        )

    summary = {
        "count": len(items),
        "total_png_size": sum(i["png_size"] for i in items),
        "total_webp_size": sum(i["webp_size"] for i in items),
        "items": items,
    }
    summary_path = work_dir / "webp-conversion-summary.json"
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    return summary_path


def upload_to_r2(work_dir: pathlib.Path) -> pathlib.Path:
    helper = work_dir / "upload_to_r2_helper.ts"
    helper.write_text(
        """
import { config } from \"dotenv\";
import fs from \"node:fs/promises\";
import path from \"node:path\";
import { Storage } from \"../../src/lib/storage\";

async function main() {
  config({ path: \".env.production\", override: true });
  config({ path: \".env.development\", override: false });

  const baseDir = process.argv[2];
  const outPath = process.argv[3];
  if (!baseDir || !outPath) throw new Error(\"Missing args\");

  const files = (await fs.readdir(baseDir)).filter((f) => f.endsWith(\".webp\")).sort();
  if (!files.length) throw new Error(\"No webp files found\");

  const storage = new Storage();
  const uploaded = [];

  for (const file of files) {
    const full = path.join(baseDir, file);
    const buf = await fs.readFile(full);
    const key = `gallery/anime/z-image/${file}`;
    const result = await storage.uploadFile({ body: buf, key, contentType: \"image/webp\", disposition: \"inline\" });
    uploaded.push({ file, key, url: result.url, size: buf.length });
  }

  await fs.writeFile(outPath, JSON.stringify({ count: uploaded.length, uploaded }, null, 2), \"utf-8\");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
""".strip(),
        encoding="utf-8",
    )

    webp_dir = work_dir / "webp"
    out_path = work_dir / "r2-upload-summary.json"
    subprocess.run(
        ["pnpm", "tsx", str(helper), str(webp_dir), str(out_path)],
        check=True,
    )
    return out_path


def update_config(work_dir: pathlib.Path, generation_summary: pathlib.Path, r2_summary: pathlib.Path) -> pathlib.Path:
    manifest = json.loads(generation_summary.read_text(encoding="utf-8"))
    upload = json.loads(r2_summary.read_text(encoding="utf-8"))

    key_by_style = {}
    for item in upload.get("uploaded", []):
        name = pathlib.Path(item["key"]).name
        parts = name.split("-")
        style = "-".join(parts[1:-1])
        key_by_style[style] = item["key"]

    meta = {
        "ink-wash-character": ("Ink Wash Character", "ink wash martial artist in misty mountains", "ink-wash"),
        "cyberpunk-streetscape": ("Cyberpunk Streetscape", "cyberpunk futuristic city street scene", "cyberpunk"),
        "anime-battle-clash": ("Anime Battle Clash", "anime battle clash with dynamic impact", "anime-action"),
        "watercolor-landscape": ("Watercolor Landscape", "watercolor natural landscape scene", "watercolor"),
        "noir-cityscape": ("Noir Cityscape", "neo-noir city alley atmosphere", "noir"),
        "mecha-hangar": ("Mecha Hangar", "giant mecha in industrial hangar", "mecha"),
        "ghibli-warm-story": ("Warm Story Scene", "warm storybook countryside scene", "warm-story"),
        "surreal-dreamscape": ("Surreal Dreamscape", "surreal dream world with impossible architecture", "surreal"),
        "photoreal-portrait-reference": ("Photoreal Portrait", "realistic portrait benchmark with natural skin texture", "photoreal-reference"),
    }

    examples = []
    for idx, task in enumerate(manifest.get("tasks", []), start=1):
        style = task.get("style_key", "")
        title, alt, style_tag = meta.get(style, (style.replace("-", " ").title(), style, style))
        r2_path = key_by_style.get(style)
        if not r2_path:
            continue

        examples.append(
            {
                "uuid": f"zi-ex-{idx:03d}",
                "r2_path": r2_path,
                "alt": alt,
                "aspect_ratio": "3:4",
                "title": title,
                "parameters": {
                    "model_id": "z-image",
                    "prompt": task.get("prompt", ""),
                    "style": style_tag,
                    "scene": "",
                    "outfit": "",
                    "character": "",
                    "action": "",
                },
                "sort_order": idx,
            }
        )

    out_path = pathlib.Path("src/configs/gallery/models/z-image-examples.json")
    output = {
        "version": "1.2.0",
        "lastUpdated": str(date.today()),
        "description": "Example images for Z-Image model showcase",
        "modelId": "z-image",
        "modelName": "Z-Image",
        "examples": examples,
    }
    out_path.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return out_path


def main() -> int:
    parser = argparse.ArgumentParser(description="Run full z-image example pipeline")
    parser.add_argument("--model-uuid", default="z-image")
    parser.add_argument(
        "--types",
        default="fantasy-epic,cyberpunk-streetscape,mecha-hangar,watercolor-landscape,character-portrait,full-body-turnaround,photoreal-portrait-reference,ink-wash-character,surreal-dreamscape,minimal-flat-illustration",
    )
    parser.add_argument("--aspect-ratio", default="3:4")
    parser.add_argument("--theme", default="")
    parser.add_argument("--character", default="")
    parser.add_argument("--lock-character", action="store_true")
    parser.add_argument("--work-dir", default="")
    args = parser.parse_args()

    load_env()

    if not (os.environ.get("KIE_AI_API_KEY") or os.environ.get("API_KEY")):
        raise RuntimeError("Missing KIE key")

    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    work_dir = pathlib.Path(args.work_dir) if args.work_dir else pathlib.Path(f".temp/z-image-full-pipeline-{timestamp}")
    work_dir.mkdir(parents=True, exist_ok=True)

    requests_jsonl, generation_summary = run_generation(args, work_dir)
    webp_summary = cloudinary_to_webp(work_dir)
    r2_summary = upload_to_r2(work_dir)
    config_path = update_config(work_dir, generation_summary, r2_summary)

    result = {
        "work_dir": str(work_dir),
        "requests_jsonl": str(requests_jsonl),
        "generation_summary": str(generation_summary),
        "webp_summary": str(webp_summary),
        "r2_summary": str(r2_summary),
        "config_path": str(config_path),
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as error:
        print(f"Error: {error}", file=sys.stderr)
        sys.exit(1)
