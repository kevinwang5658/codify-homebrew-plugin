import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';
import { execSync } from 'child_process';
import fs from 'node:fs/promises';
import os from 'node:os';

describe('Alias resource integration tests', async () => {
  let plugin: PluginTester;

  beforeEach(() => {
    plugin = new PluginTester(path.resolve('./src/index.ts'));
  })

  it('Can add an alias to zshrc', { timeout: 300000 }, async () => {
    await plugin.fullTest([
      {
        type: 'alias',
        alias: 'my-alias',
        value: 'ls -l'
      }
    ], {
      validateApply: async () => {
        expect(execSync('source ~/.zshrc; alias').toString('utf-8')).to.include('my-alias=\'ls -l\'');
        expect(execSync('source ~/.zshrc; which my-alias', { shell: 'zsh' }).toString('utf-8').trim()).to.eq('my-alias: aliased to ls -l')

        // Alias expansion only happens in an interactive shell. Run zsh with -i option for interactive mode.
        expect(execSync('zsh -i -c "my-alias -a"').toString('utf-8')).to.include('src')
      },
      testModify: {
        modifiedConfigs: [{
          type: 'alias',
          alias: 'my-alias',
          value: 'pwd'
        }],
        validateModify: () => {
          expect(execSync('source ~/.zshrc; alias').toString('utf-8')).to.include('my-alias=\'pwd\'');
          expect(execSync('source ~/.zshrc; which my-alias', { shell: 'zsh' }).toString('utf-8').trim()).to.eq('my-alias: aliased to pwd')

          const homeDir = os.homedir();
          expect(execSync('zsh -i -c "my-alias"', { cwd: homeDir }).toString('utf-8').trim()).to.eq(homeDir)
        }
      },
      validateDestroy: () => {
        expect(execSync('source ~/.zshrc; alias').toString('utf-8')).to.not.include('my-alias=\'ls -l\'');
        expect(() => execSync('zsh -i -c "my-alias -a"').toString('utf-8')).to.throw;
      },
    });
  })

  it('Validates against invalid alias', { timeout: 300000 }, async () => {
    expect(async () => plugin.fullTest([
      {
        type: 'alias',
        alias: 'test$$$',
        value: 'ls'
      }
    ])).rejects.toThrowError();
  })

  afterEach(() => {
    plugin.kill();
  })
})
