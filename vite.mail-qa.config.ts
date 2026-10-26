import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
 plugins:[react()],
 root:path.resolve(import.meta.dirname,"client"),
 resolve:{alias:{
  "@":path.resolve(import.meta.dirname,"client/src"),
  "@shared":path.resolve(import.meta.dirname,"shared"),
  "@assets":path.resolve(import.meta.dirname,"attached_assets")
 }},
 build:{
  outDir:path.resolve(import.meta.dirname,"dist/mail-qa"),
  emptyOutDir:true,
  rollupOptions:{input:path.resolve(import.meta.dirname,"client/mail-qa.html")}
 }
});