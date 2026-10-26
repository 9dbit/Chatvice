import {build as viteBuild} from "vite";
import {build as esbuild} from "esbuild";
import {readFile} from "node:fs/promises";
await viteBuild({configFile:"vite.mail-app.config.ts"});
const pkg=JSON.parse(await readFile("package.json","utf8"));
await esbuild({entryPoints:["server/mail/app-server.ts"],platform:"node",bundle:true,format:"cjs",
  outfile:"dist/mail-app-server.cjs",define:{"process.env.NODE_ENV":'"production"'},
  external:[...Object.keys(pkg.dependencies||{}),...Object.keys(pkg.devDependencies||{})],logLevel:"info"});
