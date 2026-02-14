#!/usr/bin/env python3
import argparse
import hashlib
import json
import os
import random
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Dict, List, Optional, Tuple, Union

KIE_CREATE_TASK_URL = "https://api.kie.ai/api/v1/jobs/createTask"
KIE_QUERY_TASK_URL = "https://api.kie.ai/api/v1/jobs/recordInfo"

DEFAULT_TYPES = [
    "fantasy-epic",
    "cyberpunk-streetscape",
    "mecha-hangar",
    "watercolor-landscape",
    "character-portrait",
    "full-body-turnaround",
    "photoreal-portrait-reference",
    "ink-wash-character",
    "surreal-dreamscape",
    "minimal-flat-illustration",
]

STYLE_CATALOG: Dict[str, Dict[str, Union[List[str], str]]] = {
    "character-portrait": {
        "subjects": [
            "an anime lead with expressive eyes and clear facial rhythm",
            "a confident protagonist portrait with subtle personality props",
            "a stylized hero bust shot with refined facial anatomy",
        ],
        "scenes": [
            "studio portrait setup with shallow depth and clean backdrop",
            "sunlit interior corner with gentle practical lights",
            "rainy-window side profile framing with reflective highlights",
        ],
        "style_notes": [
            "keep anime facial language clean and production-ready",
            "balance emotional readability and elegant line discipline",
            "prioritize skin rendering clarity and hair strand structure",
        ],
        "scope": "detailed",
    },
    "ink-wash-character": {
        "subjects": [
            "a martial artist poised before mist and pine silhouettes",
            "a wandering swordsman near a cliffside stone path",
            "a scholar-warrior with flowing robe and calligraphic motion",
        ],
        "scenes": [
            "negative-space heavy composition with mountain fog layers",
            "riverbank with drifting ink clouds and sparse architecture",
            "wind-swept valley where brush-stroke textures dominate",
        ],
        "style_notes": [
            "emphasize ink diffusion and intentional brush pressure",
            "let monochrome contrast drive visual hierarchy",
            "preserve poetic emptiness instead of overfilling details",
        ],
        "scope": "balanced",
    },
    "anime-battle-clash": {
        "subjects": [
            "two fighters colliding mid-air at peak impact",
            "a high-speed duel where blades and energy effects intersect",
            "a frame-frozen combat explosion with opposing silhouettes",
        ],
        "scenes": [
            "collapsed arena fragments and shockwave debris",
            "storm clouds split by impact light",
            "city rooftop battlefield with dramatic depth falloff",
        ],
        "style_notes": [
            "push dynamic foreshortening and speed-line control",
            "stage clear primary and secondary motion arcs",
            "keep action readability despite dense effects",
        ],
        "scope": "grand",
    },
    "cyberpunk-streetscape": {
        "subjects": [
            "a dense neon street with layered traffic and crowd flow",
            "multi-level transit corridor in a futuristic district",
            "market lane full of holographic signs and reflective materials",
        ],
        "scenes": [
            "rain-soaked pavement with light bounce from signage",
            "narrow alley opening into a megacity vista",
            "street crossing with suspended rails and ad drones",
        ],
        "style_notes": [
            "build depth through atmosphere and signage parallax",
            "keep urban storytelling details purposeful",
            "preserve color contrast without clipping highlights",
        ],
        "scope": "grand",
    },
    "watercolor-landscape": {
        "subjects": [
            "a serene valley with river bends and distant peaks",
            "a lakeside meadow with layered tree silhouettes",
            "rolling hills around a quiet village in soft haze",
        ],
        "scenes": [
            "wide scenic setup with foreground foliage framing",
            "misty morning gradient with controlled edge bleeding",
            "sunbreak through cloud layers over reflective water",
        ],
        "style_notes": [
            "retain watercolor texture and paper grain nuance",
            "prioritize soft transitions and gentle value grouping",
            "avoid overly digital hard edges",
        ],
        "scope": "grand",
    },
    "noir-cityscape": {
        "subjects": [
            "a noir alley with wet pavement and heavy shadow blocks",
            "urban canyon street framed by brutalist architecture",
            "a lone figure crossing an underlit city corridor",
        ],
        "scenes": [
            "single key light cutting through fog and rain",
            "high-contrast silhouettes with selective neon accents",
            "deep perspective lane with reflective asphalt texture",
        ],
        "style_notes": [
            "use shadow massing to shape narrative focus",
            "control contrast for cinematic noir rhythm",
            "keep atmosphere moody but legible",
        ],
        "scope": "grand",
    },
    "mecha-hangar": {
        "subjects": [
            "a giant mecha under maintenance with crew scale reference",
            "industrial bay containing modular robot parts",
            "launch-ready mecha platform surrounded by support rigs",
        ],
        "scenes": [
            "wide-angle shot emphasizing massive architecture",
            "overhead gantry lights and volumetric dust layers",
            "engineering floor with warning markings and cables",
        ],
        "style_notes": [
            "highlight hard-surface structure and believable mechanics",
            "preserve material contrast across painted metal parts",
            "balance environmental scale and focal clarity",
        ],
        "scope": "grand",
    },
    "full-body-turnaround": {
        "subjects": [
            "a full-body character concept with silhouette clarity",
            "a standing hero design with complete outfit readability",
            "a production-ready character sheet style front pose",
        ],
        "scenes": [
            "neutral concept backdrop with subtle gradient",
            "minimal environment to keep full-body proportion focus",
            "studio board framing that preserves outfit details",
        ],
        "style_notes": [
            "maintain proportion accuracy from head to footwear",
            "keep costume layers clearly separated",
            "ensure design language remains coherent",
        ],
        "scope": "detailed",
    },
    "battle-action": {
        "subjects": [
            "a decisive strike moment between two combatants",
            "a fast close-combat exchange with clear motion arcs",
            "an action keyframe where force direction is obvious",
        ],
        "scenes": [
            "debris and sparks framing a diagonal action path",
            "foreground-to-background depth split with speed cues",
            "high-impact frame with dramatic collision lighting",
        ],
        "style_notes": [
            "preserve anatomy integrity under extreme poses",
            "keep motion clarity over visual noise",
            "shape a readable main hit point",
        ],
        "scope": "balanced",
    },
    "slice-of-life": {
        "subjects": [
            "a warm daily-life character interaction",
            "a quiet everyday moment with natural gestures",
            "a friendly domestic scene with subtle storytelling props",
        ],
        "scenes": [
            "sunlit kitchen corner with practical objects",
            "small cafe window table scene",
            "residential street at late afternoon",
        ],
        "style_notes": [
            "favor emotional softness and believable body language",
            "keep composition comfortable and intimate",
            "maintain gentle color harmony",
        ],
        "scope": "detailed",
    },
    "fantasy-epic": {
        "subjects": [
            "a fantasy hero overlooking a vast magical realm",
            "an adventurer standing before colossal ancient ruins",
            "a sorcerer confronting a sky-scale phenomenon",
        ],
        "scenes": [
            "grand valley panorama with layered atmospheric depth",
            "floating architecture and distant mountain chains",
            "monumental scale shot with cinematic horizon sweep",
        ],
        "style_notes": [
            "sell epic scale through perspective hierarchy",
            "integrate magic motifs without cluttering focal path",
            "preserve rich tonal separation in the far distance",
        ],
        "scope": "grand",
    },
    "cyberpunk-sci-fi": {
        "subjects": [
            "a high-tech megacity narrative moment at night",
            "augmented pedestrians moving through neon transit layers",
            "future district intersection with multi-level transport",
        ],
        "scenes": [
            "wet surfaces amplifying teal-magenta reflections",
            "deep avenue with stacked holographic signage",
            "dense city canyons fading into luminous haze",
        ],
        "style_notes": [
            "drive sci-fi believability with functional details",
            "keep noise controlled despite visual density",
            "maintain readable silhouette boundaries",
        ],
        "scope": "grand",
    },
    "mecha-design": {
        "subjects": [
            "a next-gen mecha unit in three-quarter presentation",
            "a hard-surface robot concept with pilot scale marker",
            "a tactical mech frame showing modular armor zones",
        ],
        "scenes": [
            "clean technical stage with neutral depth",
            "engineering platform with restrained environment detail",
            "design showcase frame emphasizing proportion logic",
        ],
        "style_notes": [
            "stress mechanical articulation and panel logic",
            "keep material assignment consistent",
            "avoid over-ornamentation that hurts readability",
        ],
        "scope": "detailed",
    },
    "ghibli-warm-story": {
        "subjects": [
            "a whimsical countryside storytelling moment",
            "an inviting village path with gentle character presence",
            "a hand-painted warm world with organic architecture",
        ],
        "scenes": [
            "golden-hour light passing through trees",
            "storybook-like wide composition with soft rhythm",
            "warm domestic exterior with painterly cloud layers",
        ],
        "style_notes": [
            "keep painterly textures lively and soft",
            "prioritize warmth and narrative comfort",
            "retain handcrafted atmosphere",
        ],
        "scope": "balanced",
    },
    "surreal-dreamscape": {
        "subjects": [
            "an impossible architectural dream world",
            "floating symbolic objects over layered void spaces",
            "a dream logic environment with shifting scale",
        ],
        "scenes": [
            "multi-plane composition with gravity-defying structures",
            "ethereal mist corridors and luminous portals",
            "fragmented horizon where objects overlap unrealistically",
        ],
        "style_notes": [
            "preserve surreal coherence through intentional focal anchors",
            "mix contrast and softness to imply dream tension",
            "avoid random chaos without structure",
        ],
        "scope": "grand",
    },
    "minimal-flat-illustration": {
        "subjects": [
            "a stylized anime-inspired scene reduced to essential shapes",
            "graphic character-environment interaction with minimal forms",
            "poster-like composition driven by color geometry",
        ],
        "scenes": [
            "clean 3-5 color layout with strong negative space",
            "flat depth layering and bold shape rhythm",
            "highly simplified visual storytelling frame",
        ],
        "style_notes": [
            "enforce strict shape discipline",
            "keep edges crisp and hierarchy obvious",
            "avoid texture-heavy rendering",
        ],
        "scope": "detailed",
    },
    "photoreal-portrait-reference": {
        "subjects": [
            "a photoreal head-and-shoulders portrait of a contemporary person",
            "a realistic portrait reference with natural expression and skin texture",
            "a high-fidelity face study suitable for portrait benchmarking",
        ],
        "scenes": [
            "studio setup with neutral background and controlled key light",
            "window-side portrait with soft daylight falloff",
            "editorial portrait framing with subtle depth-of-field blur",
        ],
        "style_notes": [
            "focus on realistic skin pores, micro-contrast, and true-to-life lighting",
            "avoid anime stylization and keep facial proportions lifelike",
            "preserve texture realism in hair, eyelashes, and fabric",
        ],
        "scope": "detailed",
    },
}

DEFAULT_THEMES: Dict[str, str] = {
    "character-portrait": "hero identity card key visual",
    "ink-wash-character": "traditional wuxia character poster",
    "anime-battle-clash": "anime action showcase frame",
    "cyberpunk-streetscape": "future city worldbuilding showcase",
    "watercolor-landscape": "poetic nature scene illustration",
    "noir-cityscape": "urban noir visual exploration",
    "mecha-hangar": "industrial sci-fi setting concept",
    "full-body-turnaround": "character design turnaround board",
    "battle-action": "combat choreography keyframe",
    "slice-of-life": "cozy daily-life animation frame",
    "fantasy-epic": "magic realm cinematic matte",
    "cyberpunk-sci-fi": "neon metropolis story moment",
    "mecha-design": "robot unit design sheet",
    "ghibli-warm-story": "warm storybook countryside",
    "surreal-dreamscape": "dream logic visual experiment",
    "minimal-flat-illustration": "graphic minimal art direction board",
    "photoreal-portrait-reference": "realistic portrait benchmark reference",
}

NEGATIVE_FRAGMENT = (
    "blurry, low quality, watermark, text artifacts, distorted anatomy, incorrect proportions, noisy artifacts"
)
QUALITY_FRAGMENT_POOL = [
    "high detail, coherent composition, clear focal hierarchy",
    "production-ready quality, clean structure, refined rendering",
    "strong readability, polished finish, balanced detail density",
]

STYLE_CATEGORY_MAP: Dict[str, str] = {
    "fantasy-epic": "grand-scene",
    "cyberpunk-streetscape": "grand-scene",
    "mecha-hangar": "grand-scene",
    "watercolor-landscape": "grand-scene",
    "character-portrait": "fine-detail",
    "full-body-turnaround": "fine-detail",
    "photoreal-portrait-reference": "fine-detail",
    "ink-wash-character": "abstract-art",
    "surreal-dreamscape": "abstract-art",
    "minimal-flat-illustration": "abstract-art",
}

CATEGORY_INSTRUCTIONS: Dict[str, str] = {
    "grand-scene": "Emphasize monumental scale, deep spatial layering, and cinematic environmental storytelling.",
    "fine-detail": "Emphasize material realism, precise local details, and subtle texture transitions.",
    "abstract-art": "Emphasize artistic abstraction, symbolic composition, and intentional stylization.",
}

CATEGORY_DESCRIPTIONS: Dict[str, str] = {
    "grand-scene": "monumental scale, deep spatial layering, cinematic environmental storytelling",
    "fine-detail": "material realism, precise local detail, subtle texture transitions",
    "abstract-art": "artistic abstraction, symbolic composition, intentional stylization",
}

SUBJECT_ANCHOR_POOL = [
    "celestial guardian",
    "urban courier",
    "arcane scholar",
    "desert engineer",
    "forest ranger",
    "street musician",
    "deep-sea explorer",
    "mountain cartographer",
    "clockwork artisan",
    "storm chaser",
    "lunar botanist",
    "retro pilot",
    "festival performer",
    "ruins archaeologist",
    "drift racer",
    "tea-house owner",
    "signal hacker",
    "museum conservator",
    "volcanic blacksmith",
    "ice-field researcher",
    "night market chef",
    "airship navigator",
    "temple caretaker",
    "bioluminescent diver",
]

PROMPT_VARIANTS = {
    "camera": [
        "cinematic framing",
        "storyboard-style framing",
        "dynamic lens perspective",
        "clear depth layering",
        "illustration-focused camera angle",
    ],
    "mood": [
        "strong visual storytelling",
        "emotionally readable scene intent",
        "clear narrative atmosphere",
        "high style coherence",
        "distinct art-direction identity",
    ],
    "detail": [
        "clean material rendering",
        "consistent edge quality",
        "well-structured focal hierarchy",
        "controlled texture density",
        "balanced detail distribution",
    ],
}


def parse_types(raw_types: str) -> List[str]:
    if not raw_types:
        return DEFAULT_TYPES.copy()

    parsed = [item.strip() for item in raw_types.split(",") if item.strip()]
    if not parsed:
        return DEFAULT_TYPES.copy()

    unknown = [item for item in parsed if item not in STYLE_CATALOG]
    if unknown:
        raise ValueError(f"Unknown style type(s): {', '.join(unknown)}")

    return parsed


def pick_variant(run_id: str, style_key: str, index: int, values: List[str]) -> str:
    seed_input = f"{run_id}:{style_key}:{index}"
    seed = int(hashlib.sha256(seed_input.encode("utf-8")).hexdigest()[:12], 16)
    rnd = random.Random(seed)
    return values[rnd.randrange(0, len(values))]


def pick_unique_subject_anchor(run_id: str, style_key: str, used_anchors: set) -> str:
    if len(used_anchors) >= len(SUBJECT_ANCHOR_POOL):
        raise RuntimeError("Not enough unique subject anchors for selected style count")

    candidates = SUBJECT_ANCHOR_POOL.copy()
    seed_input = f"{run_id}:{style_key}:subject-anchor"
    seed = int(hashlib.sha256(seed_input.encode("utf-8")).hexdigest()[:12], 16)
    random.Random(seed).shuffle(candidates)

    for candidate in candidates:
        if candidate not in used_anchors:
            used_anchors.add(candidate)
            return candidate

    raise RuntimeError("Failed to pick a unique subject anchor")


def build_prompt(
    theme: str,
    character: str,
    style_key: str,
    lock_character: bool,
    run_id: str,
    subject_anchor: str,
) -> str:
    profile = STYLE_CATALOG[style_key]
    scene = pick_variant(run_id, style_key, 11, profile["scenes"])
    style_note = pick_variant(run_id, style_key, 12, profile["style_notes"])
    theme_value = theme.strip() if theme and theme.strip() else DEFAULT_THEMES.get(
        style_key, "anime model showcase benchmark"
    )

    subject_phrase = f"a distinct {subject_anchor} as the primary subject"
    if lock_character and character:
        subject_phrase = f"{character} as the primary subject with consistent visual identity"
    elif character:
        subject_phrase = (
            f"a distinct {subject_anchor} as the primary subject, subtly inspired by {character}"
        )

    camera_variant = pick_variant(run_id, style_key, 1, PROMPT_VARIANTS["camera"])
    mood_variant = pick_variant(run_id, style_key, 2, PROMPT_VARIANTS["mood"])
    detail_variant = pick_variant(run_id, style_key, 3, PROMPT_VARIANTS["detail"])
    quality_variant = pick_variant(run_id, style_key, 4, QUALITY_FRAGMENT_POOL)
    category = STYLE_CATEGORY_MAP.get(style_key, "fine-detail")
    category_description = CATEGORY_DESCRIPTIONS[category]

    theme_fragment = ""
    normalized_theme = theme_value.lower().strip()
    if (
        theme_value
        and normalized_theme != "model capability benchmark set"
        and normalized_theme != "anime model capability benchmark set"
    ):
        theme_fragment = f"{theme_value}, "

    negative_clean = NEGATIVE_FRAGMENT.replace(", ", ", no ")
    return (
        f"{theme_fragment}{subject_phrase}, {scene}, {style_note}, "
        f"{category_description}, {camera_variant}, {mood_variant}, {detail_variant}, "
        f"{quality_variant}, no unrelated aesthetics, no repeated identity motifs, no {negative_clean}"
    )


def build_payload(args: argparse.Namespace, style_key: str, subject_anchor: str) -> Dict:
    payload = {
        "gen_type": "anime",
        "prompt": build_prompt(
            args.theme,
            args.character,
            style_key,
            args.lock_character,
            args.run_id,
            subject_anchor,
        ),
        "model_uuid": args.model_uuid,
        "aspect_ratio": args.aspect_ratio,
        "batch_size": args.batch_size,
        "visibility_level": args.visibility_level,
    }

    if args.reference_image_urls:
        payload["reference_image_urls"] = [
            item.strip()
            for item in args.reference_image_urls.split(",")
            if item.strip()
        ]

    return payload


def load_env() -> None:
    for env_file in [".env.production", ".env.development", ".env"]:
        if not os.path.exists(env_file):
            continue
        with open(env_file, "r", encoding="utf-8") as file:
            for raw in file:
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and value and key not in os.environ:
                    os.environ[key] = value


def parse_headers(header_values: List[str]) -> Dict[str, str]:
    headers = {"Content-Type": "application/json"}
    for item in header_values:
        if ":" not in item:
            raise ValueError(f"Invalid header format: {item}")
        key, value = item.split(":", 1)
        key = key.strip()
        value = value.strip()
        if not key:
            raise ValueError(f"Invalid header key in: {item}")
        headers[key] = value
    return headers


def resolve_provider_headers(provider: str, headers: Dict[str, str]) -> Dict[str, str]:
    merged = dict(headers)
    if provider == "kie":
        api_key = os.environ.get("KIE_AI_API_KEY", "").strip() or os.environ.get("API_KEY", "").strip()
        if not api_key:
            raise ValueError("Missing KIE key, set KIE_AI_API_KEY or API_KEY")
        merged["Authorization"] = f"Bearer {api_key}"
    return merged


def request_json(url: str, headers: Dict[str, str], method: str, body: Optional[Dict] = None) -> Dict:
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            raw = response.read().decode("utf-8")
            if response.status < 200 or response.status >= 300:
                raise RuntimeError(f"Request failed: {response.status}, body: {raw}")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        body_text = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Request failed: {exc.code}, body: {body_text}") from exc


def submit_payload(provider: str, api_base: str, headers: Dict[str, str], payload: Dict) -> Dict:
    if provider == "kie":
        body = {
            "model": payload.get("model_uuid", ""),
            "input": {
                "prompt": payload.get("prompt", ""),
                "aspect_ratio": payload.get("aspect_ratio", "3:4"),
            },
        }
        reference_image_urls = payload.get("reference_image_urls")
        if isinstance(reference_image_urls, list) and reference_image_urls:
            body["input"]["image_urls"] = reference_image_urls
        return request_json(KIE_CREATE_TASK_URL, headers, "POST", body)

    endpoint = api_base.rstrip("/") + "/api/anime-generation/create-task"
    return request_json(endpoint, headers, "POST", payload)


def extract_generation_uuid(provider: str, response: Dict) -> str:
    if provider == "kie":
        data = response.get("data") if isinstance(response, dict) else None
        task_id = data.get("taskId") if isinstance(data, dict) else None
        if isinstance(task_id, str) and task_id:
            return task_id
        raise RuntimeError(f"Missing taskId in KIE createTask response: {response}")

    if "generation_uuid" in response and isinstance(response["generation_uuid"], str):
        return response["generation_uuid"]

    data = response.get("data") if isinstance(response, dict) else None
    if isinstance(data, dict) and isinstance(data.get("generation_uuid"), str):
        return data["generation_uuid"]

    raise RuntimeError(f"Missing generation_uuid in create-task response: {response}")


def fetch_status(provider: str, api_base: str, headers: Dict[str, str], generation_uuid: str) -> Dict:
    if provider == "kie":
        query = urllib.parse.urlencode({"taskId": generation_uuid})
        endpoint = f"{KIE_QUERY_TASK_URL}?{query}"
        return request_json(endpoint, headers, "GET", None)

    endpoint = api_base.rstrip("/") + f"/api/generation/status/{generation_uuid}"
    return request_json(endpoint, headers, "GET", None)


def extract_status_and_urls(provider: str, status_response: Dict) -> Tuple[str, List[str], str]:
    if provider == "kie":
        data = status_response.get("data") if isinstance(status_response.get("data"), dict) else {}
        raw_state = data.get("state") if isinstance(data, dict) else ""
        state = (raw_state or "").lower() if isinstance(raw_state, str) else "unknown"
        if state == "success":
            normalized = "completed"
        elif state == "fail":
            normalized = "failed"
        else:
            normalized = state or "unknown"

        error_message = ""
        if isinstance(data, dict):
            maybe_error = data.get("failMsg") or data.get("error_message") or data.get("message")
            if isinstance(maybe_error, str):
                error_message = maybe_error

        urls: List[str] = []
        if isinstance(data, dict):
            result_json = data.get("resultJson")
            if isinstance(result_json, str) and result_json.strip():
                try:
                    parsed = json.loads(result_json)
                except Exception:
                    parsed = {}
                if isinstance(parsed, dict):
                    for key in ["resultUrls", "urls", "images"]:
                        candidate = parsed.get(key)
                        if isinstance(candidate, list):
                            for item in candidate:
                                if isinstance(item, str) and item.strip():
                                    urls.append(item.strip())
                            if urls:
                                break

        return normalized, urls, error_message

    payload = status_response.get("data") if isinstance(status_response.get("data"), dict) else status_response

    status = payload.get("status") if isinstance(payload, dict) else None
    if not isinstance(status, str):
        status = "unknown"

    error_message = ""
    if isinstance(payload, dict):
        maybe_error = payload.get("error_message") or payload.get("message")
        if isinstance(maybe_error, str):
            error_message = maybe_error

    urls: List[str] = []
    if isinstance(payload, dict):
        for key in ["results", "resultUrls", "image_urls", "urls"]:
            candidate = payload.get(key)
            if isinstance(candidate, list):
                for item in candidate:
                    if isinstance(item, str) and item.strip():
                        urls.append(item.strip())
                    elif isinstance(item, dict):
                        for nested_key in ["image_url", "url", "imageUrl"]:
                            nested = item.get(nested_key)
                            if isinstance(nested, str) and nested.strip():
                                urls.append(nested.strip())
                if urls:
                    break

    return status.lower(), urls, error_message


def poll_until_done(
    provider: str,
    api_base: str,
    headers: Dict[str, str],
    generation_uuid: str,
    timeout_seconds: int,
    interval_seconds: int,
) -> Dict:
    start = time.time()
    while True:
        status_response = fetch_status(provider, api_base, headers, generation_uuid)
        status, urls, error_message = extract_status_and_urls(provider, status_response)

        if status == "completed":
            return {
                "status": status,
                "urls": urls,
                "error_message": error_message,
                "raw": status_response,
            }

        if status == "failed":
            return {
                "status": status,
                "urls": urls,
                "error_message": error_message,
                "raw": status_response,
            }

        elapsed = time.time() - start
        if elapsed >= timeout_seconds:
            return {
                "status": "timeout",
                "urls": urls,
                "error_message": f"Polling timed out after {timeout_seconds} seconds",
                "raw": status_response,
            }

        time.sleep(interval_seconds)


def ensure_output_dir(download_dir: str) -> str:
    resolved = download_dir.strip()
    if not resolved:
        timestamp = time.strftime("%Y%m%d-%H%M%S")
        resolved = os.path.join(".temp", f"model-example-collection-{timestamp}")

    os.makedirs(resolved, exist_ok=True)
    return os.path.abspath(resolved)


def infer_extension(url: str) -> str:
    parsed = urllib.parse.urlparse(url)
    path = parsed.path or ""
    ext = os.path.splitext(path)[1].lower()
    if ext in {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}:
        return ext
    return ".png"


def download_file(url: str, output_path: str) -> None:
    request = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(request) as response:
        content = response.read()

    with open(output_path, "wb") as file:
        file.write(content)


def slugify(text: str) -> str:
    cleaned = []
    for char in text.lower().strip():
        if char.isalnum():
            cleaned.append(char)
        elif char in {"-", "_", " ", "."}:
            cleaned.append("-")
    output = "".join(cleaned).strip("-")
    while "--" in output:
        output = output.replace("--", "-")
    return output or "style"


def write_jsonl(path: str, rows: List[Dict]) -> None:
    with open(path, "w", encoding="utf-8") as file:
        for row in rows:
            file.write(json.dumps(row, ensure_ascii=False) + "\n")


def save_collection_manifest(output_dir: str, manifest: Dict) -> str:
    path = os.path.join(output_dir, "manifest.json")
    with open(path, "w", encoding="utf-8") as file:
        json.dump(manifest, file, ensure_ascii=False, indent=2)
    return path


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Build, submit, and optionally collect model example generation results."
    )
    parser.add_argument("--model-uuid", default="")
    parser.add_argument("--types", default="")
    parser.add_argument("--theme", default="")
    parser.add_argument("--character", default="")
    parser.add_argument("--lock-character", action="store_true")
    parser.add_argument("--run-id", default="")
    parser.add_argument("--aspect-ratio", default="3:4")
    parser.add_argument("--batch-size", type=int, default=1)
    parser.add_argument("--visibility-level", default="public")
    parser.add_argument("--reference-image-urls", default="")
    parser.add_argument("--output", default="")
    parser.add_argument("--run", action="store_true")
    parser.add_argument("--collect", action="store_true")
    parser.add_argument("--download-dir", default="")
    parser.add_argument("--poll-timeout", type=int, default=900)
    parser.add_argument("--poll-interval", type=int, default=6)
    parser.add_argument("--provider", default="kie", choices=["kie", "project"])
    parser.add_argument("--api-base", default="")
    parser.add_argument("--header", action="append", default=[])
    parser.add_argument("--list-types", action="store_true")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    load_env()

    if args.list_types:
        print("\n".join(sorted(STYLE_CATALOG.keys())))
        return 0

    if not args.model_uuid.strip():
        raise ValueError("model_uuid must not be empty")

    if args.batch_size < 1 or args.batch_size > 4:
        raise ValueError("batch_size must be in range 1..4")

    if args.poll_timeout < 10:
        raise ValueError("poll_timeout must be at least 10 seconds")

    if args.poll_interval < 2:
        raise ValueError("poll_interval must be at least 2 seconds")

    if not args.run_id:
        args.run_id = f"run-{time.strftime('%Y%m%d%H%M%S')}-{random.randint(1000, 9999)}"

    style_types = parse_types(args.types)
    used_subject_anchors = set()
    payloads = []
    for style_key in style_types:
        subject_anchor = pick_unique_subject_anchor(args.run_id, style_key, used_subject_anchors)
        payloads.append(build_payload(args, style_key, subject_anchor))

    if args.output:
        write_jsonl(args.output, payloads)

    if not args.run and not args.collect:
        print(json.dumps({"count": len(payloads), "payloads": payloads}, ensure_ascii=False, indent=2))
        return 0

    if args.provider == "project" and not args.api_base:
        raise ValueError("api_base is required when provider=project and run or collect is enabled")

    headers = resolve_provider_headers(args.provider, parse_headers(args.header))

    submission_records = []
    for style_key, payload in zip(style_types, payloads):
        response = submit_payload(args.provider, args.api_base, headers, payload)
        generation_uuid = extract_generation_uuid(args.provider, response)
        submission_records.append(
            {
                "style_key": style_key,
                "payload": payload,
                "generation_uuid": generation_uuid,
                "create_response": response,
            }
        )

    if not args.collect:
        print(json.dumps({"count": len(submission_records), "submissions": submission_records}, ensure_ascii=False, indent=2))
        return 0

    output_dir = ensure_output_dir(args.download_dir)
    manifest = {
        "model_uuid": args.model_uuid,
        "theme": args.theme,
        "character": args.character,
        "output_dir": output_dir,
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "tasks": [],
    }

    failed_tasks = []
    downloaded_count = 0

    for task_index, record in enumerate(submission_records, start=1):
        style_key = record["style_key"]
        generation_uuid = record["generation_uuid"]

        result = poll_until_done(
            args.provider,
            args.api_base,
            headers,
            generation_uuid,
            timeout_seconds=args.poll_timeout,
            interval_seconds=args.poll_interval,
        )

        task_manifest = {
            "index": task_index,
            "style_key": style_key,
            "generation_uuid": generation_uuid,
            "status": result["status"],
            "error_message": result["error_message"],
            "files": [],
        }

        if result["status"] == "completed" and result["urls"]:
            for image_index, image_url in enumerate(result["urls"], start=1):
                ext = infer_extension(image_url)
                filename = f"{task_index:02d}-{slugify(style_key)}-{image_index:02d}{ext}"
                file_path = os.path.join(output_dir, filename)
                download_file(image_url, file_path)
                downloaded_count += 1
                task_manifest["files"].append(
                    {
                        "source_url": image_url,
                        "local_path": file_path,
                    }
                )
        else:
            failed_tasks.append(
                {
                    "style_key": style_key,
                    "generation_uuid": generation_uuid,
                    "status": result["status"],
                    "error_message": result["error_message"],
                }
            )

        manifest["tasks"].append(task_manifest)

    manifest_path = save_collection_manifest(output_dir, manifest)

    summary = {
        "output_dir": output_dir,
        "manifest": manifest_path,
        "task_count": len(submission_records),
        "downloaded_files": downloaded_count,
        "failed_tasks": failed_tasks,
    }

    print(json.dumps(summary, ensure_ascii=False, indent=2))

    if failed_tasks:
        raise RuntimeError(f"Collection finished with {len(failed_tasks)} failed tasks")

    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as error:
        print(f"Error: {error}", file=sys.stderr)
        sys.exit(1)
