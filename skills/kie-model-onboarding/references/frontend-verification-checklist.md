# Frontend Verification Checklist

Use this checklist after adding/updating any Kie model.

## 1) Selector Layer

Files:

- `src/components/anime-generator/ModelSelectorWithIcon.tsx`

Checks:

- model item appears for expected `modelType` filter
- `i18n_name_key` renders translated model name
- `i18n_description_key` is available for downstream UI consumers
- premium model is disabled for free users and shows tooltip badge

## 2) Image Generation Execution

Files:

- `src/components/anime-generator/AnimeGenerator.tsx`

Checks:

- selected model is written into image generation request payload
- model-specific params are mapped from UI state to request fields
- reference image behavior matches model capability:
  - supports reference image -> image URLs included
  - no reference support -> UI blocks/ignores reference image
- default values are stable and in English when fallback is needed
- generation errors are surfaced (not silently swallowed)

## 3) Video Generation Execution

Files:

- `src/components/video/VideoGenerator.tsx`

Checks:

- selected video model is written into video generation request payload
- task mode switching is correct (text-to-video vs image-to-video)
- parameters are passed correctly:
  - duration
  - aspect_ratio
  - resolution/quality (if model supports)
  - image_urls/reference images (if model supports)
- model-specific unsupported params are not sent unexpectedly
- generation errors are surfaced (not silently swallowed)

## 4) Config and i18n Consistency

Files:

- `src/configs/models/ai-models.json`
- `src/i18n/messages/en.json`
- `src/i18n/messages/ja.json`

Checks:

- every new model has valid `i18n_name_key` and `i18n_description_key`
- i18n keys exist in both locale files
- `is_premium` matches product intent and selector behavior
- UI params in config (`ui_config.params`) are reflected in generator forms

## 5) Quick Command Aids

Use these quick checks:

```bash
rg -n "<model_id_or_key>" src/configs/models/ai-models.json src/i18n/messages/en.json src/i18n/messages/ja.json
rg -n "model_id|model_name|duration|aspect_ratio|quality|reference" src/components/anime-generator/AnimeGenerator.tsx src/components/video/VideoGenerator.tsx
```

Replace `<model_id_or_key>` with the actual model identifier.

## 6) Done Criteria

Mark onboarding as done only when:

- selector visibility and premium gating are correct
- image/video generator requests carry correct model + params
- i18n keys resolve for both locales
- no silent failures in generation flow
