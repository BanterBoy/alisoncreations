import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { cwd } from 'node:process';
import type { ArcConfig } from './config.js';

export type LogLevel = 'info' | 'warn' | 'error';

function prefixFor(level: LogLevel): string {
  switch (level) {
    case 'info':
      return '[INFO]';
    case 'warn':
      return '[WARN]';
    case 'error':
      return '[ERROR]';
    default:
      return '[LOG]';
  }
}

export class Logger {
  private readonly logPath: string;
  private readonly outputDir: string;
  constructor(private readonly config: ArcConfig, private readonly dryRun: boolean) {
    this.logPath = path.isAbsolute(config.tracing.migrationLog)
      ? config.tracing.migrationLog
      : path.join(cwd(), config.tracing.migrationLog);
    this.outputDir = path.isAbsolute(config.tracing.outputDir)
      ? config.tracing.outputDir
      : path.join(cwd(), config.tracing.outputDir);
  }

  async prepare(): Promise<void> {
    await mkdir(path.dirname(this.logPath), { recursive: true });
    await mkdir(this.outputDir, { recursive: true });
    if (this.dryRun) {
      await this.writeLine('--- DRY RUN ---\n');
    }
  }

  async log(message: string, level: LogLevel = 'info'): Promise<void> {
    const lineParts = [new Date().toISOString()];
    if (this.dryRun) {
      lineParts.push('[DRY-RUN]');
    }
    lineParts.push(prefixFor(level));
    lineParts.push(message);
    const line = lineParts.join(' ');
    switch (level) {
      case 'warn':
        console.warn(line);
        break;
      case 'error':
        console.error(line);
        break;
      default:
        console.log(line);
        break;
    }
    await this.writeLine(line + '\n');
  }

  async writeFile(relativePath: string, contents: string): Promise<void> {
    const filePath = path.isAbsolute(relativePath) ? relativePath : path.join(this.outputDir, relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, contents, 'utf8');
  }

  private async writeLine(line: string): Promise<void> {
    try {
      await appendFile(this.logPath, line, 'utf8');
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        await writeFile(this.logPath, line, 'utf8');
      } else {
        throw err;
      }
    }
  }
}
