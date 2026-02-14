"use client";

import { getCreamyDecorationUrl } from "@/lib/asset-loader";

/**
 * Thinking Animation Component
 * Displays three bouncing paw prints to indicate AI is thinking/generating response
 */
export default function ThinkingAnimation() {
  const footIcon = getCreamyDecorationUrl("foot");

  return (
    <div className="flex items-center gap-0.5 py-1">
      <img
        src={footIcon}
        alt=""
        className="w-4 h-4 animate-bounce"
        style={{ animationDelay: "0ms", animationDuration: "1s" }}
      />
      <img
        src={footIcon}
        alt=""
        className="w-4 h-4 animate-bounce"
        style={{ animationDelay: "200ms", animationDuration: "1s" }}
      />
      <img
        src={footIcon}
        alt=""
        className="w-4 h-4 animate-bounce"
        style={{ animationDelay: "400ms", animationDuration: "1s" }}
      />
    </div>
  );
}
