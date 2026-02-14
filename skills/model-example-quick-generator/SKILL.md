---
name: model-example-quick-generator
description: Batch-create model showcase image examples for new internal pages by building prompt sets, submitting generation tasks, polling completion, and downloading final images into a local collection folder. Use when users provide a model UUID plus optional style choices and need one-shot sample set production.
---

# Model Example Quick Generator

## Overview

Generate a complete sample image set for a newly added model with minimal manual work.
Accept model input plus optional style choices, build real-time prompts per style type, then submit tasks and collect final images into a folder.
Support full pipeline execution: generate images, convert PNG to compact WebP, upload assets to R2, and update gallery config in one run.

## Quick Start

1. Collect inputs from user:
   - `model_uuid` (required)
   - desired style `types` (optional)
   - `theme` and `character` (optional)
   - `--lock-character` (optional, default false)
2. If styles are not provided, use the built-in default set in `references/style-types.md`.
3. Build payloads only (dry-run):
   - `python3 skills/model-example-quick-generator/scripts/batch_generate_examples.py --model-uuid <MODEL_UUID> --theme "<THEME>" --character "<CHARACTER>" --output /tmp/model-example-requests.jsonl`
4. Submit and auto-collect image set to folder (direct KIE by default):
   - `python3 skills/model-example-quick-generator/scripts/batch_generate_examples.py --model-uuid <MODEL_UUID> --collect --download-dir /tmp/model-samples`
   - Requires `KIE_AI_API_KEY` (or `API_KEY`) in env.
   - If you must use project API, pass `--provider project --api-base <BASE_URL> --header "Cookie: <COOKIE>"`.
5. Run end-to-end pipeline (recommended for z-image gallery refresh):
   - `python3 skills/model-example-quick-generator/scripts/run_full_pipeline.py --model-uuid z-image`

## Workflow

### 1) Confirm API and service boundaries

- Read:
  - `docs/2-implementation/backend/service-generation-architecture.md`
  - `docs/2-implementation/backend/service-anime-generation.md`
  - `docs/2-implementation/api/anime-generation.md`
  - `docs/2-implementation/api/generation.md`
- Default provider endpoints:
  - `POST https://api.kie.ai/api/v1/jobs/createTask`
  - `GET https://api.kie.ai/api/v1/jobs/recordInfo?taskId=...`
- Optional project provider endpoints:
  - `POST /api/anime-generation/create-task`
  - `GET /api/generation/status/{generation_uuid}`
- Keep defaults and errors in English.

### 2) Resolve style set

- If user provides `types`, validate and use them.
- If not provided, use default types:
  - `fantasy-epic`
  - `cyberpunk-streetscape`
  - `mecha-hangar`
  - `watercolor-landscape`
  - `character-portrait`
  - `full-body-turnaround`
  - `photoreal-portrait-reference`
  - `ink-wash-character`
  - `surreal-dreamscape`
  - `minimal-flat-illustration`
- Keep default output size to 10 images.
- Distribute style coverage across three categories:
  - grand scenes
  - fine-detail scenes
  - abstract and artistic scenes
- Include `photoreal-portrait-reference` as one style in the fine-detail category (portrait-oriented realism).

### 3) Build prompt per style in real-time

- Generate prompt in a dynamic way for every run. Do not rely on static template concatenation.
- Compose prompt from:
  - theme (global theme or style-specific default theme)
  - randomly selected subject/scene/style-note from style catalog
  - quality fragment pool and negative fragment
  - run-scoped variants (`camera`, `mood`, `detail`) keyed by `run_id`
- Keep deterministic structure; avoid hidden behavior.
- Default mode should avoid fixed same-character identity across all styles.
- Use `--lock-character` only when user explicitly requests same character in all outputs.
- Ensure prompts differ every run by setting per-run `--run-id` (auto-generated if omitted) and style-specific dynamic variants.
- Prompt should be a direct image description only.
- Do not include wording like "sample", "example", or process/meta instructions in prompt body.
- Generate a unique subject anchor per style key in the same batch to prevent repeated core subjects.
- Except for explicit style guidance, let each prompt describe a newly invented primary subject.

### 4) Submit, poll, and collect folder output

- `--run`: submit all create-task requests only.
- `--collect`: submit + poll status + download all completed images.
- `--download-dir`: target folder for final sample collection.
  - If omitted, script auto creates `.temp/model-example-collection-<timestamp>`.
- Output artifacts:
  - downloaded image files named by style and index
  - `manifest.json` containing generation UUID, status, source URLs, and local file paths

### 5) Fail-fast rules

- Unknown style -> throw explicit error.
- HTTP non-2xx -> throw explicit error with body.
- Empty `model_uuid` -> throw explicit error.
- Poll timeout or failed task -> keep manifest, then throw error summary.

## Resources

- Script:
  - `scripts/batch_generate_examples.py`
  - `scripts/run_full_pipeline.py`
- References:
  - `references/style-types.md`
  - `references/api-mapping.md`

## Example Invocation

```bash
python3 skills/model-example-quick-generator/scripts/batch_generate_examples.py \
  --model-uuid "gpt-image-1" \
  --theme "" \
  --types "fantasy-epic,cyberpunk-streetscape,mecha-hangar,watercolor-landscape,character-portrait,full-body-turnaround,photoreal-portrait-reference,ink-wash-character,surreal-dreamscape,minimal-flat-illustration" \
  --aspect-ratio "3:4" \
  --batch-size 1 \
  --collect \
  --api-base "https://your-domain.com" \
  --header "Cookie: next-auth.session-token=..." \
  --download-dir "/tmp/model-sample-pack"
```

Full pipeline example:

```bash
python3 skills/model-example-quick-generator/scripts/run_full_pipeline.py \
  --model-uuid "z-image" \
  --types "fantasy-epic,cyberpunk-streetscape,mecha-hangar,watercolor-landscape,character-portrait,full-body-turnaround,photoreal-portrait-reference,ink-wash-character,surreal-dreamscape,minimal-flat-illustration"
```

After completion, check `manifest.json` in the folder for the full result map.
