/**
 * Global setup for QA tests - loads .env.local environment variables
 */
import fs from 'fs';
import path from 'path';

export default async function globalSetup() {
  const envPath = path.resolve(__dirname, '../../.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const value = trimmed.slice(eqIdx + 1).trim();
          process.env[key] = value;
        }
      }
    }
    console.log('[Setup] Loaded .env.local');
  } else {
    console.log('[Setup] Warning: .env.local not found');
  }
}
