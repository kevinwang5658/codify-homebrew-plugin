import { describe, expect, it } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';
import { execSync } from 'child_process';
import os from 'node:os';
import { TestUtils } from '../test-utils.js';

describe('Alias resource integration tests', async () => {
  const pluginPath = path.resolve('./src/index.ts');

  it('Can add an alias to shell rc', { timeout: 300000 }, async () => {
    await PluginTester.fullTest(pluginPath, [
      {
        type: 'alias',
        alias: 'my-alias',
        value: 'ls -l'
      }
    ], {
      validateApply: async () => {
        const aliasOutput = execSync(TestUtils.getShellCommand('alias')).toString('utf-8');
        expect(aliasOutput).to.include('my-alias');
        expect(aliasOutput).to.include('ls -l');

        // Alias expansion only happens in an interactive shell.
        expect(execSync(TestUtils.getInteractiveCommand('my-alias -a')).toString('utf-8')).to.include('src')
      },
      testModify: {
        modifiedConfigs: [{
          type: 'alias',
          alias: 'my-alias',
          value: 'pwd'
        }],
        validateModify: () => {
          const aliasOutput = execSync(TestUtils.getShellCommand('alias')).toString('utf-8');
          expect(aliasOutput).to.include('my-alias');
          expect(aliasOutput).to.include('pwd');

          const homeDir = os.homedir();
          expect(execSync(TestUtils.getInteractiveCommand('my-alias'), { cwd: homeDir }).toString('utf-8').trim()).to.eq(homeDir)
        }
      },
      validateDestroy: () => {
        const aliasOutput = execSync(TestUtils.getShellCommand('alias')).toString('utf-8');
        expect(aliasOutput).to.not.include('my-alias');
        expect(() => execSync(TestUtils.getInteractiveCommand('my-alias -a')).toString('utf-8')).to.throw;
      },
    });
  })

  it('Validates against invalid alias', { timeout: 300000 }, async () => {
    expect(async () => PluginTester.fullTest(pluginPath, [
      {
        type: 'alias',
        alias: 'test$$$',
        value: 'ls'
      }
    ])).rejects.toThrowError();
  })
})
