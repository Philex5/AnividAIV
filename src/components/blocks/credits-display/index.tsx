"use client";

import { useAppContext } from "@/contexts/app";
import Image from "next/image";
import { getCreamyCharacterUrl } from "@/lib/asset-loader";

export default function CreditsDisplay() {
  const { credits, isLoadingCredits } = useAppContext();

  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50">
      <Image
        src={getCreamyCharacterUrl("meow_coin")}
        alt="Credits"
        width={512}
        height={512}
        className="w-6 h-6 object-contain"
      />
      <span className="text-sm font-medium">
        {isLoadingCredits ? "..." : credits}
      </span>
    </div>
  );
}