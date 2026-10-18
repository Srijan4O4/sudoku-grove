import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
const preparePhaser = (code, id) => id.replaceAll('\\', '/').endsWith('/core/VisibilityHandler.js')
  ? 'module.exports = function () {};'
  : code.replace(/typeof (CANVAS_RENDERER|WEBGL_RENDERER|FEATURE_SOUND|FEATURE_VIDEO|EXPERIMENTAL|PLUGIN_3D|PLUGIN_CAMERA3D|WEBGL_DEBUG)/g, (_, flag) => flag === 'CANVAS_RENDERER' ? 'true' : 'false');
export default defineConfig({
  base: './',
  define: { global: 'globalThis' },
  resolve: { alias: [{ find: /^phaser$/, replacement: fileURLToPath(new URL('./node_modules/phaser/src/phaser.js', import.meta.url)) }] },
  // Playables requires exclusive ownership of lifecycle events. Phaser 3.90
  // unconditionally installs a document visibility handler, so replace that
  // one internal module in both dev and release builds. SDK callbacks control
  // the loop in main.js. No files inside node_modules are modified.
  plugins: [{ name: 'playables-lifecycle', enforce: 'pre', transform(code, id) {
    if (id.replaceAll('\\', '/').includes('/phaser/src/')) return { code: preparePhaser(code, id), map: null };
  } }],
  optimizeDeps: { esbuildOptions: { plugins: [{ name: 'playables-lifecycle-dev', setup(build) {
    build.onLoad({ filter: /[\\/]phaser[\\/]src[\\/].*\.js$/ }, async args => ({ contents: preparePhaser(await readFile(args.path, 'utf8'), args.path), loader: 'js' }));
  } }] } },
  build: { target: 'es2020', chunkSizeWarningLimit: 1600 }
});
