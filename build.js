import { exec } from 'child_process';
import { chmodSync } from 'fs';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function build() {
  try {
    // Run TypeScript compiler
    console.log('Running TypeScript compiler...');
    await execAsync('"C:\\Program Files\\nodejs\\node.exe" ./node_modules/typescript/bin/tsc');

    // Set permissions on build/server.js
    console.log('Setting permissions...');
    chmodSync('build/server.js', '755');

    console.log('Build completed successfully!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
