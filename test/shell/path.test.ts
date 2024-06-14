import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';
import { ParameterOperation, ResourceOperation } from 'codify-schemas';

describe('Path resource integration tests', async () => {
  let plugin: PluginTester;
  let tempDir: string;

  beforeEach(() => {
    plugin = new PluginTester(path.resolve('./src/index.ts'));
    tempDir = os.tmpdir();
  })

  it('Can add a path to zshrc', { timeout: 300000 }, async () => {
    const tempDir1 = fs.mkdtempSync(tempDir + '/');
    await plugin.fullTest([
      {
        type: 'path',
        path: tempDir1,
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

  it('Can modify an existing path resource to add additional paths to zsh rc', { timeout: 300000 }, async () => {
    const tempDir1 = fs.mkdtempSync(tempDir + '/');
    const tempDir2 = fs.mkdtempSync(tempDir + '/');

    await plugin.fullTest([
      {
        type: 'path',
        paths: [tempDir1, tempDir2],
        prepend: true,
      }
    ]);

    const tempDir3 = fs.mkdtempSync(tempDir + '/');
    const tempDir4 = fs.mkdtempSync(tempDir + '/');

    await plugin.fullTest([
      {
        type: 'path',
        paths: [tempDir1, tempDir2, tempDir3, tempDir4],
        prepend: true,
      }
    ], (plans) => {
      expect(plans[0]).toMatchObject({
        operation: ResourceOperation.MODIFY,
        parameters: expect.arrayContaining([{
          name: 'paths',
          previousValue: expect.arrayContaining([tempDir1, tempDir2]),
          newValue: expect.arrayContaining([tempDir1, tempDir2, tempDir2, tempDir3]),
          operation: ParameterOperation.MODIFY,
        }])
      })
    });
  })

  it('Shell variables are escaped', { timeout: 300000 }, async () => {
    const tempDir = fs.mkdtempSync('$HOME/');
    await plugin.fullTest([
      {
        type: 'path',
        path: tempDir,
      }
    ]);
  })


  afterEach(() => {
    plugin.kill();
  })
})
