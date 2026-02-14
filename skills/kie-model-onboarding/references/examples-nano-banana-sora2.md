# Example Walkthrough: Nano Banana (Image) + Sora-2 (Video)

This file demonstrates the onboarding flow using two existing models as baseline references.

## A) Nano Banana (image)

### 1. Doc mapping

- Source: `docs/1-specs/model_apis/kie-image-api.md`
- API style: new jobs API
- Model IDs:
  - text-to-image: `google/nano-banana`
  - image-to-image: `google/nano-banana-edit`
- Rule: if reference image exists, route to `-edit`
- Credit baseline: 30

### 2. Config mapping

- File: `src/configs/models/ai-models.json`
- Entry style:
  - `model_id`: `google/nano-banana`
  - `model_type`: `img2img`
  - `config.unified_text2img_img2img`: `true`
  - `config.reference_mode.model_id`: `google/nano-banana-edit`
  - `is_premium`: `false`

### 3. Adapter mapping

- `src/services/generation/providers/nano-banana-adapter.ts`
  - validates prompt
  - enforces `image_urls` in edit mode
  - maps aspect ratio to allowed `image_size`
- `src/services/generation/providers/kie-ai-provider.ts`
  - auto-switches to edit adapter when reference images exist

### 4. i18n mapping

- `src/i18n/messages/en.json`: `models.nano_banana.*`
- `src/i18n/messages/ja.json`: `models.nano_banana.*`

---

## B) Sora-2 (video)

### 1. Doc mapping

- Source: `docs/1-specs/model_apis/kie-video-api.md`
- API style: new jobs API
- Model IDs:
  - text-to-video: `sora-2-text-to-video`
  - image-to-video: `sora-2-image-to-video`
- Common params: `prompt`, `aspect_ratio`, `n_frames`, `image_urls`
- Credits:
  - 10s -> 100
  - 15s -> 140

### 2. Config mapping

- File: `src/configs/models/ai-models.json`
- Entry style:
  - `name`: `Sora-2`
  - `model_id`: `sora-2`
  - `model_type`: `text2video`
  - `supported_tasks`: include image/multi-image video
  - `config.model_types`: map task to concrete model IDs
  - `config.credits_mapping`: duration based
  - `is_premium`: `false`

### 3. Adapter mapping

- `src/services/generation/providers/sora2-video-adapter.ts`
  - chooses model type by presence of images
  - caps image list to supported count
  - builds request for `/api/v1/jobs/createTask`
- `src/services/generation/providers/video-ai-provider.ts`
  - registers aliases: `sora-2`, `sora2`, `Sora-2`

### 4. i18n mapping

- `src/i18n/messages/en.json`: `models.sora2.*`
- `src/i18n/messages/ja.json`: `models.sora2.*`

---

## C) Premium variant pattern (Sora-2 Pro)

If user says premium model:

- set `is_premium: true` in model config
- add i18n keys and descriptions
- ensure selector can show premium badge (already handled by `ModelSelectorWithIcon`)

Use this as direct template when user asks to onboard a new model such as `nano-banana-pro` or `sora-2-pro` style variants.
