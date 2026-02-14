interface StorageConfig {
  endpoint: string;
  region: string;
  accessKey: string;
  secretKey: string;
}

export function newStorage(config?: StorageConfig) {
  return new Storage(config);
}

export class Storage {
  private endpoint: string;
  private accessKeyId: string;
  private secretAccessKey: string;
  private bucket: string;
  private region: string;

  constructor(config?: StorageConfig) {
    this.endpoint = config?.endpoint || process.env.STORAGE_ENDPOINT || "";
    this.accessKeyId =
      config?.accessKey || process.env.STORAGE_ACCESS_KEY || "";
    this.secretAccessKey =
      config?.secretKey || process.env.STORAGE_SECRET_KEY || "";
    this.bucket = process.env.STORAGE_BUCKET || "";
    this.region = config?.region || process.env.STORAGE_REGION || "auto";
  }

  async uploadFile({
    body,
    key,
    contentType,
    bucket,
    onProgress,
    disposition = "inline",
  }: {
    body: Buffer | Uint8Array;
    key: string;
    contentType?: string;
    bucket?: string;
    onProgress?: (progress: number) => void;
    disposition?: "inline" | "attachment";
  }) {
    const uploadBucket = bucket || this.bucket;
    if (!uploadBucket) {
      throw new Error("Bucket is required");
    }

    const bodyArray = body instanceof Buffer ? new Uint8Array(body) : body;

    const url = `${this.endpoint}/${uploadBucket}/${key}`;

    const { AwsClient } = await import("aws4fetch");

    const client = new AwsClient({
      accessKeyId: this.accessKeyId,
      secretAccessKey: this.secretAccessKey,
    });

    const headers: Record<string, string> = {
      "Content-Type": contentType || "application/octet-stream",
      "Content-Disposition": disposition,
      "Content-Length": bodyArray.length.toString(),
    };

    const request = new Request(url, {
      method: "PUT",
      headers,
      body: bodyArray as any,
    });

    const response = await client.fetch(request);

    if (!response.ok) {
      const errorText = await response.text();
      const errorMessage = `Upload failed (${response.status}): ${response.statusText}${errorText ? ` - ${errorText}` : ""}`;
      console.error(`❌ [Storage] Upload error details:`, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorText,
        url,
        key,
        contentLength: bodyArray.length,
      });
      throw new Error(errorMessage);
    }

    return {
      location: url,
      bucket: uploadBucket,
      key,
      filename: key.split("/").pop(),
      url: process.env.STORAGE_DOMAIN
        ? `${process.env.STORAGE_DOMAIN}/${key}`
        : url,
    };
  }

  async downloadAndUpload({
    url,
    key,
    bucket,
    contentType,
    disposition = "inline",
  }: {
    url: string;
    key: string;
    bucket?: string;
    contentType?: string;
    disposition?: "inline" | "attachment";
  }) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("No body in response");
    }

    const arrayBuffer = await response.arrayBuffer();
    const body = new Uint8Array(arrayBuffer);

    return this.uploadFile({
      body,
      key,
      bucket,
      contentType,
      disposition,
    });
  }

  async listObjects({
    prefix,
    bucket,
    maxKeys = 1000,
  }: {
    prefix: string;
    bucket?: string;
    maxKeys?: number;
  }) {
    const listBucket = bucket || this.bucket;
    if (!listBucket) {
      throw new Error("Bucket is required");
    }

    const { AwsClient } = await import("aws4fetch");

    const client = new AwsClient({
      accessKeyId: this.accessKeyId,
      secretAccessKey: this.secretAccessKey,
    });

    // Cloudflare R2 使用 S3 API 格式
    const url = `${this.endpoint}/${listBucket}`;
    const params = new URLSearchParams({
      "list-type": "2",
      "max-keys": maxKeys.toString(),
      prefix,
    });

    const request = new Request(`${url}?${params.toString()}`, {
      method: "GET",
    });

    const response = await client.fetch(request);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`List objects failed (${response.status}): ${errorText}`);
    }

    const xmlText = await response.text();

    // Parse XML response for S3 ListObjectsV2
    const objects: string[] = [];

    // Match Contents elements
    const contentsRegex = /<Contents>([\s\S]*?)<\/Contents>/g;
    let match;
    while ((match = contentsRegex.exec(xmlText)) !== null) {
      const content = match[1];
      const keyMatch = content.match(/<Key>(.*?)<\/Key>/);
      if (keyMatch) {
        objects.push(keyMatch[1]);
      }
    }

    // Match CommonPrefixes for directories
    const commonPrefixesRegex = /<CommonPrefixes>([\s\S]*?)<\/CommonPrefixes>/g;
    while ((match = commonPrefixesRegex.exec(xmlText)) !== null) {
      const prefixContent = match[1];
      const prefixMatch = prefixContent.match(/<Prefix>(.*?)<\/Prefix>/);
      if (prefixMatch) {
        objects.push(prefixMatch[1]);
      }
    }

    return objects;
  }

  async deleteObjects({ keys, bucket }: { keys: string[]; bucket?: string }) {
    const deleteBucket = bucket || this.bucket;
    if (!deleteBucket) {
      throw new Error("Bucket is required");
    }

    if (!keys.length) {
      return { deleted: [], errors: [] };
    }

    const { AwsClient } = await import("aws4fetch");

    const client = new AwsClient({
      accessKeyId: this.accessKeyId,
      secretAccessKey: this.secretAccessKey,
    });

    // Cloudflare R2 使用 S3 API 格式 - DeleteObjects 需要在 URL 中添加 delete 参数
    const url = `${this.endpoint}/${deleteBucket}?delete`;

    // Build XML for delete request - S3 DeleteObjects API
    const deleteXml = `<?xml version="1.0" encoding="UTF-8"?>
<Delete>
  <Quiet>false</Quiet>
  ${keys.map((key) => `<Object><Key>${key}</Key></Object>`).join("\n  ")}
</Delete>`;

    const request = new Request(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/xml",
      },
      body: deleteXml,
    });

    const response = await client.fetch(request);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Delete objects failed (${response.status}): ${errorText}`
      );
    }

    const responseText = await response.text();

    // Parse XML response to extract deleted and error keys
    const deleted: string[] = [];
    const errors: { key: string; code?: string; message?: string }[] = [];

    // Parse Deleted elements
    const deletedRegex = /<Deleted>([\s\S]*?)<\/Deleted>/g;
    let match;
    while ((match = deletedRegex.exec(responseText)) !== null) {
      const deletedContent = match[1];
      const keyMatch = deletedContent.match(/<Key>(.*?)<\/Key>/);
      if (keyMatch) {
        deleted.push(keyMatch[1]);
      }
    }

    // Parse Error elements
    const errorRegex = /<Error>([\s\S]*?)<\/Error>/g;
    while ((match = errorRegex.exec(responseText)) !== null) {
      const errorContent = match[1];
      const keyMatch = errorContent.match(/<Key>(.*?)<\/Key>/);
      const codeMatch = errorContent.match(/<Code>(.*?)<\/Code>/);
      const messageMatch = errorContent.match(/<Message>(.*?)<\/Message>/);

      errors.push({
        key: keyMatch?.[1] || "unknown",
        code: codeMatch?.[1],
        message: messageMatch?.[1],
      });
    }

    return { deleted, errors };
  }
}
