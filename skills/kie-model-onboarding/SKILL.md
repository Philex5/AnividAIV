---
name: kie-model-onboarding
description: Add new Kie AI image/video models end-to-end in this repository. Use when the user asks to introduce a new model (or variant), provide premium flag, wire model docs to runtime config, add provider adapter registration, add i18n entries for model selector, and verify frontend visibility in ModelSelectorWithIcon.
---

# Kie Model Onboarding

## Overview

Use this skill to onboard a new Kie model from API docs to runnable product config.
Collect user input (`model_name`, `is_premium`), map API specs, update config/adapter/i18n, then verify the model can be selected in frontend.

## Quick Start

1. Collect required inputs from user:
   - `model_name` (required)
   - `is_premium` (`true`/`false`, required)
   - `model_type` (`text2img` / `img2img` / `text2video` / `image_to_video` etc., if ambiguous)
2. Locate model contract in docs:
   - Image models: `docs/1-specs/model_apis/kie-image-api.md`
   - Video models: `docs/1-specs/model_apis/kie-video-api.md`
   - Common protocol: `docs/1-specs/model_apis/kie_api_specs.md`
3. Run helper script for quick定位:
   - `bash skills/kie-model-onboarding/scripts/find_kie_model_docs.sh "<model_name>"`
4. Follow implementation checklist in `references/workflow.md`.
5. Use `references/examples-nano-banana-sora2.md` as concrete baseline.

## Execution Workflow

### 1) Confirm doc-source of truth

Read only required sections from the two domain docs and the base Kie spec.

Extract and record:
- API generation style: old (`/gpt4o-image/...`) or new (`/jobs/createTask`)
- Model IDs (text/image/video variants)
- Required and optional input fields
- Aspect ratio / resolution / duration enums
- Credit rule and premium requirement

If the model is absent from docs, stop and ask user to update docs first.

### 2) Add model configuration

Edit `src/configs/models/ai-models.json` and append/adjust model object:
- Keep `i18n_name_key` and `i18n_description_key` under `models.*`
- Set `is_premium` exactly from user input
- Fill `model_type`, `supported_tasks`, `ui_config.params`, `config.model_types`, `credits_mapping` as needed
- Keep numeric defaults and enums consistent with API docs
- Use English text only for default strings and errors

Do not hardcode UI labels; rely on i18n keys.

### 3) Wire provider adapter

Choose branch by modality:
- Image: `src/services/generation/providers/kie-ai-provider.ts`
- Video: `src/services/generation/providers/video-ai-provider.ts`

Then:
- Reuse existing adapter when protocol is compatible
- Add new adapter file only when request/response mapping differs materially
- Register aliases (`model_id`, short name, display-friendly name)
- Throw explicit errors for unsupported models

### 4) Add global i18n for model selector

Update both files:
- `src/i18n/messages/en.json`
- `src/i18n/messages/ja.json`

Add under `models.<key>`:
- `name`
- `description`

Keep `src/configs/models/ai-models.json` keys aligned with these i18n entries.

### 5) Frontend confirmation

Confirm selector behavior in:
- `src/components/anime-generator/ModelSelectorWithIcon.tsx`

Confirm generation execution wiring in:
- `src/components/anime-generator/AnimeGenerator.tsx`
- `src/components/video/VideoGenerator.tsx`

Verify:
- Display name resolves from `i18n_name_key`
- Description resolves from `i18n_description_key`
- Premium model is disabled for free users and shows tooltip badge
- Model appears in correct filtered list by `modelType`
- Selected model parameters are passed into actual generation request flow
- Image/video generator controls render the new model-specific params correctly

### 6) Validate and report

Run targeted checks when feasible:
- `rg` lookups for added keys and model IDs
- Related unit tests if adapter behavior changed

Summarize changes with touched files and any manual verification gaps.

## Resources

- Workflow checklist: `references/workflow.md`
- Concrete examples: `references/examples-nano-banana-sora2.md`
- Frontend request-chain checklist: `references/frontend-verification-checklist.md`
- Doc search helper: `scripts/find_kie_model_docs.sh`
