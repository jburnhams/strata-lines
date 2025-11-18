#!/usr/bin/env node
/**
 * Verifies that the JPEG encoder WASM file is properly included
 * in both the public directory (pre-build) and dist directory (post-build)
 */

import { existsSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const WASM_FILENAME = 'jpeg_encoder_bg.wasm';
const PUBLIC_WASM_PATH = join(projectRoot, 'public', 'assets', WASM_FILENAME);
const DIST_WASM_PATH = join(projectRoot, 'dist', 'assets', WASM_FILENAME);

console.log('🔍 Verifying WASM file inclusion...\n');

let hasErrors = false;

// Check public directory (pre-build)
if (existsSync(PUBLIC_WASM_PATH)) {
  const stats = statSync(PUBLIC_WASM_PATH);
  console.log(`✅ WASM file found in public/assets/`);
  console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
} else {
  console.error(`❌ WASM file NOT found in public/assets/`);
  console.error(`   Expected: ${PUBLIC_WASM_PATH}`);
  console.error(`   Run: npm run copy-wasm`);
  hasErrors = true;
}

// Check dist directory (post-build) if it exists
if (existsSync(join(projectRoot, 'dist'))) {
  if (existsSync(DIST_WASM_PATH)) {
    const stats = statSync(DIST_WASM_PATH);
    console.log(`✅ WASM file found in dist/assets/`);
    console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
  } else {
    console.error(`❌ WASM file NOT found in dist/assets/`);
    console.error(`   Expected: ${DIST_WASM_PATH}`);
    console.error(`   The build may not have run yet, or Vite didn't copy the file from public/`);
    hasErrors = true;
  }
} else {
  console.log(`ℹ️  dist/ directory doesn't exist yet (build hasn't run)`);
}

console.log('');

if (hasErrors) {
  console.error('❌ WASM file verification failed');
  process.exit(1);
} else {
  console.log('✅ WASM file verification passed');
  process.exit(0);
}
