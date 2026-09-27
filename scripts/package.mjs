import { mkdir, readFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const { version } = JSON.parse(await readFile('package.json', 'utf8'));
await mkdir('artifacts', { recursive: true });
const archive = `better-government-${version}.zip`;
await rm(`artifacts/${archive}`, { force: true });
execFileSync('zip', ['-r', '-X', `../artifacts/${archive}`, '.'], {
  cwd: 'dist',
  stdio: 'inherit',
});
console.log(`artifacts/${archive}`);
