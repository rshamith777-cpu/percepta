import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  serverExternalPackages: ["pdfjs-dist", "@napi-rs/canvas"],
  // pdfjs loads its worker and canvas bindings dynamically, so include them
  // explicitly for standalone output.
  outputFileTracingIncludes: {
    "/api/manuals/upload": [
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
      "./node_modules/pdfjs-dist/build/pdf.worker.mjs",
      "./node_modules/pdfjs-dist/cmaps/**/*",
      "./node_modules/pdfjs-dist/standard_fonts/**/*",
      "./node_modules/pdfjs-dist/node_modules/@napi-rs/canvas/**/*",
      "./node_modules/pdfjs-dist/node_modules/@napi-rs/canvas-*/**/*",
    ],
  },
  // Reduce build workers in constrained environments; does not affect runtime behavior.
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
  // Use a build-scoped tsconfig that excludes test files to reduce Next.js' bundled
  // type-check memory on constrained machines. TypeScript checks remain enabled;
  // full tsconfig (including tests) is still validated via `tsc --noEmit` and Vitest.
  typescript: {
    tsconfigPath: "./tsconfig.build.json",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
