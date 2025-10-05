const scripts = [
  './scan-assets.ts',
  './mute-videos.ts',
  './upload-assets.ts',
  './create-products.ts',
  './build-collections.ts',
  './sync-menus.ts'
];

async function run(): Promise<void> {
  for (const script of scripts) {
    console.log('Running ' + script + '...');
    await import(script);
  }
  console.log('All sync steps completed.');
}

run().catch((error) => {
  console.error('sync-all failed:', error);
  process.exitCode = 1;
});
