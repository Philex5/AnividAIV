import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { KlingVideoAdapter } from "../kling-video-adapter";

function mockOkJsonResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as any;
}

describe("KlingVideoAdapter", () => {
  beforeEach(() => {
    process.env.KIE_AI_API_KEY = "test-key";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.KIE_AI_API_KEY;
  });

  test("multi-shot mode sends template-applied multi_prompt without outer input.prompt", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(mockOkJsonResponse({ code: 200, data: { taskId: "k3-1" } }));
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new KlingVideoAdapter();
    await adapter.createTask(
      {
        model_name: "kling-3.0/video",
        prompt: "outer prompt should not be used in multi-shot",
        video_mode: "multi_shot",
        multi_shots: true,
        mode: "std",
        duration_seconds: 8,
        multi_prompt: [
          { prompt: "shot one", duration: 4 },
          { prompt: "shot two", duration: 4 },
        ],
      },
      "https://example.com/api/generation/webhook?token=abc",
    );

    const [, options] = fetchMock.mock.calls[0];
    const requestBody = JSON.parse(options.body);

    expect(requestBody.input.multi_shots).toBe(true);
    expect(requestBody.input.multi_prompt).toEqual([
      { prompt: "shot one", duration: 4 },
      { prompt: "shot two", duration: 4 },
    ]);
    expect(requestBody.input.prompt).toBeUndefined();
  });

  test("non multi-shot mode still sends outer input.prompt", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(mockOkJsonResponse({ code: 200, data: { taskId: "k3-2" } }));
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new KlingVideoAdapter();
    await adapter.createTask(
      {
        model_name: "kling-3.0/video",
        prompt: "single shot prompt",
        video_mode: "start_end_frame",
        mode: "std",
        duration_seconds: 5,
        reference_image_urls: [
          "https://example.com/start.png",
          "https://example.com/end.png",
        ],
      },
      "https://example.com/api/generation/webhook?token=abc",
    );

    const [, options] = fetchMock.mock.calls[0];
    const requestBody = JSON.parse(options.body);

    expect(requestBody.input.multi_shots).toBe(false);
    expect(requestBody.input.prompt).toBe("single shot prompt");
  });

  test("multi-shot mode requires a start frame image", async () => {
    const adapter = new KlingVideoAdapter();

    await expect(
      adapter.createTask(
        {
          model_name: "kling-3.0/video",
          prompt: "shot prompt",
          video_mode: "multi_shot",
          multi_shots: true,
          mode: "std",
          duration_seconds: 5,
          multi_prompt: [{ prompt: "shot one", duration: 5 }],
        },
        "https://example.com/api/generation/webhook?token=abc",
      ),
    ).rejects.toThrow("Kling 3.0 multi_shots requires a start frame image");
  });

  test("non multi-shot mode allows empty start/end frames", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(mockOkJsonResponse({ code: 200, data: { taskId: "k3-3" } }));
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new KlingVideoAdapter();
    await adapter.createTask(
      {
        model_name: "kling-3.0/video",
        prompt: "single shot without frames",
        video_mode: "start_end_frame",
        mode: "std",
        duration_seconds: 5,
      },
      "https://example.com/api/generation/webhook?token=abc",
    );

    const [, options] = fetchMock.mock.calls[0];
    const requestBody = JSON.parse(options.body);

    expect(requestBody.input.multi_shots).toBe(false);
    expect(requestBody.input.prompt).toBe("single shot without frames");
    expect(requestBody.input.image_urls).toBeUndefined();
  });
});
