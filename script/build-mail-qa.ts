import { build as viteBuild } from "vite";
import { build as esbuild } from "esbuild";
import { rm } from "node:fs/promises";
async function main(){
  await rm("dist/mail-qa",{recursive:true,force:true});
  console.log("[Mail QA] Building standalone no-tracker frontend");
  await viteBuild({configFile:"vite.mail-qa.config.ts"});
  await esbuild({
    entryPoints:["server/mail/qa-server.ts"],
    platform:"node",bundle:true,format:"cjs",
    outfile:"dist/mail-qa-server.cjs",
    define:{"process.env.NODE_ENV":'"production"'},
    // Keep the runtime dependency boundary explicit; unrelated main-app package
    // changes must never silently add an uninstalled external module to QA.
    external:["pg","drizzle-zod"],
    minify:true,logLevel:"info"
  });
  console.log("[Mail QA] Standalone frontend and backend build complete");
}
main().catch(err=>{console.error(err);process.exitCode=1;});
