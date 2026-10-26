import { build as viteBuild } from "vite";
import { build as esbuild } from "esbuild";
import { rm, readFile } from "node:fs/promises";

const bundled=new Set([
  "express","pg","drizzle-orm","zod","multer","openai",
  "cookie-parser","date-fns","nanoid"
]);
async function main(){
  await rm("dist/mail-qa",{recursive:true,force:true});
  console.log("[Mail QA] Building standalone no-tracker frontend");
  await viteBuild({configFile:"vite.mail-qa.config.ts"});
  const pkg=JSON.parse(await readFile("package.json","utf8"));
  const deps=[...Object.keys(pkg.dependencies||{}),...Object.keys(pkg.devDependencies||{})];
  await esbuild({
    entryPoints:["server/mail/qa-server.ts"],
    platform:"node",bundle:true,format:"cjs",
    outfile:"dist/mail-qa-server.cjs",
    define:{"process.env.NODE_ENV":'"production"'},
    external:deps.filter(x=>!bundled.has(x)),
    minify:true,logLevel:"info"
  });
  console.log("[Mail QA] Standalone frontend and backend build complete");
}
main().catch(err=>{console.error(err);process.exitCode=1;});
