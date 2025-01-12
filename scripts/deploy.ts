import * as cp from 'node:child_process';
import path from 'node:path';
import * as url from 'node:url';

// This should run the build
cp.spawnSync('source ~/.zshrc; npm run build', { shell: 'zsh', stdio: 'inherit' });

const version = process.env.npm_package_version;
if (!version) {
  throw new Error('Unable to find version');
}

const name = process.env.npm_package_name;
if (!name) {
  throw new Error('Unable to find package name');
}

console.log(`Uploading plugin ${name}, version ${version} to cloudflare!`)

const outputFilePath = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..', 'dist', 'index.js')
cp.spawnSync(`source ~/.zshrc; npx wrangler r2 object put plugins/${name}/${version}/index.js --file=${outputFilePath}`, { shell: 'zsh', stdio: 'inherit' });
