"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Heart,
  Eye,
  GitFork,
  MoreHorizontal,
  Edit,
  Trash2,
  Share2,
  Download,
  Sparkles
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useLocale } from "next-intl";
import { parseCharacterModules } from "@/types/oc";

interface CharacterData {
  uuid: string;
  name: string;
  gender: string;
  age?: number;
  personality_tags?: string[];
  brief_introduction?: string;
  visibility_level: string;
  allow_remix: boolean;
  avatar_url?: string;
  profile_image_url?: string;
  generation_count: number;
  like_count: number;
  remix_count: number;
  view_count: number;
  created_at: string;
  updated_at: string;
  // 用户相关
  user_id?: number;
  is_owner?: boolean;
  is_liked?: boolean;
  modules?: unknown;
}

interface CharacterCardProps {
  character: CharacterData;
  variant?: "default" | "compact" | "detailed";
  showActions?: boolean;
  onEdit?: (character: CharacterData) => void;
  onDelete?: (character: CharacterData) => void;
  onLike?: (character: CharacterData) => void;
  onUnlike?: (character: CharacterData) => void;
  onShare?: (character: CharacterData) => void;
  className?: string;
}

export function CharacterCard({
  character,
  variant = "default",
  showActions = true,
  onEdit,
  onDelete,
  onLike,
  onUnlike,
  onShare,
  className = "",
}: CharacterCardProps) {
  const locale = useLocale();
  const [isLiked, setIsLiked] = useState(character.is_liked || false);
  const [likeCount, setLikeCount] = useState(character.like_count);
  const [isLoading, setIsLoading] = useState(false);
  const modules = parseCharacterModules(character.modules);
  const backgroundStory = modules.background?.background_story;

  const handleLike = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      if (isLiked) {
        await fetch(`/api/oc-maker/characters/${character.uuid}/like`, {
          method: "DELETE",
        });
        setIsLiked(false);
        setLikeCount(prev => prev - 1);
        onUnlike?.(character);
      } else {
        await fetch(`/api/oc-maker/characters/${character.uuid}/like`, {
          method: "POST",
        });
        setIsLiked(true);
        setLikeCount(prev => prev + 1);
        onLike?.(character);
      }
    } catch (error) {
      console.error("Operation failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (variant === "compact") {
    return (
      <Card className={`hover:shadow-md transition-shadow ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={character.avatar_url} alt={character.name} />
              <AvatarFallback>{character.name.charAt(0)}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold truncate">{character.name}</h3>
                {showActions && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/oc-maker/characters/${character.uuid}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      {character.is_owner && (
                        <>
                          <DropdownMenuItem onClick={() => onEdit?.(character)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onDelete?.(character)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              <div className="text-sm text-muted-foreground mb-2">
                {character.gender} • {character.age && `${character.age} years old • `}
              </div>

              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                <div className="flex items-center">
                  <Heart className="h-3 w-3 mr-1" />
                  {likeCount}
                </div>
                <div className="flex items-center">
                  <Eye className="h-3 w-3 mr-1" />
                  {character.view_count}
                </div>
                {character.remix_count > 0 && (
                  <div className="flex items-center">
                    <GitFork className="h-3 w-3 mr-1" />
                    {character.remix_count}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`hover:shadow-lg transition-shadow group ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={character.avatar_url} alt={character.name} />
              <AvatarFallback>{character.name.charAt(0)}</AvatarFallback>
            </Avatar>

            <div>
              <CardTitle className="text-lg">{character.name}</CardTitle>
              <div className="text-sm text-muted-foreground">
                {character.gender} • {character.age && `${character.age} years old • `}
              </div>
            </div>
          </div>

          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/oc-maker/characters/${character.uuid}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onShare?.(character)}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </DropdownMenuItem>
                {character.is_owner && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onEdit?.(character)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete?.(character)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* 个性标签 */}
        {character.personality_tags && character.personality_tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {character.personality_tags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {character.personality_tags.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{character.personality_tags.length - 4}
              </Badge>
            )}
          </div>
        )}

        {/* 背景故事 */}
        {backgroundStory && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
            {backgroundStory}
          </p>
        )}

        {/* 统计信息 */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <Eye className="h-4 w-4 mr-1" />
              {character.view_count}
            </div>
            <div className="flex items-center">
              <Sparkles className="h-4 w-4 mr-1" />
              {character.generation_count}
            </div>
            {character.remix_count > 0 && (
              <div className="flex items-center">
                <GitFork className="h-4 w-4 mr-1" />
                {character.remix_count}
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            disabled={isLoading}
            className={isLiked ? "text-destructive" : ""}
          >
            <Heart className={`h-4 w-4 mr-1 ${isLiked ? "fill-current" : ""}`} />
            {likeCount}
          </Button>
        </div>

        {/* 可见性状态 */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <Badge
            variant={character.visibility_level === "public" ? "default" : "secondary"}
            className="text-xs"
          >
            {character.visibility_level === "public" ? "Public": "Private"}
          </Badge>

          <div className="text-xs text-muted-foreground">
            {new Date(character.updated_at).toLocaleDateString(locale)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
