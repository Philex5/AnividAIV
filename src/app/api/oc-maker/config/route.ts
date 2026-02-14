import { respData, respErr } from "@/lib/resp";
import charactersConfig from "@/configs/characters/characters.json";
import stylesConfig from "@/configs/styles/anime_styles.json";
import scenesConfig from "@/configs/parameters/scenes.json";
import outfitsConfig from "@/configs/parameters/outfits.json";
import aiModelsConfig from "@/configs/models/ai-models.json";
import { parseCharacterModules } from "@/types/oc";

// GET /api/oc-maker/config - 获取OC Maker所需的所有配置参数
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const config_type = searchParams.get("type"); // 可选：指定获取特定类型的配置

    let responseData: any = {};

    // 如果指定了配置类型，只返回对应配置
    if (config_type) {
      switch (config_type) {
        case "characters":
          responseData = {
            type: "characters",
            data: charactersConfig,
          };
          break;
        case "styles":
          responseData = {
            type: "styles",
            data: stylesConfig,
          };
          break;
        case "scenes":
          responseData = {
            type: "scenes",
            data: scenesConfig,
          };
          break;
        case "outfits":
          responseData = {
            type: "outfits",
            data: outfitsConfig,
          };
          break;
        case "ai-models":
          responseData = {
            type: "ai-models",
            data: aiModelsConfig,
          };
          break;
        default:
          return respErr("Invalid config type");
      }
    } else {
      // 返回所有配置
      responseData = {
        characters: charactersConfig,
        styles: stylesConfig,
        scenes: scenesConfig,
        outfits: outfitsConfig,
        aiModels: aiModelsConfig,
      };
    }

    // 添加生成相关的常用配置
    responseData.generation = {
      defaultProvider: "replicate",
      defaultModel: "google/nano-banana",
      imageTypes: [
        {
          key: "avatar",
          label: "Avatar/Portrait",
          description: "Head and shoulders portrait",
        },
        {
          key: "full_body",
          label: "Full Body",
          description: "Complete character illustration",
        },
        {
          key: "profile",
          label: "Profile Art",
          description: "Character profile artwork",
        },
      ],
      defaultAspectRatio: "1:1",
      maxCustomPromptLength: 500,
    };

    // 添加验证规则
    responseData.validation = {
      nameMaxLength: 100,
      ageRange: { min: 1, max: 99999 },
      maxExtendedAttributes: 10,
      maxPersonalityTags: 10,
      backgroundStoryMaxLength: 2000,
      maxBackgroundSegments: 5,
    };

    return respData(responseData);
  } catch (error) {
    console.log("Get OC Maker config failed:", error);
    return respErr("Failed to get configuration");
  }
}

// POST /api/oc-maker/config/validate - 验证配置参数
export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { characterData, configType = "basic" } = data;

    if (!characterData) {
      return respErr("Character data is required for validation");
    }

    const modules = parseCharacterModules(characterData.modules);
    const appearance = modules.appearance || {};
    const personality = modules.personality || {};
    const background = modules.background || {};

    const name = characterData.name || appearance.name;
    const gender = characterData.gender || appearance.gender;
    const age = characterData.age ?? appearance.age;
    const personalityTags =
      personality.personality_tags || characterData.personality_tags;
    const extendedAttributes = personality.extended_attributes;
    const backgroundStory = background.background_story;
    const backgroundSegments = background.background_segments;

    const validationResults: any = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    // 基础验证
    if (configType === "basic" || configType === "all") {
      // 姓名验证
      if (!name || name.trim().length === 0) {
        validationResults.errors.push("Name is required");
        validationResults.isValid = false;
      } else if (name.length > 100) {
        validationResults.errors.push("Name must be less than 100 characters");
        validationResults.isValid = false;
      }

      // 性别验证
      if (!gender) {
        validationResults.errors.push("Gender is required");
        validationResults.isValid = false;
      }

      // 年龄验证
      if (age !== undefined && age !== null) {
        if (age < 1 || age > 99999) {
          validationResults.warnings.push("Age should be between 1 and 999");
        }
      }

      // 性格标签验证
      if (personalityTags && Array.isArray(personalityTags)) {
        if (personalityTags.length > 10) {
          validationResults.warnings.push(
            "Too many personality tags (max 10 recommended)",
          );
        }
      }

      // 扩展属性验证
      if (extendedAttributes && typeof extendedAttributes === "object") {
        const attrCount = Object.keys(extendedAttributes).length;
        if (attrCount > 10) {
          validationResults.errors.push(
            "Maximum 10 extended attributes allowed",
          );
          validationResults.isValid = false;
        }
      }
    }

    // 背景故事验证
    if (configType === "story" || configType === "all") {
      if (backgroundStory && backgroundStory.length > 2000) {
        validationResults.warnings.push(
          "Background story is quite long (max 2000 characters recommended)",
        );
      }

      if (Array.isArray(backgroundSegments)) {
        if (backgroundSegments.length > 5) {
          validationResults.warnings.push(
            "Too many background segments (max 5 recommended)",
          );
        }
      }
    }

    return respData(validationResults);
  } catch (error) {
    console.log("Config validation failed:", error);
    return respErr("Failed to validate configuration");
  }
}
