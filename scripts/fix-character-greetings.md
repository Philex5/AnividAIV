# Character Greeting Fix Script

This script generates missing or invalid `greeting` fields for characters using LLM.

## Background

The `greeting` field in `modules.personality.greeting` should be an **array of 3 greeting phrases** that are randomly selected when starting a chat conversation. This script fixes:

- Missing greeting (`null` or `undefined`)
- Empty array (`[]`)
- Old string format (before OC Rebuild)
- Arrays containing only empty strings

## Usage

```bash
# Process all characters (interactive confirmation)
npx tsx scripts/fix-character-greetings.ts

# Process first 10 characters
npx tsx scripts/fix-character-greetings.ts --limit 10

# Process specific character by UUID
npx tsx scripts/fix-character-greetings.ts --uuid <character-uuid>
```

## How It Works

1. **Query** characters from database
2. **Check** if greeting field needs fixing
3. **Build** character info from all available fields:
   - Basic info: name, gender, age, role, species
   - Appearance: body type, hair, eyes, outfit, accessories
   - Personality: tags, extended attributes, quotes
   - Background: brief introduction
   - Skills: abilities
4. **Generate** 3 greeting phrases using LLM (GPT-4o-mini)
5. **Update** `modules.personality.greeting` in database

## Example Output

```
============================================================
Character Greeting Fix Script
============================================================
Found 5 character(s) to check
- Alice (uuid-1): needs greeting fix
- Bob (uuid-2): needs greeting fix

2 character(s) need greeting fix

Processing: Alice (uuid-1)
Character info: Name: Alice
Gender: female
Age: 18
Role: Mage
Personality Traits: Cheerful, Brave
...
Generating greetings...
Generated greetings: [
  "Hey there! Ready for some magical adventures?",
  "Greetings, traveler! May I assist you on your journey?",
  "Oh hello! I was just practicing some new spells. Want to see?"
]
✓ Successfully updated Alice

============================================================
Summary:
  Total processed: 2
  Successful: 2
  Failed: 0
============================================================
```

## Error Handling

- If generation fails for a character, the script continues with the next one
- Exit code 1 is set if any characters failed to process
- 1 second delay between characters to avoid rate limiting
