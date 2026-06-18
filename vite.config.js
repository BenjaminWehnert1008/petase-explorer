import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// IMPORTANT: "base" must match your GitHub repo name exactly, with leading
// and trailing slashes, e.g. for https://github.com/yourname/petase-explorer
// the deployed URL is https://yourname.github.io/petase-explorer/ so base
// must be "/petase-explorer/". If you deploy to a *user/org* page repo
// (named yourname.github.io), set base back to "/" instead.
export default defineConfig({
  plugins: [react()],
  base: "/petase-explorer/",
  build: {
    outDir: "dist",
  },
});
