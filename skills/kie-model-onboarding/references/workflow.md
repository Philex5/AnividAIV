# Kie Model Onboarding Workflow

## 1. Input Contract

Collect these fields before coding:

- `model_name`: exact model marketing name from user
- `is_premium`: `true` or `false`
- `model_domain`: `image` or `video`

Optional but recommended:

- `model_id` variants if user already knows them
- expected UI params (`duration`, `resolution`, `aspect_ratio`, etc.)

If any required input is missing, stop and ask user explicitly.

## 2. Documentation Mapping

Read in this order:

1. `docs/1-specs/model_apis/kie_api_specs.md`
2. `docs/1-specs/model_apis/kie-image-api.md` or `docs/1-specs/model_apis/kie-video-api.md`

Extract and normalize:

- API version style: old/new
- create endpoint + query endpoint
- model IDs for each task mode
- request payload schema (`input` fields)
- state/result parsing expectations
- credit and premium policy

## 3. Config Update Checklist

Target file: `src/configs/models/ai-models.json`

For each new model entry:

- Set `name`, `model_id`, `provider`, `model_type`
- Set `i18n_name_key` and `i18n_description_key`
- Set `is_premium` from user input
- Set `credits_per_generation` and `credits_mapping` when needed
- Set `supported_ratios` and/or `supported_tasks`
- Set `ui_config.params` to drive frontend controls
- Set `config.model_types` when model routes by mode

Keep schema consistent with adjacent model entries.

## 4. Adapter Wiring Checklist

Image branch:

- Check `src/services/generation/providers/kie-ai-provider.ts`
- Add adapter import/instance when needed
- Extend `getAdapter` and/or `getAdapterForParams`

Video branch:

- Check `src/services/generation/providers/video-ai-provider.ts`
- Register adapter in `initializeAdapters`
- Add alias keys for robust matching

Adapter coding rules:

- Throw explicit English errors for invalid params
- Keep response parsing tolerant but strict on required fields
- Reuse base adapter utilities

## 5. i18n + Selector Checklist

Update:

- `src/i18n/messages/en.json`
- `src/i18n/messages/ja.json`

Keys:

- `models.<key>.name`
- `models.<key>.description`

Confirm in selector:

- `src/components/anime-generator/ModelSelectorWithIcon.tsx`
- Name/description fallback works
- Premium badge + tooltip for free users

Confirm in concrete generator execution components:

- `src/components/anime-generator/AnimeGenerator.tsx`
- `src/components/video/VideoGenerator.tsx`

Verify request path:

- selected `model_id` and UI params are carried into request payload
- model-specific fields (duration/resolution/aspect ratio/reference image) are mapped correctly
- premium-disabled model cannot bypass UI restriction via normal interaction

## 6. Verification

Minimum checks:

- `rg` for new `model_id` and i18n keys
- `rg` for adapter registration key coverage
- optional targeted tests for adapter if project has them
- run full frontend checklist: `references/frontend-verification-checklist.md`

Do not silently swallow onboarding gaps; surface exact missing piece.
