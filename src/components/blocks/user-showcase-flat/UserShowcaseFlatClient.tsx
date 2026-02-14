"use client";

import { useEffect, useMemo, useState } from "react";
import type { ArtworkPreview } from "@/types/pages/community";
import { ArtworkFlatCard } from "./ArtworkFlatCard";

function distributeToColumns<T>(items: T[], columnCount: number): T[][] {
  const columns: T[][] = Array.from({ length: columnCount }, () => []);
  items.forEach((item, index) => {
    const columnIndex = columnCount > 0 ? index % columnCount : 0;
    columns[columnIndex].push(item);
  });
  return columns;
}

interface UserShowcaseFlatClientProps {
  artworks: ArtworkPreview[];
  locale: string;
}

export function UserShowcaseFlatClient({
  artworks,
  locale,
}: UserShowcaseFlatClientProps) {
  const [columnCount, setColumnCount] = useState<number>(4);

  useEffect(() => {
    const updateColumnCount = () => {
      const width = window.innerWidth;
      if (width >= 1680) setColumnCount(5);
      else if (width >= 1280) setColumnCount(4);
      else if (width >= 1024) setColumnCount(3);
      else if (width >= 768) setColumnCount(2);
      else if (width >= 640) setColumnCount(2);
      else setColumnCount(2);
    };

    updateColumnCount();
    window.addEventListener("resize", updateColumnCount);
    return () => window.removeEventListener("resize", updateColumnCount);
  }, []);

  const columns = useMemo(
    () => distributeToColumns(artworks, columnCount),
    [artworks, columnCount]
  );

  if (artworks.length === 0) return null;

  return (
    <div className="flex gap-8 items-start">
      {columns.map((column, idx) => (
        <div key={idx} className="flex-1 flex flex-col gap-8">
          {column.map((artwork) => (
            <ArtworkFlatCard
              key={artwork.id}
              artwork={artwork}
              locale={locale}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
