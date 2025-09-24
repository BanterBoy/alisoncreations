import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import fg from 'fast-glob';
import { parseCliFlags } from './lib/cli.js';
import { loadConfig } from './lib/config.js';
import { Logger } from './lib/logger.js';

interface VideoRecord {
  source: string;
  output: string;
  status: 'muted' | 'pending-muted-render' | 'skipped';
}

async function collectVideos(root: string): Promise<string[]> {
  const absolute = path.resolve(root);
  const matches = await fg(['**/*.{mp4,mov,webm}'], { cwd: absolute, caseSensitiveMatch: false });
  return matches.map((relative) => path.join(absolute, relative));
}

function ffmpegAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = spawn('ffmpeg', ['-version']);
    let resolved = false;
    probe.on('error', () => {
      if (!resolved) {
        resolved = true;
        resolve(false);
      }
    });
    probe.on('exit', (code) => {
      if (!resolved) {
        resolved = true;
        resolve(code === 0);
      }
    });
  });
}

function runFfmpeg(input: string, output: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = ['-y', '-i', input, '-c', 'copy', '-an', output];
    const proc = spawn('ffmpeg', args, { stdio: 'inherit' });
    proc.on('error', reject);
    proc.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error('ffmpeg exited with code ' + code));
      }
    });
  });
}

async function main(): Promise<void> {
  const options = parseCliFlags();
  const config = await loadConfig();
  const logger = new Logger(config, options.dryRun);
  await logger.prepare();

  if (!config.mediaRoots.videos) {
    await logger.log('No video root configured; nothing to mute');
    return;
  }

  const videos = await collectVideos(config.mediaRoots.videos);
  await logger.log('Found ' + videos.length + ' videos to inspect');

  const hasFfmpeg = await ffmpegAvailable();
  if (!hasFfmpeg) {
    await logger.log('ffmpeg not detected; marking videos for muted rendering only', 'warn');
  }

  const mutedRecords: VideoRecord[] = [];
  for (const videoPath of videos) {
    const relative = path.relative(config.mediaRoots.videos, videoPath);
    const outputRoot = path.resolve(config.mediaRoots.mutedOutput);
    const outputPath = path.join(outputRoot, relative);
    await mkdir(path.dirname(outputPath), { recursive: true });

    if (!hasFfmpeg) {
      mutedRecords.push({ source: videoPath, output: outputPath, status: 'pending-muted-render' });
      continue;
    }

    if (options.dryRun) {
      await logger.log('DRY-RUN would mute video ' + relative + ' -> ' + outputPath);
      mutedRecords.push({ source: videoPath, output: outputPath, status: 'skipped' });
      continue;
    }

    await logger.log('Muting video ' + relative);
    try {
      await runFfmpeg(videoPath, outputPath);
      mutedRecords.push({ source: videoPath, output: outputPath, status: 'muted' });
    } catch (error) {
      await logger.log('Failed to mute ' + relative + ': ' + (error as Error).message, 'error');
      mutedRecords.push({ source: videoPath, output: outputPath, status: 'pending-muted-render' });
    }
  }

  await logger.writeFile('videos.json', JSON.stringify(mutedRecords, null, 2));
  await logger.log('Video mute summary written to videos.json');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
