import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const file of ['index.html', 'bookmarklets.html', 'manifest.webmanifest', 'sw.js', '.nojekyll']) {
  await cp(path.join(root, file), path.join(dist, file));
}
await cp(path.join(root, 'src'), path.join(dist, 'src'), { recursive: true });
await cp(path.join(root, 'assets'), path.join(dist, 'assets'), { recursive: true });

const cssFiles = ['src/styles/tokens.css', 'src/styles/app.css', 'src/styles/responsive.css'];
const jsFiles = [
  'src/version.js',
  'src/domain/snippetText.js',
  'src/domain/sharePayload.js',
  'src/domain/launchPolicy.js',
  'src/domain/trashPolicy.js',
  'src/domain/libraryItem.js',
  'src/domain/keyboardShortcuts.js',
  'src/domain/postArchive.js',
  'src/cloud/cloudModels.js',
  'src/storage/db.js',
  'src/cloud/syncQueue.js',
  'src/storage/snippetRepository.js',
  'src/storage/tagRepository.js',
  'src/storage/preferencesRepository.js',
  'src/cloud/cacheOwner.js',
  'src/cloud/cloudSync.js',
  'src/cloud/supabaseClient.js',
  'src/capture/captureParams.js',
  'src/capture/bookmarklets.js',
  'src/editor/markdownHelpers.js',
  'src/editor/selectionFormatting.js',
  'src/editor/editorNavigation.js',
  'src/editor/todoReorder.js',
  'src/editor/editorState.js',
  'src/editor/markdownEditor.js',
  'src/ui/toast.js',
  'src/ui/sheet.js',
  'src/ui/tagSheet.js',
  'src/ui/appearanceSheet.js',
  'src/ui/shortcutSheet.js',
  'src/ui/moreMenu.js',
  'src/ui/webCaptureSheet.js',
  'src/ui/batchIcons.js',
  'src/ui/editorFormatMenu.js',
  'src/ui/editorView.js',
  'src/ui/libraryView.js',
  'src/ui/trashView.js',
  'src/auth/authView.js',
  'src/app.js',
  'src/main.js'
];

const css = (await Promise.all(cssFiles.map(file => readFile(path.join(root, file), 'utf8')))).join('\n');
const sourceParts = await Promise.all(jsFiles.map(async file => {
  let code = await readFile(path.join(root, file), 'utf8');
  code = code.replace(/import\s+[\s\S]*?\s+from\s+['"][^'"]+['"];?\s*/g, '');
  code = code.replace(/import\s+['"][^'"]+['"];?\s*/g, '');
  code = code.replace(/\bexport\s+/g, '');
  return `\n// ---- ${file} ----\n${code}`;
}));

const standalone = `<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="color-scheme" content="light dark" />
<meta name="theme-color" content="#f8f8f6" />
<title>Snippets</title>
<script>(()=>{const saved=localStorage.getItem('snippets:themeMode')||'system';const dark=saved==='dark'||(saved==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=dark?'dark':'light';document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark?'#101010':'#f8f8f6')})()</script>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Literata:opsz,wght@7..72,400;7..72,600&family=Open+Sans:wght@400;600&family=Roboto+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
<style>${css}</style>
</head>
<body><div id="app"></div><script type="module">
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
${sourceParts.join('\n')}
</script></body>
</html>`;

await writeFile(path.join(dist, 'Snippets-standalone.html'), standalone);
console.log('Built dist/ with production modular site and Snippets-standalone.html');
