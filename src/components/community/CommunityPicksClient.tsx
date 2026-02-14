"use client";

import { useEffect, useState } from "react";
import { CommunityPicksSection } from "./CommunityPicksSection";
import type { ArtworkPreview, CommunityPage } from "@/types/pages/community";
import type { CommunityListParams } from "@/services/community";

interface CommunityPicksClientProps {
  pageData: CommunityPage;
  initialQuery?: CommunityListParams;
}

export function CommunityPicksClient({
  pageData,
  initialQuery = { sort: "trending", limit: 8 },
}: CommunityPicksClientProps) {
  const [artworks, setArtworks] = useState<ArtworkPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCommunityData = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          sort: initialQuery.sort || "trending",
          limit: String(initialQuery.limit || 8),
        });

        const response = await fetch(`/api/community/artworks?${params}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[CommunityPicksClient] Response error:", response.status, errorText);
          throw new Error(`Failed to fetch: ${response.status}`);
        }

        const data = await response.json();

        // respData wraps the response, so items are in data.data.items
        const responseData = data.data || data;
        const artworksData = responseData.items || [];
        setArtworks(artworksData);
      } catch (err) {
        console.error("[CommunityPicksClient] Error:", err);
        setError(err instanceof Error ? err.message : "Failed to load community picks");
      } finally {
        setLoading(false);
      }
    };

    fetchCommunityData();
  }, [initialQuery.sort, initialQuery.limit]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (artworks.length === 0) {
    return (
      <p className="text-muted-foreground">
        {pageData?.states?.noResults || "No artworks found"}
      </p>
    );
  }

  return <CommunityPicksSection items={artworks} pageData={pageData} />;
}
