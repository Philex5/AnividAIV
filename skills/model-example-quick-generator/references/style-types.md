# Style Type Catalog

This catalog defines reusable style keys for model sample image generation.
Use these keys in `--types`.

## Default Type Set (10 images)

Use this set when user does not provide any style selection:

1. `fantasy-epic`
2. `cyberpunk-streetscape`
3. `mecha-hangar`
4. `watercolor-landscape`
5. `character-portrait`
6. `full-body-turnaround`
7. `photoreal-portrait-reference`
8. `ink-wash-character`
9. `surreal-dreamscape`
10. `minimal-flat-illustration`

## Category Mapping

- Grand Scene: `fantasy-epic`, `cyberpunk-streetscape`, `mecha-hangar`, `watercolor-landscape`
- Fine Detail: `character-portrait`, `full-body-turnaround`, `photoreal-portrait-reference`
- Abstract & Artistic: `ink-wash-character`, `surreal-dreamscape`, `minimal-flat-illustration`

## Type Intent

- `character-portrait`: close-up character beauty shot, clean facial details.
- `ink-wash-character`: ink-wash martial character with expressive brush style.
- `anime-battle-clash`: high-energy anime fight collision scene.
- `cyberpunk-streetscape`: futuristic neon city street environment.
- `watercolor-landscape`: soft watercolor natural landscape scene.
- `noir-cityscape`: noir urban atmosphere with cinematic shadow/light.
- `mecha-hangar`: industrial mecha maintenance hangar environment.
- `full-body-turnaround`: full-body standing concept style, outfit and silhouette clarity.
- `battle-action`: dynamic combat pose, motion lines, dramatic lighting.
- `slice-of-life`: daily life scene, natural expression, soft composition.
- `fantasy-epic`: magical world atmosphere, grand cinematic fantasy mood.
- `cyberpunk-sci-fi`: neon city, high-tech equipment, futuristic sci-fi vibes.
- `mecha-design`: mechanical suit or robot concept, hard-surface design language.
- `ghibli-warm-story`: warm painterly storytelling mood inspired by Ghibli-like tone.
- `surreal-dreamscape`: surreal symbolic composition, dreamlike impossible elements.
- `minimal-flat-illustration`: simplified color blocks, clean flat illustration style.
- `photoreal-portrait-reference`: realistic human portrait benchmark for photoreal quality comparison.

## Notes

- Keep prompts in English only.
- Default behavior does **not** lock a fixed character identity.
- Use `--lock-character` only when strict same-character consistency is required.
- Prompt generation is dynamic per run. Do not rely on fixed template concatenation.
- Keep default output size at 10 images unless user asks otherwise.
- Ensure the generated set covers grand scenes, fine-detail scenes, and abstract/artistic scenes.
- Ensure each style in one batch receives a unique subject anchor so core subjects are not repeated.
- Extend this file first when adding new style keys.
- Do not silently coerce unknown keys; throw explicit validation errors.
