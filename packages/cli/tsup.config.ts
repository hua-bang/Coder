import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  dts: false,
  clean: true,
  splitting: false,
  sourcemap: false,
  banner: { js: '#!/usr/bin/env node' },
  bundle: true,
  minify: true,
  treeshake: true,
  platform: 'node',
  // 确保所有依赖都打包进来，包括 workspace 依赖
  external: [],
  noExternal: ['pulse-coder-engine'], // 强制包含这个 workspace 依赖
  outExtension: () => ({ js: '.cjs' })
});