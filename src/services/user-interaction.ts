import {
  upsertUserInteraction,
  deleteUserInteraction,
  findUserInteraction,
  findUserInteractionsByArt,
  hasUserInteraction,
  NewUserInteraction,
} from "@/models/user-interaction";
import {
  incrementStat,
  decrementStat,
  ArtType,
  StatField,
} from "@/models/social-stats";
import { db } from "@/db";

/**
 * Add user interaction (double write: user_interactions + stats field)
 *
 * @param data - Interaction data
 */
export async function addUserInteraction(
  data: NewUserInteraction
): Promise<void> {
  const { art_id, art_type, interaction_type } = data;

  // Validate art type and interaction type
  if (!["character", "image", "video", "comment", "world"].includes(art_type)) {
    throw new Error(`Invalid art_type: ${art_type}`);
  }

  if (!["like", "favorite", "share"].includes(interaction_type)) {
    throw new Error(`Invalid interaction_type: ${interaction_type}`);
  }

  // If art_type is comment, only like is allowed
  if (art_type === "comment" && interaction_type !== "like") {
    throw new Error(`Only like interaction is allowed for comments`);
  }

  // Share is only allowed for worlds
  if (interaction_type === "share" && art_type !== "world") {
    throw new Error(`Share interaction is only allowed for world`);
  }

  // Use transaction to ensure atomicity
  await db().transaction(async (tx) => {
    // 1. Insert/update user_interactions record
    await upsertUserInteraction(data, tx);

    // 2. Increment stats field
    const statField = `${interaction_type}_count` as StatField;
    await incrementStat(art_type as ArtType, art_id, statField, tx);
  });
}

/**
 * Remove user interaction (double write: user_interactions + stats field)
 *
 * @param params - Interaction parameters
 */
export async function removeUserInteraction(params: {
  user_uuid: string;
  art_id: string; // uuid
  art_type: string;
  interaction_type: string;
}): Promise<void> {
  const { user_uuid, art_id, art_type, interaction_type } = params;

  // Validate art type and interaction type
  if (!["character", "image", "video", "comment", "world"].includes(art_type)) {
    throw new Error(`Invalid art_type: ${art_type}`);
  }

  if (!["like", "favorite", "share"].includes(interaction_type)) {
    throw new Error(`Invalid interaction_type: ${interaction_type}`);
  }

  if (interaction_type === "share" && art_type !== "world") {
    throw new Error(`Share interaction is only allowed for world`);
  }

  // Use transaction to ensure atomicity
  await db().transaction(async (tx) => {
    // 1. Delete user_interactions record
    await deleteUserInteraction(user_uuid, art_id, art_type, interaction_type, tx);

    // 2. Decrement stats field
    const statField = `${interaction_type}_count` as StatField;
    await decrementStat(art_type as ArtType, art_id, statField, tx);
  });
}

// (removed uuid variant)

// 获取用户对某个资源的交互状态
export async function getUserInteractionState(
  user_uuid: string,
  art_id: string, // uuid
  art_type: string
): Promise<{
  hasLiked: boolean;
  hasFavorited: boolean;
}> {
  const interactions = await findUserInteractionsByArt(user_uuid, art_id, art_type);

  return {
    hasLiked: interactions.some((i) => i.interaction_type === "like"),
    hasFavorited: interactions.some((i) => i.interaction_type === "favorite"),
  };
}

// (removed uuid variant)

// 检查用户是否已交互
export async function checkUserInteraction(
  user_uuid: string,
  art_id: number,
  art_type: string,
  interaction_type: string
): Promise<boolean> {
  return hasUserInteraction(user_uuid, String(art_id), art_type, interaction_type);
}

// (removed uuid variant)
