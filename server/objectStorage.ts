import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import { Readable } from "stream";
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

// Retain the existing Replit client for the old deployment.
export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: { type: "json", subject_token_field_name: "access_token" },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

interface StorageFile {
  getMetadata(): Promise<[{ contentType?: string; size?: string | number }]>;
  createReadStream(): Readable;
  delete(): Promise<unknown>;
}

function isMissingObject(error: unknown): boolean {
  const e = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return e?.name === "NoSuchKey" || e?.name === "NotFound" || e?.$metadata?.httpStatusCode === 404;
}

export class ObjectStorageService {
  private bucketName = "";
  private initialized = false;
  private s3Client?: S3Client;

  constructor() {
    try {
      this.bucketName = process.env.OBJECT_STORAGE_BUCKET || "";
      const provider = process.env.OBJECT_STORAGE_PROVIDER || (process.env.RAILWAY_PROJECT_ID ? "s3" : "replit");
      if (provider !== "replit" && provider !== "s3") {
        throw new Error("OBJECT_STORAGE_PROVIDER must be replit or s3");
      }
      if (provider === "s3") {
        const endpoint = process.env.S3_ENDPOINT;
        const accessKeyId = process.env.S3_ACCESS_KEY_ID;
        const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
        if (!endpoint || !accessKeyId || !secretAccessKey) {
          console.warn("ObjectStorageService: S3 credentials are incomplete; object storage disabled.");
          return;
        }
        const parsedEndpoint = new URL(endpoint);
        if (!["https:", "http:"].includes(parsedEndpoint.protocol) || parsedEndpoint.username || parsedEndpoint.password) {
          throw new Error("S3_ENDPOINT must be an HTTP(S) URL without credentials");
        }
        this.s3Client = new S3Client({
          endpoint,
          region: process.env.S3_REGION || "auto",
          credentials: { accessKeyId, secretAccessKey },
          forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
          requestChecksumCalculation: "WHEN_REQUIRED",
          responseChecksumValidation: "WHEN_REQUIRED",
        });
      }
      this.initialized = true;
      if (!this.bucketName) console.warn("ObjectStorageService: OBJECT_STORAGE_BUCKET not set; object storage disabled.");
    } catch {
      // Never log credential-bearing SDK configuration or endpoint values.
      console.error("ObjectStorageService: invalid configuration; object storage disabled.");
      this.initialized = false;
    }
  }

  isConfigured(): boolean {
    return this.initialized && !!this.bucketName;
  }

  getBucketName(): string {
    if (!this.isConfigured()) throw new Error("Object storage is not configured for this deployment.");
    return this.bucketName;
  }

  async uploadFile(buffer: Buffer, filename: string, contentType: string): Promise<string> {
    const bucketName = this.getBucketName();
    const objectName = `uploads/${filename}`;
    if (this.s3Client) {
      await this.s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: objectName,
        Body: buffer,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000",
      }));
    } else {
      await objectStorageClient.bucket(bucketName).file(objectName).save(buffer, {
        contentType,
        metadata: { cacheControl: "public, max-age=31536000" },
      });
    }
    // Preserve database URLs and the public Express route across providers.
    return `/storage/${objectName}`;
  }

  async getFile(objectPath: string): Promise<StorageFile> {
    const bucketName = this.getBucketName();
    const objectName = objectPath.startsWith("/storage/") ? objectPath.slice(9) : objectPath;
    if (!objectName) throw new ObjectNotFoundError();
    if (this.s3Client) {
      const client = this.s3Client;
      let metadata;
      try {
        metadata = await client.send(new HeadObjectCommand({ Bucket: bucketName, Key: objectName }));
      } catch (error) {
        if (isMissingObject(error)) throw new ObjectNotFoundError();
        throw error; // Access/network errors must not masquerade as missing files.
      }
      return {
        getMetadata: async () => [{ contentType: metadata.ContentType, size: metadata.ContentLength }],
        createReadStream: () => Readable.from((async function* () {
          const object = await client.send(new GetObjectCommand({ Bucket: bucketName, Key: objectName }));
          if (!(object.Body instanceof Readable)) throw new Error("Object storage returned no readable body");
          for await (const chunk of object.Body) yield chunk;
        })()),
        delete: () => client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: objectName })),
      };
    }
    const file: File = objectStorageClient.bucket(bucketName).file(objectName);
    const [exists] = await file.exists();
    if (!exists) throw new ObjectNotFoundError();
    return {
      getMetadata: async () => {
        const [metadata] = await file.getMetadata();
        return [{ contentType: metadata.contentType, size: metadata.size }];
      },
      createReadStream: () => file.createReadStream(),
      delete: () => file.delete(),
    };
  }

  async downloadObject(file: StorageFile, res: Response, cacheTtlSec = 3600) {
    try {
      const [metadata] = await file.getMetadata();
      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        ...(metadata.size === undefined ? {} : { "Content-Length": String(metadata.size) }),
        "Cache-Control": `public, max-age=${cacheTtlSec}`,
      });
      const stream = file.createReadStream();
      res.on("close", () => stream.destroy());
      stream.on("error", () => {
        console.error("Object storage stream failed");
        if (!res.headersSent) {
          res.removeHeader("Content-Length");
          res.type("application/json").status(500).json({ error: "Error streaming file" });
        } else {
          res.destroy();
        }
      });
      stream.pipe(res);
    } catch {
      console.error("Object storage download failed");
      if (!res.headersSent) {
        res.removeHeader("Content-Length");
        res.type("application/json").status(500).json({ error: "Error downloading file" });
      }
      else res.destroy();
    }
  }

  async getSignedUploadUrl(filename: string): Promise<{ url: string; objectPath: string }> {
    const bucketName = this.getBucketName();
    const objectName = `uploads/${filename}`;
    const url = this.s3Client
      ? await getSignedUrl(this.s3Client, new PutObjectCommand({ Bucket: bucketName, Key: objectName }), { expiresIn: 900 })
      : await signObjectURL({ bucketName, objectName, method: "PUT", ttlSec: 900 });
    return { url, objectPath: `/storage/${objectName}` };
  }

  async deleteFile(objectPath: string): Promise<void> {
    try {
      const file = await this.getFile(objectPath);
      await file.delete();
    } catch (error) {
      if (error instanceof ObjectNotFoundError) return;
      throw error;
    }
  }
}

async function signObjectURL({ bucketName, objectName, method, ttlSec }: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const response = await fetch(`${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket_name: bucketName,
      object_name: objectName,
      method,
      expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
    }),
  });
  if (!response.ok) throw new Error(`Failed to sign Replit object URL: ${response.status}`);
  const { signed_url } = await response.json();
  return signed_url;
}
