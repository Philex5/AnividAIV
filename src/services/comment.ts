import { db } from "@/db";
import {
  insertComment,
  softDeleteComment,
  findCommentByUuid,
  getCommentsByArt,
  getRepliesByParent,
  CommentWithUser,
} from "@/models/comment";
import { incrementStat, decrementStat, ArtType } from "@/models/social-stats";
import { addUserInteraction, removeUserInteraction } from "@/services/user-interaction";
import { findCharacterByUuid } from "@/models/character";
import { findImageByUuid, findVideoByUuid } from "@/models/artwork";
import { findUserByUuid } from "@/models/user";
import { findworldByUuid } from "@/models/oc-world";

export interface CreateCommentParams {
  art_id: string;
  art_type: string;
  user_uuid: string;
  content: string;
  parent_uuid?: string;
  reply_to_user_uuid?: string;
}

export async function createComment(params: CreateCommentParams) {
  const { art_id, art_type, user_uuid, content, parent_uuid, reply_to_user_uuid } = params;

  // Check if target resource exists and is visible
  let resource: any = null;
  if (art_type === "character") {
    resource = await findCharacterByUuid(art_id);
  } else if (art_type === "image") {
    resource = await findImageByUuid(art_id);
  } else if (art_type === "video") {
    resource = await findVideoByUuid(art_id);
  } else if (art_type === "world") {
    resource = await findworldByUuid(art_id);
  } else if (art_type === "user") {
    resource = await findUserByUuid(art_id);
    if (resource) {
      // Mock resource properties for compatibility
      resource.visibility_level = "public";
      resource.user_uuid = resource.uuid;
    }
  }

  if (!resource) {
    throw new Error("Resource not found");
  }

  // Only allow comments on public resources (unless user is the owner)
  const ownerUuid = resource.user_uuid || resource.creator_uuid;
  if (art_type === "world" && resource.visibility_level !== "public") {
    throw new Error("Forbidden: Resource is private");
  }
  if (resource.visibility_level !== "public" && ownerUuid !== user_uuid) {
    throw new Error("Forbidden: Resource is private");
  }

  return await db().transaction(async (tx) => {
    // 1. Create the comment
    const comment = await insertComment({
      art_id,
      art_type,
      user_uuid,
      content,
      parent_uuid: parent_uuid || null,
      reply_to_user_uuid: reply_to_user_uuid || null,
    }, tx);

    // 2. Increment comment_count on the target resource (image, video, character)
    if (["image", "video", "character", "world"].includes(art_type)) {
      const result = await incrementStat(art_type as ArtType, art_id, "comment_count", tx);
      // Verify update
      if (result && result.length === 0) {
         // This might happen if resource was deleted just now
         throw new Error("Failed to update resource statistics");
      }
    }

    return comment;
  });
}

export async function deleteComment(uuid: string, user_uuid: string) {
  const comment = await findCommentByUuid(uuid);
  if (!comment) {
    throw new Error("Comment not found");
  }

  if (comment.user_uuid !== user_uuid) {
    throw new Error("Unauthorized");
  }

  return await db().transaction(async (tx) => {
    // 1. Soft delete the comment
    const success = await softDeleteComment(uuid, user_uuid, tx);
    if (!success) {
      throw new Error("Failed to delete comment");
    }

    // 2. Decrement comment_count on the target resource
    if (["image", "video", "character", "world"].includes(comment.art_type)) {
      const result = await decrementStat(comment.art_type as ArtType, comment.art_id, "comment_count", tx);
      if (result && result.length === 0) {
        throw new Error("Failed to update resource statistics");
      }
    }

    return true;
  });
}

export async function likeComment(uuid: string, user_uuid: string) {
  return await addUserInteraction({
    user_uuid,
    art_id: uuid,
    art_type: "comment",
    interaction_type: "like",
  });
}

export async function unlikeComment(uuid: string, user_uuid: string) {
  return await removeUserInteraction({
    user_uuid,
    art_id: uuid,
    art_type: "comment",
    interaction_type: "like",
  });
}

export async function getComments(
  art_id: string,
  art_type: string,
  page: number = 1,
  limit: number = 20,
  user_uuid?: string
): Promise<CommentWithUser[]> {
  const comments = await getCommentsByArt(art_id, art_type, page, limit);
  
  if (user_uuid && comments.length > 0) {
    const commentUuids = comments.map(c => c.uuid);
    const { findUserInteractionsByArtIds } = await import("@/models/user-interaction");
    const interactions = await findUserInteractionsByArtIds(user_uuid, commentUuids, "comment");
    const likedCommentUuids = new Set(
      interactions
        .filter(i => i.interaction_type === "like")
        .map(i => i.art_id)
    );
    
    return comments.map(c => ({
      ...c,
      is_liked: likedCommentUuids.has(c.uuid)
    }));
  }

  return comments;
}

export async function getReplies(
  parent_uuid: string,
  page: number = 1,
  limit: number = 50,
  user_uuid?: string
): Promise<CommentWithUser[]> {
  const replies = await getRepliesByParent(parent_uuid, page, limit);

  if (user_uuid && replies.length > 0) {
    const replyUuids = replies.map(c => c.uuid);
    const { findUserInteractionsByArtIds } = await import("@/models/user-interaction");
    const interactions = await findUserInteractionsByArtIds(user_uuid, replyUuids, "comment");
    const likedCommentUuids = new Set(
      interactions
        .filter(i => i.interaction_type === "like")
        .map(i => i.art_id)
    );
    
    return replies.map(c => ({
      ...c,
      is_liked: likedCommentUuids.has(c.uuid)
    }));
  }

  return replies;
}
