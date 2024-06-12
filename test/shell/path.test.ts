import { afterEach, beforeEach, describe, it } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';

describe('Path resource integration tests', async () => {
  let plugin: PluginTester;
  let tempDir: string;

  beforeEach(() => {
    plugin = new PluginTester(path.resolve('./src/index.ts'));
    tempDir = os.tmpdir();
  })

  it('Can add a path to zshrc', { timeout: 300000 }, async () => {
    const tempDir = fs.mkdtempSync('prefix');
    await plugin.fullTest([
      {
        type: 'path',
        path: tempDir,
      }
    ]);
  })

  it('Can add multiple paths to zsh rc', { timeout: 300000 }, async () => {
    const tempDir1 = fs.mkdtempSync(tempDir + '/');
    const tempDir2 = fs.mkdtempSync(tempDir + '/');

    await plugin.fullTest([
      {
        type: 'path',
        paths: [tempDir1, tempDir2],
      }
    ]);
  })

  it('Can prepend multiple paths to zsh rc', { timeout: 300000 }, async () => {
    const tempDir1 = fs.mkdtempSync(tempDir + '/');
    const tempDir2 = fs.mkdtempSync(tempDir + '/');

    await plugin.fullTest([
      {
        type: 'path',
        paths: [tempDir1, tempDir2],
        prepend: true,
      }
    ]);
  })

  afterEach(() => {
    plugin.kill();
  })
})
