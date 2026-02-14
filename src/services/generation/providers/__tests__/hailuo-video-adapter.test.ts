import { describe, expect, test } from "vitest";
import { HailuoVideoAdapter } from "../hailuo-video-adapter";

describe("HailuoVideoAdapter", () => {
  test("returns correct credits for supported combinations", () => {
    const adapter = new HailuoVideoAdapter();

    const standardCredits = adapter.calculateCredits({
      prompt: "test prompt",
      model_name: "hailuo/2-3-image-to-video-standard",
      task_subtype: "image_to_video",
      duration_seconds: 6,
      resolution: "1080p",
    });

    const proCredits = adapter.calculateCredits({
      prompt: "test prompt",
      model_name: "hailuo/2-3-image-to-video-pro",
      task_subtype: "image_to_video",
      duration_seconds: 10,
      resolution: "768p",
    });

    expect(standardCredits).toBe(250);
    expect(proCredits).toBe(450);
  });

  test("throws on unsupported 10s 1080p combination", () => {
    const adapter = new HailuoVideoAdapter();

    expect(() =>
      adapter.calculateCredits({
        prompt: "test prompt",
        model_name: "hailuo/2-3-image-to-video-standard",
        task_subtype: "image_to_video",
        duration_seconds: 10,
        resolution: "1080p",
      })
    ).toThrow("10s duration only supports 768p resolution");
  });

  test("throws on unsupported billing mapping", () => {
    const adapter = new HailuoVideoAdapter();

    expect(() =>
      adapter.calculateCredits({
        prompt: "test prompt",
        model_name: "hailuo/2-3-image-to-video-standard",
        task_subtype: "image_to_video",
        duration_seconds: 12,
        resolution: "768p",
      })
    ).toThrow("unsupported billing combination");
  });
});
