# API Mapping

## Endpoints

- Create task: `POST /api/anime-generation/create-task`
- Poll status: `GET /api/generation/status/{generation_uuid}`

## Service References

- `docs/2-implementation/backend/service-generation-architecture.md`
- `docs/2-implementation/backend/service-anime-generation.md`
- `docs/2-implementation/api/anime-generation.md`
- `docs/2-implementation/api/generation.md`

## Minimal Create Payload

```json
{
  "gen_type": "anime",
  "prompt": "<built prompt>",
  "model_uuid": "<model uuid>",
  "aspect_ratio": "3:4",
  "batch_size": 1,
  "visibility_level": "public"
}
```

## Collection Flow

1. Submit one create-task request per style key.
2. Read `generation_uuid` from each create response.
3. Poll status endpoint until `completed` or `failed`.
4. Extract result image URLs from response payload.
5. Download images into output folder and write `manifest.json`.

## Optional Fields

- `reference_image_urls`: image-to-image input URLs.
- `style_preset`, `scene_preset`, `outfit_preset`, `action_preset`: optional preset controls.

## Error Handling Rules

- Reject empty `model_uuid`.
- Reject unknown style types.
- Reject non-2xx API responses and include response body.
- Treat poll timeout as failure, but keep manifest for debugging.
