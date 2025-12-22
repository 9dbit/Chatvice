import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile, writeFile, access } from "fs/promises";
import { constants } from "fs";

// Check if dist is already built (for production runtime skip)
async function isAlreadyBuilt(): Promise<boolean> {
  try {
    await access("dist/public/index.html", constants.F_OK);
    await access("dist/index.cjs", constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "@google-cloud/storage",
  "@neondatabase/serverless",
  "axios",
  "bcryptjs",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "resend",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  // Skip rebuild if already built (prevents runtime rebuild from wiping assets in deployment)
  // In development, we use `npm run dev` which doesn't call this script
  // So it's safe to skip if build already exists
  if (await isAlreadyBuilt()) {
    console.log("Build already exists, skipping rebuild...");
    console.log("To force rebuild, delete the dist folder first: rm -rf dist");
    return;
  }

  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });

  // Create ESM wrapper for package.json "type": "module" compatibility
  const esmWrapper = `import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('./index.cjs');
`;
  await writeFile("dist/index.js", esmWrapper);
  console.log("Created ESM wrapper: dist/index.js");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
