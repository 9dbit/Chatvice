import path from "node:path";

/** Keep the source deployment's paths; Railway can mount persistent media separately. */
export function mediaDirectory(kind: "uploads" | "exports", env: NodeJS.ProcessEnv = process.env) {
  return path.resolve(env.MEDIA_ROOT || process.cwd(), kind);
}
