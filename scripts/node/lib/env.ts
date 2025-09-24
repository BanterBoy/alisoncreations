import { config as loadDotEnv } from 'dotenv';
import path from 'node:path';
import { cwd } from 'node:process';

let loaded = false;

function ensureEnv() {
  if (!loaded) {
    const envPath = path.join(cwd(), '.env');
    loadDotEnv({ path: envPath, override: false });
    loaded = true;
  }
}

export function getEnv(key: string, fallback?: string): string | undefined {
  ensureEnv();
  const value = process.env[key];
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return fallback;
}

export function requireEnv(key: string): string {
  const value = getEnv(key);
  if (!value) {
    throw new Error('Missing required environment variable: ' + key);
  }
  return value;
}

export function isVerbose(): boolean {
  const raw = getEnv('ARC_VERBOSE', 'false');
  return raw?.toLowerCase() === 'true';
}
