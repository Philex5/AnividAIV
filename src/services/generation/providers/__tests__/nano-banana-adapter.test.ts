import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { NanoBananaAdapter } from "../nano-banana-adapter";

function mockOkJsonResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as any;
}

describe("NanoBananaAdapter", () => {
  beforeEach(() => {
    process.env.KIE_AI_API_KEY = "test-key";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.KIE_AI_API_KEY;
  });

  test("creates task with correct jobs/createTask format (text-to-image)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(mockOkJsonResponse({ code: 200, data: { taskId: "t1" } }));
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new NanoBananaAdapter(false);
    const callbackUrl = "https://example.com/api/generation/webhook?token=abc";

    await adapter.createTask(
      {
        model_name: "google/nano-banana",
        prompt: "test prompt",
        aspect_ratio: "2:3",
        counts: 1,
        reference_image_urls: [],
      },
      callbackUrl
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.kie.ai/api/v1/jobs/createTask");
    expect(options.method).toBe("POST");

    const parsed = JSON.parse(options.body);
    expect(parsed).toEqual({
      model: "google/nano-banana",
      callBackUrl: callbackUrl,
      input: {
        prompt: "test prompt",
        output_format: "png",
        image_size: "2:3",
      },
    });
  });

  test("creates task with correct jobs/createTask format (image-to-image)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(mockOkJsonResponse({ code: 200, data: { taskId: "t2" } }));
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new NanoBananaAdapter(true);
    const callbackUrl = "https://example.com/api/generation/webhook?token=abc";

    await adapter.createTask(
      {
        model_name: "google/nano-banana-edit",
        prompt: "edit prompt",
        aspect_ratio: "auto",
        counts: 1,
        reference_image_urls: ["https://example.com/ref.png"],
      },
      callbackUrl
    );

    const [, options] = fetchMock.mock.calls[0];
    const parsed = JSON.parse(options.body);
    expect(parsed.model).toBe("google/nano-banana-edit");
    expect(parsed.input.image_urls).toEqual(["https://example.com/ref.png"]);
  });

  test("falls back to auto when aspect ratio is invalid", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(mockOkJsonResponse({ code: 200, data: { taskId: "t3" } }));
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new NanoBananaAdapter(false);
    const callbackUrl = "https://example.com/api/generation/webhook?token=abc";

    await adapter.createTask(
      {
        model_name: "google/nano-banana",
        prompt: "test prompt",
        aspect_ratio: "not-a-ratio",
      },
      callbackUrl
    );

    const [, options] = fetchMock.mock.calls[0];
    const parsed = JSON.parse(options.body);
    expect(parsed.input.image_size).toBe("auto");
  });

  test("throws when edit mode has no reference images", async () => {
    const adapter = new NanoBananaAdapter(true);
    await expect(
      adapter.createTask(
        {
          model_name: "google/nano-banana-edit",
          prompt: "edit prompt",
          aspect_ratio: "1:1",
          reference_image_urls: [],
        },
        "https://example.com/api/generation/webhook?token=abc"
      )
    ).rejects.toThrow("input.image_urls is required");
  });
});
