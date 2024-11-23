import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import { ParameterOperation, ResourceOperation } from 'codify-schemas';
import { execSync } from 'child_process';

describe('Path resource integration tests', async () => {
  let plugin: PluginTester;

  beforeEach(() => {
    plugin = new PluginTester(path.resolve('./src/index.ts'));
  })

  it('Can add a path to zshrc', { timeout: 300000 }, async () => {
    const tempDir1 = await fs.mkdtemp(os.tmpdir() + '/');
    await plugin.fullTest([
      {
        type: 'path',
        path: tempDir1,
      }
    ], {
      validateApply: () => {
        expect(execSync('source ~/.zshrc; echo $PATH').toString('utf-8').trim()).to.include(tempDir1);
      },
      validateDestroy: () => {
        expect(execSync('source ~/.zshrc; echo $PATH').toString('utf-8').trim()).to.not.include(tempDir1);
      }
    });
  })

  it('Can add multiple paths to zsh rc', { timeout: 300000 }, async () => {
    const tempDir1 = await fs.mkdtemp(os.tmpdir() + '/');
    const tempDir2 = await fs.mkdtemp(os.tmpdir() + '/');

    await plugin.fullTest([
      {
        type: 'path',
        paths: [tempDir1, tempDir2],
      }
    ], {
      validateApply: () => {
        const path = execSync('source ~/.zshrc; echo $PATH').toString('utf-8').trim()
        expect(path).to.include(tempDir1);
        expect(path).to.include(tempDir2);
      },
      validateDestroy: () => {
        const path = execSync('source ~/.zshrc; echo $PATH').toString('utf-8').trim()
        expect(path).to.not.include(tempDir1);
        expect(path).to.not.include(tempDir2);
      }
    });
  })

  it('Can prepend multiple paths to zsh rc', { timeout: 300000 }, async () => {
    const tempDir1 = await fs.mkdtemp(os.tmpdir() + '/');
    const tempDir2 = await fs.mkdtemp(os.tmpdir() + '/');

    await plugin.fullTest([
      {
        type: 'path',
        paths: [tempDir1, tempDir2],
        prepend: true,
      }
    ], {
      validateApply: () => {
        const path = execSync('source ~/.zshrc; echo $PATH').toString('utf-8').trim()
        expect(path).to.include(tempDir1);
        expect(path).to.include(tempDir2);
      },
      validateDestroy: () => {
        const path = execSync('source ~/.zshrc; echo $PATH').toString('utf-8').trim()
        expect(path).to.not.include(tempDir1);
        expect(path).to.not.include(tempDir2);
      }
    });
  })

  it('Can modify an existing path resource to add additional paths to zsh rc', { timeout: 300000 }, async () => {
    const tempDir1 = await fs.mkdtemp(os.tmpdir() + '/');
    const tempDir2 = await fs.mkdtemp(os.tmpdir() + '/');
    const tempDir3 = await fs.mkdtemp(os.tmpdir() + '/');
    const tempDir4 = await fs.mkdtemp(os.tmpdir() + '/');

    await plugin.fullTest([
      {
        type: 'path',
        paths: [tempDir1, tempDir2],
        prepend: true,
      }
    ], {
      validateApply: () => {
        const path = execSync('source ~/.zshrc; echo $PATH').toString('utf-8').trim()
        expect(path).to.include(tempDir1);
        expect(path).to.include(tempDir2);
      },
      testModify: {
        modifiedConfigs: [{
          type: 'path',
          paths: [tempDir1, tempDir2, tempDir3, tempDir4],
          prepend: true,
        }],
        validateModify: (plans) => {
          expect(plans[0]).toMatchObject({
            operation: ResourceOperation.MODIFY,
            parameters: expect.arrayContaining([{
              name: 'paths',
              previousValue: expect.arrayContaining([tempDir1, tempDir2]),
              newValue: expect.arrayContaining([tempDir1, tempDir2, tempDir2, tempDir3]),
              operation: ParameterOperation.MODIFY,
            }])
          })

          const path = execSync('source ~/.zshrc; echo $PATH').toString('utf-8').trim()
          expect(path).to.include(tempDir1);
          expect(path).to.include(tempDir2);
          expect(path).to.include(tempDir3);
          expect(path).to.include(tempDir4);
        }
      },
      validateDestroy: () => {
        const path = execSync('source ~/.zshrc; echo $PATH').toString('utf-8').trim()
        console.log(path);
        expect(path).to.not.include(tempDir1);
        expect(path).to.not.include(tempDir2);
        expect(path).to.not.include(tempDir3);
        expect(path).to.not.include(tempDir4);
      }
    });
  })

  it('Supports tildy for home', { timeout: 300000 }, async () => {
    await fs.mkdir(path.resolve(os.homedir(), 'temp', 'dir'), { recursive: true });
    await plugin.fullTest([
      {
        type: 'path',
        path: '~/temp/dir',
      }
    ]);
  })

  afterEach(() => {
    plugin.kill();
  })
})
