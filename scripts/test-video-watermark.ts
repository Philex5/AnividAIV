import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { applyVideoWatermark } from "../src/services/generation/video/video-watermark-service";

type CliOptions = {
  videoUrl?: string;
  output?: string;
  generationUuid?: string;
};

function resolveOptions(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {};

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--video-url" || arg === "-u") {
      options.videoUrl = args[i + 1];
      i += 1;
    } else if (arg === "--output" || arg === "-o") {
      options.output = args[i + 1];
      i += 1;
    } else if (arg === "--generation-uuid" || arg === "-g") {
      options.generationUuid = args[i + 1];
      i += 1;
    }
  }

  return options;
}

function printUsageAndExit(): never {
  console.error(
    [
      "Usage: pnpm test:watermark -- --video-url <https-video-url> [--output ./debug/watermarked.mp4]",
      "",
      "Example:",
      "  pnpm test:watermark -- --video-url https://example.com/video.mp4 --output ./debug/test-watermark.mp4",
    ].join("\n")
  );
  process.exit(1);
}

async function downloadFile(url: string, destination: string) {
  const response = await fetch(url);

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Failed to download watermarked video (status ${response.status}${
        body ? `: ${body}` : ""
      })`
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, buffer);
  return buffer.byteLength;
}

async function main() {
  loadEnv({ path: ".env", override: true });
  loadEnv({ path: ".env.development", override: true });
  loadEnv({ path: ".env.local", override: true });

  const options = resolveOptions();
  if (!options.videoUrl) {
    printUsageAndExit();
  }

  const generationUuid =
    options.generationUuid ?? `test-watermark-${Date.now()}`;
  const outputPath = path.resolve(
    process.cwd(),
    options.output ?? `debug/watermark-${generationUuid}.mp4`
  );

  console.log("[WatermarkTest] Applying watermark via Cloudinary...");
  console.log("  Input video:", options.videoUrl);

  const resultUrl = await applyVideoWatermark({
    videoUrl: options.videoUrl,
    generationUuid,
  });

  console.log("  Cloudinary URL:", resultUrl);
  console.log("[WatermarkTest] Downloading result to:", outputPath);
  const fileSize = await downloadFile(resultUrl, outputPath);

  if (fileSize === 0) {
    throw new Error("Downloaded watermarked file is empty");
  }

  console.log(
    `[WatermarkTest] Success! Saved ${fileSize} bytes to ${outputPath}`
  );
}

main().catch((error) => {
  console.error("[WatermarkTest] Failed:", error);
  process.exit(1);
});
