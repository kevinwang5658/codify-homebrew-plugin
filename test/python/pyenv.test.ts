import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';
import { execSync } from 'child_process';

describe('Pyenv resource integration tests', () => {
  let plugin: PluginTester;

  beforeEach(() => {
    plugin = new PluginTester(path.resolve('./src/index.ts'));
  })

  it('Installs pyenv and python (this installs on a clean system without readline, openSSL, etc.)', { timeout: 500000 }, async () => {
    await plugin.fullTest([
      {
        type: 'pyenv',
        pythonVersions: ['3.11']
      }
    ], {
      skipUninstall: true,
      validateApply: () => {
        expect(() => execSync('source ~/.zshrc; which pyenv', { shell: 'zsh' })).to.not.throw();
      }
    });
  });

  it ('Can install additional python versions. (this installs after openSSL and readline have been installed)', { timeout: 700000 }, async () => {
    await plugin.fullTest([
      {
        type: 'homebrew',
        formulae: ['readline', 'openssl@3']
      },
      {
        type: 'pyenv',
        pythonVersions: ['3.11', '3.12', '2.7'],
        global: '3.12',
      }
    ], {
      validateApply: () => {
        expect(execSync('source ~/.zshrc; python --version', { shell: 'zsh' }).toString('utf-8')).to.include('3.12');

        const versions = execSync('source ~/.zshrc; pyenv versions', { shell: 'zsh' }).toString('utf-8')
        expect(versions).to.include('3.12')
        expect(versions).to.include('2.7')
        expect(versions).to.include('3.11')
      },
      validateDestroy: () => {
        expect(() => execSync('source ~/.zshrc; which pyenv', { shell: 'zsh' })).to.throw();
        expect(() => execSync('source ~/.zshrc; which python', { shell: 'zsh' })).to.throw();
      }
    })
  })

  afterEach(() => {
    plugin.kill();
  })
})
