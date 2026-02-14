# OC Data Structure Template

This document defines the standard data structure for Original Characters (OCs) in the AnividAI system. It maps the user interface fields (Character Detail Page) to the underlying database schema (specifically the `characters` table and its `modules` JSONB column).

**Related Schema**: `src/db/schema.ts` (`characters` table)
**Related Feature**: `docs/2-implementation/features/feature-oc-rebuild.md`

---

## 1. Basic Information (Header & Meta)

These fields are primary attributes often used for filtering and searching. They are stored in the root columns of the `characters` table for performance but are also conceptually part of the character's core identity.

| Field Name     | DB Column          | Type    | Description                                      |
| :------------- | :----------------- | :------ | :----------------------------------------------- |
| **UUID**       | `uuid`             | string  | Unique identifier for the character.             |
| **Name**       | `name`             | string  | Character's full name.                           |
| **Gender**     | `gender`           | string  | `male`, `female`, `other`, or custom text.       |
| **Species**    | `species`          | string  | Human, Elf, Android, etc.                        |
| **Role**       | `role`             | string  | Identity or profession (e.g., Warrior, Student). |
| **Age**        | `age`              | integer | Character's age (numeric).                       |
| **World**      | `world_uuid`       | UUID    | Link to the `oc_worlds` table.                   |
| **Tags**       | `tags`             | JSONB   | General search tags (e.g., #cute, #cyberpunk).   |
| **Status**     | `status`           | string  | `archived` (default), `draft`, etc.              |
| **Visibility** | `visibility_level` | string  | `public` or `private`.                           |

---

## 2. Image References (Root Fields)

These fields point to key images for the OC and are stored as root columns for fast access.

| Field Name                 | DB Column                         | Type   | Description                                      |
| :------------------------- | :-------------------------------- | :----- | :----------------------------------------------- |
| **Avatar Image UUID**      | `avatar_generation_image_uuid`    | UUID   | Link to avatar image in `generation_images`.     |
| **Primary Portrait UUID**  | `profile_generation_image_uuid`   | UUID   | Link to primary portrait in `generation_images`. |

---

## 3. Modules Structure (Tabs)

The core detail data is stored in the `modules` JSONB column. This allows for flexible extension without altering the table schema. The UI organizes this data into tabs.

### Tab 1: Appearance (`modules.appearance`)

Visual descriptions and physical characteristics.

| Field           | JSON Path                        | Type     | Description                                                |
| :-------------- | :------------------------------- | :------- | :--------------------------------------------------------- |
| **Body Type**   | `appearance.body_type`           | string   | e.g., "Tall and slender", "Muscular".                      |
| **Hair Style**  | `appearance.hair_style`          | string   | e.g., "Long ponytail", "Short bob".                        |
| **Hair Color**  | `appearance.hair_color`          | string   | e.g., "Silver", "Navy Blue".                               |
| **Eye Color**   | `appearance.eye_color`           | string   | e.g., "Crimson", "Emerald".                                |
| **Outfit**      | `appearance.outfit_style`        | string   | Clothing description (e.g., "School uniform").             |
| **Features**    | `appearance.appearance_features` | string[] | Array of distinct visual features (e.g., "Scar on cheek"). |
| **Accessories** | `appearance.accessories`         | string[] | Items worn (e.g., "Glasses", "Headphones").                |

### Tab 2: Personality (`modules.personality`)

Character traits, voice, and behavior.

| Field          | JSON Path                         | Type     | Description                                                                 |
| :------------- | :-------------------------------- | :------- | :-------------------------------------------------------------------------- |
| **Greeting**   | `personality.greeting`            | string[] | Array of 3 greeting phrases for chat. One will be randomly selected when starting a conversation. |
| **Tags**       | `personality.personality_tags`    | string[] | Keywords describing personality (e.g., "Tsundere", "Brave").                |
| **Quotes**     | `personality.quotes`              | string[] | Iconic lines spoken by the character.                                       |
| **Ext. Attrs** | `personality.extended_attributes` | map      | Custom key-value pairs (e.g., `MBTI`: `INTJ`, `Alignment`: `Chaotic Good`). |

### Tab 3: Background (`modules.background`)

Story, lore, and origins.

| Field        | JSON Path                        | Type  | Description                                    |
| :----------- | :------------------------------- | :---- | :--------------------------------------------- |
| **Intro**    | `background.brief_introduction`  | text  | One-line character summary for overview display. |
| **Story**    | `background.background_story`    | text  | Full backstory or biography.                   |
| **Segments** | `background.background_segments` | array | Structured story chapters or details.          |

**Segment Structure**:

```json
{
  "id": "uuid-string",
  "title": "Chapter 1: The Awakening",
  "content": "Long ago...",
  "image_url": "https://..."
}
```

### Tab 4: Skills (`modules.skills`)

Capabilities and combat/functional statistics.

| Field         | JSON Path          | Type  | Description                                                                                                                                                          |
| :------------ | :----------------- | :---- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Stats**     | `skills.stats`     | array | Radar chart data. Default dimensions: `STR` (Strength), `INT` (Intelligence), `AGI` (Agility), `VIT` (Vitality), `DEX` (Dexterity), `LUK` (Luck). Value range: 0-10. |
| **Abilities** | `skills.abilities` | array | List of special moves or skills.                                                                                                                                     |

**Stats Structure**:

```json
{ "label": "Strength", "value": 85 }
```

**Ability Structure**:

```json
{
  "id": "uuid",
  "name": "Fireball",
  "type": "Magic",
  "description": "Deals 50 damage",
  "level": "S-Rank"
}
```

### Tab 5: Art / Gallery (`modules.art`)

Image gallery and artistic style settings.

| Field       | JSON Path            | Type   | Description                                      |
| :---------- | :------------------- | :----- | :----------------------------------------------- |
| **Style**   | `art.fullbody_style` | string | AI Art style prompt key (e.g., `anime_impasto`). |
| **Gallery** | `art.gallery`        | array  | Visual archive entries (portraits, uploads, etc). |

**Gallery Entry Structure**:

```json
{
  "id": "gallery-1",
  "url": "image-uuid-or-http-url",
  "type": "portrait",
  "label": "Main Portrait",
  "meta": {
    "source": "generation"
  }
}
```

---

## 4. Complete JSON Template

This JSON object represents the full content of the `modules` column in the database.

```json
{
  "appearance": {
    "name": "Character Name",
    "gender": "Female",
    "age": 18,
    "role": "Mage",
    "species": "Human",
    "body_type": "Slender",
    "hair_style": "Twin tails",
    "hair_color": "Pink",
    "eye_color": "Blue",
    "outfit_style": "Magical Girl Uniform",
    "appearance_features": ["Star hairpin", "Glowing aura"],
    "accessories": ["Magic Wand", "Ribbon"]
  },
  "personality": {
    "greeting": [
      "Hello! I am the guardian of starlight.",
      "Greetings! The stars guided you here.",
      "Hey there! Ready for a magical adventure?"
    ],
    "personality_tags": ["Cheerful", "Clumsy", "Heroic"],
    "quotes": ["In the name of the stars!", "I will never give up!"],
    "extended_attributes": {
      "MBTI": "ENFP",
      "Likes": "Sweets",
      "Dislikes": "Ghosts"
    }
  },
  "background": {
    "brief_introduction": "A cheerful magical girl chosen by the Prism Stone to protect the Starlight Kingdom.",
    "background_story": "Born in the Starlight Kingdom, she was chosen by the Prism Stone...",
    "background_segments": [
      {
        "id": "seg-1",
        "title": "Early Life",
        "content": "She grew up in a small village...",
        "image_url": ""
      }
    ]
  },
  "skills": {
    "stats": [
      { "label": "STR", "value": 3 },
      { "label": "INT", "value": 8 },
      { "label": "AGI", "value": 6 },
      { "label": "VIT", "value": 9 },
      { "label": "DEX", "value": 6 },
      { "label": "LUK", "value": 6 }
    ],
    "abilities": [
      {
        "id": "ab-1",
        "name": "Starlight Beam",
        "type": "Active",
        "description": "Fires a beam of light.",
        "level": "1"
      }
    ]
  },
  "art": {
    "fullbody_style": "anime_vivid",
    "gallery": [
      {
        "id": "gallery-1",
        "url": "image-uuid-or-http-url",
        "type": "portrait",
        "label": "Primary Portrait"
      }
    ]
  }
}
```
