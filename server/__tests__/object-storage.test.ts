// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createServer, type Server } from "node:http";
import express from "express";
import request from "supertest";
import { ObjectStorageService, ObjectNotFoundError } from "../objectStorage";

let server: Server;
let endpoint: string;
const objects = new Map<string, { body: Buffer; contentType: string }>();
const requests: string[] = [];

beforeAll(async () => {
  server = createServer(async (req, res) => {
    requests.push(req.method + " " + req.url);
    const key = decodeURIComponent(new URL(req.url!, "http://localhost").pathname);
    if (!req.headers.authorization?.startsWith("AWS4-HMAC-SHA256 ")) {
      res.writeHead(401).end();
      return;
    }
    if (key.endsWith("/denied")) {
      res.writeHead(403, { "content-type": "application/xml" }).end("<Error><Code>AccessDenied</Code></Error>");
      return;
    }
    if (req.method === "PUT") {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      objects.set(key, { body: Buffer.concat(chunks), contentType: String(req.headers["content-type"]) });
      res.writeHead(200, { ETag: '"test-etag"' }).end();
      return;
    }
    if (req.method === "DELETE") {
      objects.delete(key);
      res.writeHead(204).end();
      return;
    }
    const object = objects.get(key);
    if (!object) {
      res.writeHead(404, { "content-type": "application/xml" }).end("<Error><Code>NoSuchKey</Code></Error>");
      return;
    }
    res.writeHead(200, { "content-type": object.contentType, "content-length": object.body.length });
    res.end(req.method === "HEAD" ? undefined : object.body);
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  endpoint = "http://127.0.0.1:" + (server.address() as { port: number }).port;
});

afterAll(async () => { await new Promise<void>(resolve => server.close(() => resolve())); });
beforeEach(() => {
  objects.clear();
  requests.length = 0;
  vi.stubEnv("RAILWAY_PROJECT_ID", "validation");
  vi.stubEnv("OBJECT_STORAGE_PROVIDER", "s3");
  vi.stubEnv("OBJECT_STORAGE_BUCKET", "migration-test");
  vi.stubEnv("S3_ENDPOINT", endpoint);
  vi.stubEnv("S3_REGION", "auto");
  vi.stubEnv("S3_ACCESS_KEY_ID", "test-access-key");
  vi.stubEnv("S3_SECRET_ACCESS_KEY", "test-secret-key");
  vi.stubEnv("S3_FORCE_PATH_STYLE", "true");
});
afterEach(() => vi.unstubAllEnvs());

describe("portable object storage", () => {
  it("preserves asset URLs and content across service instances, streams and deletes", async () => {
    const service = new ObjectStorageService();
    const path = await service.uploadFile(Buffer.from("migration media"), "asset.txt", "text/plain");
    expect(path).toBe("/storage/uploads/asset.txt");
    const restarted = new ObjectStorageService();
    const file = await restarted.getFile(path);
    const app = express();
    app.get("/asset", (_req, res) => { void restarted.downloadObject(file, res, 120); });
    const response = await request(app).get("/asset");
    expect(response.status).toBe(200);
    expect(response.text).toBe("migration media");
    expect(response.headers["content-length"]).toBe("15");
    expect(response.headers["cache-control"]).toBe("public, max-age=120");
    await restarted.deleteFile(path);
    await expect(restarted.getFile(path)).rejects.toBeInstanceOf(ObjectNotFoundError);
    expect(requests.some(r => r.startsWith("GET /migration-test/uploads/asset.txt"))).toBe(true);
  });

  it("returns an HTTP error if the object disappears after its metadata is read", async () => {
    const service = new ObjectStorageService();
    const path = await service.uploadFile(Buffer.from("file"), "raced.txt", "text/plain");
    const file = await service.getFile(path);
    objects.clear();
    const app = express();
    app.get("/asset", (_req, res) => { void service.downloadObject(file, res); });
    const response = await request(app).get("/asset");
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Error streaming file" });
  });

  it("maps missing objects to not-found and makes repeated deletes harmless", async () => {
    const service = new ObjectStorageService();
    await expect(service.getFile("/storage/uploads/missing")).rejects.toBeInstanceOf(ObjectNotFoundError);
    await expect(service.deleteFile("/storage/uploads/missing")).resolves.toBeUndefined();
  });

  it("does not hide permission errors as missing files", async () => {
    const service = new ObjectStorageService();
    await expect(service.getFile("/storage/uploads/denied")).rejects.toMatchObject({ $metadata: { httpStatusCode: 403 } });
    await expect(service.deleteFile("/storage/uploads/denied")).rejects.toMatchObject({ $metadata: { httpStatusCode: 403 } });
  });

  it("signs uploads without the Replit sidecar", async () => {
    const result = await new ObjectStorageService().getSignedUploadUrl("signed.png");
    const url = new URL(result.url);
    expect(url.origin).toBe(endpoint);
    expect(url.pathname).toBe("/migration-test/uploads/signed.png");
    expect(url.searchParams.get("X-Amz-Expires")).toBe("900");
    expect(url.searchParams.get("X-Amz-Signature")).toMatch(/^[a-f0-9]{64}$/);
    expect(result.objectPath).toBe("/storage/uploads/signed.png");
    expect(requests).toHaveLength(0);
  });

  it("fails closed on incomplete Railway configuration", () => {
    vi.stubEnv("S3_SECRET_ACCESS_KEY", "");
    const service = new ObjectStorageService();
    expect(service.isConfigured()).toBe(false);
    expect(() => service.getBucketName()).toThrow(/not configured/);
  });

  it("rejects unsupported providers and credential-bearing endpoints", () => {
    vi.stubEnv("OBJECT_STORAGE_PROVIDER", "unknown");
    expect(new ObjectStorageService().isConfigured()).toBe(false);
    vi.stubEnv("OBJECT_STORAGE_PROVIDER", "s3");
    vi.stubEnv("S3_ENDPOINT", "http://user:secret@localhost");
    expect(new ObjectStorageService().isConfigured()).toBe(false);
  });

  it("retains Replit as the default outside Railway", () => {
    vi.stubEnv("RAILWAY_PROJECT_ID", "");
    vi.stubEnv("OBJECT_STORAGE_PROVIDER", "");
    vi.stubEnv("S3_SECRET_ACCESS_KEY", "");
    expect(new ObjectStorageService().isConfigured()).toBe(true);
  });
});
