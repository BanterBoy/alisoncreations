export interface CliOptions {
  dryRun: boolean;
  force?: boolean;
}

export function parseCliFlags(argv: string[] = process.argv.slice(2)): CliOptions {
  const options: CliOptions = { dryRun: false };
  for (const arg of argv) {
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--force') {
      options.force = true;
    }
  }
  return options;
}
