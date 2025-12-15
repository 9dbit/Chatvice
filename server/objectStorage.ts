import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import { randomUUID } from "crypto";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
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

export class ObjectStorageService {
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.OBJECT_STORAGE_BUCKET || "";
  }

  isConfigured(): boolean {
    return !!this.bucketName;
  }

  getBucketName(): string {
    if (!this.bucketName) {
      throw new Error(
        "OBJECT_STORAGE_BUCKET not set. Create a bucket in 'Object Storage' " +
          "tool and set OBJECT_STORAGE_BUCKET env var."
      );
    }
    return this.bucketName;
  }

  async uploadFile(buffer: Buffer, filename: string, contentType: string): Promise<string> {
    const bucketName = this.getBucketName();
    const objectName = `uploads/${filename}`;
    
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);
    
    await file.save(buffer, {
      contentType: contentType,
      metadata: {
        cacheControl: 'public, max-age=31536000',
      },
    });
    
    return `/storage/${objectName}`;
  }

  async getFile(objectPath: string): Promise<File> {
    const bucketName = this.getBucketName();
    
    let objectName = objectPath;
    if (objectName.startsWith("/storage/")) {
      objectName = objectName.slice(9);
    }
    
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);
    
    const [exists] = await file.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    
    return file;
  }

  async downloadObject(file: File, res: Response, cacheTtlSec: number = 3600) {
    try {
      const [metadata] = await file.getMetadata();
      
      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Length": metadata.size,
        "Cache-Control": `public, max-age=${cacheTtlSec}`,
      });

      const stream = file.createReadStream();

      stream.on("error", (err: Error) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });

      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  async getSignedUploadUrl(filename: string): Promise<{ url: string; objectPath: string }> {
    const bucketName = this.getBucketName();
    const objectName = `uploads/${filename}`;
    
    const signedUrl = await signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
    });
    
    return {
      url: signedUrl,
      objectPath: `/storage/${objectName}`,
    };
  }

  async deleteFile(objectPath: string): Promise<void> {
    try {
      const file = await this.getFile(objectPath);
      await file.delete();
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        return;
      }
      throw error;
    }
  }
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, ` +
        `make sure you're running on Replit`
    );
  }

  const { signed_url: signedURL } = await response.json();
  return signedURL;
}
