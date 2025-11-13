import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PLACEHOLDER = '__BUILD_TIMESTAMP__';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '..', 'dist');

const walkDirectory = async (directory) => {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return walkDirectory(fullPath);
      }
      if (entry.isFile()) {
        return [fullPath];
      }
      return [];
    })
  );
  return files.flat();
};

const replacePlaceholderInFile = async (filePath, replacement) => {
  const original = await fs.readFile(filePath, 'utf8');
  if (!original.includes(PLACEHOLDER)) {
    return false;
  }

  const updated = original.split(PLACEHOLDER).join(replacement);
  await fs.writeFile(filePath, updated, 'utf8');
  return true;
};

const main = async () => {
  try {
    await fs.access(distDir);
  } catch (error) {
    console.warn(`Distribution directory not found at "${distDir}". Skipping build timestamp injection.`);
    return;
  }

  const timestamp = new Date().toISOString();
  const files = await walkDirectory(distDir);

  const results = await Promise.all(
    files.map(async (filePath) => replacePlaceholderInFile(filePath, timestamp))
  );

  const replacements = results.filter(Boolean).length;

  if (replacements === 0) {
    console.warn('No build timestamp placeholders were replaced.');
  } else {
    console.log(`Injected build timestamp into ${replacements} file${replacements === 1 ? '' : 's'}.`);
  }
};

main().catch((error) => {
  console.error('Failed to inject build timestamp.', error);
  process.exitCode = 1;
});
