const esbuild = require('esbuild');
const path = require('path');

const watch = process.argv.includes('--watch');

/** @type {esbuild.BuildOptions} */
const config = {
  entryPoints: [path.join(__dirname, 'src', 'extension.ts')],
  bundle: true,
  outfile: path.join(__dirname, 'dist', 'extension.js'),
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: true,
  minify: false,
};

async function main() {
  if (watch) {
    const ctx = await esbuild.context(config);
    await ctx.watch();
    console.log('[shmakk-vscode] watching for changes...');
  } else {
    await esbuild.build(config);
    console.log('[shmakk-vscode] build complete');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
