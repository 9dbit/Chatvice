import {build as viteBuild} from "vite";
import {build as esbuild} from "esbuild";
await viteBuild({configFile:"vite.mail-app.config.ts"});
// Bundle HTTP/application dependencies, leaving only the locked database/schema
// runtime dependencies external. The image must not need the main app's modules.
const external=["pg","drizzle-zod"];
await esbuild({entryPoints:["server/mail/app-server.ts"],platform:"node",bundle:true,format:"cjs",
  outfile:"dist/mail-app-server.cjs",define:{"process.env.NODE_ENV":'"production"'},
  external,minify:true,logLevel:"info"});
await esbuild({entryPoints:["scripts/mail-provision-user.ts"],platform:"node",bundle:true,format:"esm",
  outfile:"dist/mail-provision-user.mjs",external:["pg"],minify:true,logLevel:"info"});
