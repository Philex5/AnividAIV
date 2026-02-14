"use client";

import { useState, useEffect } from "react";
import { CharacterCard } from "./CharacterCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, Filter, Plus, Grid3x3, List } from "lucide-react";
import Link from "next/link";

interface CharacterData {
  uuid: string;
  name: string;
  gender: string;
  age?: number;
  personality_tags?: string[];
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
  user_id?: number;
  is_owner?: boolean;
  is_liked?: boolean;
  modules?: unknown;
}

interface CharacterListProps {
  type?: "user" | "public";
  showCreateButton?: boolean;
  showFilters?: boolean;
  initialViewMode?: "grid" | "list";
  className?: string;
}

export function CharacterList({
  type = "public",
  showCreateButton = false,
  showFilters = true,
  initialViewMode = "grid",
  className = "",
}: CharacterListProps) {
  const [characters, setCharacters] = useState<CharacterData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("updated");
  const [filterBy, setFilterBy] = useState("all");
  const [viewMode, setViewMode] = useState(initialViewMode);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadCharacters();
  }, [type, sortBy, filterBy]);

  const loadCharacters = async (pageNum = 1) => {
    setIsLoading(true);
    try {
      let url = "";
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: "20",
      });

      if (type === "user") {
        url = "/api/oc-maker/characters";
      } else {
        url = "/api/oc-maker/public/characters";
      }

      const response = await fetch(`${url}?${params}`);
      if (!response.ok) {
        throw new Error("Failed to load characters");
      }

      const result = await response.json();
      const newCharacters = result.data.characters || [];

      if (pageNum === 1) {
        setCharacters(newCharacters);
      } else {
        setCharacters(prev => [...prev, ...newCharacters]);
      }

      setHasMore(newCharacters.length === 20);
    } catch (error) {
      console.error("Failed to load characters:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = () => {
    if (!isLoading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadCharacters(nextPage);
    }
  };

  const handleEdit = (character: CharacterData) => {
    // TODO: Open edit modal or navigate to edit page
    console.log("Editing character:", character.uuid);
  };

  const handleDelete = async (character: CharacterData) => {
    if (!confirm(`Are you sure you want to delete character "${character.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/oc-maker/characters/${character.uuid}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete character");
      }

      setCharacters(prev => prev.filter(c => c.uuid !== character.uuid));
    } catch (error) {
      console.error("Failed to delete character:", error);
      alert("Failed to delete character. Please try again.");
    }
  };

  const handleShare = (character: CharacterData) => {
    // 修复分享URL路径 - 使用正确的角色详情页路径
    const url = `${window.location.origin}/characters/${character.uuid}`;
    navigator.clipboard.writeText(url).then(() => {
      alert("Link copied to clipboard");
    }).catch(err => {
      console.error("Failed to copy link:", err);
      alert("Failed to copy link");
    });
  };

  const filteredCharacters = characters.filter(character => {
    if (searchTerm && !character.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    if (filterBy === "liked" && !character.is_liked) {
      return false;
    }

    if (filterBy === "forkable" && !character.allow_remix) {
      return false;
    }

    return true;
  });

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 头部操作栏 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          {/* 搜索 */}
          {showFilters && (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search characters..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          )}

          {/* 筛选和排序 */}
          {showFilters && (
            <div className="flex items-center gap-2">
              <Select value={filterBy} onValueChange={setFilterBy}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="liked">Liked</SelectItem>
                  <SelectItem value="forkable">Forkable</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated">Recently Updated</SelectItem>
                  <SelectItem value="created">Creation Time</SelectItem>
                  <SelectItem value="liked">Most Liked</SelectItem>
                  <SelectItem value="viewed">Most Viewed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* 视图切换和创建按钮 */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border p-1">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="h-8 px-2"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-8 px-2"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {showCreateButton && (
            <Button asChild variant="default">
              <Link href="/oc-maker">
                <Plus className="mr-2 h-4 w-4" />
                Create Character
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* 角色列表 */}
      <div className="space-y-4">
        {isLoading && characters.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>Loading...</span>
          </div>
        ) : filteredCharacters.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {searchTerm ? "No matching characters found" : "No characters yet"}
          </div>
        ) : (
          <>
            <div className={
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                : "space-y-4"
            }>
              {filteredCharacters.map((character) => (
                <CharacterCard
                  key={character.uuid}
                  character={character}
                  variant={viewMode === "list" ? "compact" : "default"}
                  showActions={type === "user" || character.is_owner}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onShare={handleShare}
                />
              ))}
            </div>

            {/* 加载更多 */}
            {hasMore && (
              <div className="flex justify-center pt-6">
                <Button
                  onClick={loadMore}
                  disabled={isLoading}
                  variant="outline"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load More"
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
