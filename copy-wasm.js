import { copyFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Create build/node_modules/sql.js/dist directory
const targetDir = join(__dirname, 'build', 'node_modules', 'sql.js', 'dist');
mkdirSync(targetDir, { recursive: true });

// Copy wasm and js files
const files = ['sql-wasm.wasm', 'sql-wasm.js'];

for (const file of files) {
  const sourceFile = join(__dirname, 'node_modules', 'sql.js', 'dist', file);
  const targetFile = join(targetDir, file);

  try {
    copyFileSync(sourceFile, targetFile);
    console.log(`Successfully copied ${file} to build directory`);
  } catch (error) {
    console.error(`Failed to copy ${file}:`, error);
    process.exit(1);
  }
}
