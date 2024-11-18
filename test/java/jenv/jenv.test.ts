import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';
import { execSync } from 'child_process';
import * as fs from 'node:fs/promises';
import os from 'node:os';

describe('Jenv resource integration tests', () => {
  let plugin: PluginTester;

  beforeEach(() => {
    plugin = new PluginTester(path.resolve('./src/index.ts'));
  })

  it('Installs jenv and java with homebrew', { timeout: 500000 }, async () => {
    await plugin.fullTest([
      { type: 'homebrew' },
      {
        type: 'jenv',
        global: '17',
        add: ['17']
      }
    ], {
      skipUninstall: true,
      validateApply: async () => {
        expect(() => execSync('source ~/.zshrc; which jenv', { shell: 'zsh' })).to.not.throw;
        expect(() => execSync('source ~/.zshrc; jenv doctor', { shell: 'zsh' })).to.not.throw;

        expect(execSync('source ~/.zshrc; java --version', { shell: 'zsh' }).toString('utf-8').trim()).to.include('17')
        expect(execSync('source ~/.zshrc; jenv version', { shell: 'zsh' }).toString('utf-8').trim()).to.include('17')
      }
    });
  });

  it ('Can install additional java versions', { timeout: 500000 }, async () => {
    await plugin.fullTest([
      { type: 'homebrew' },
      {
        type: 'jenv',
        global: '21',
        add: ['17', '21']
      }
    ], {
      validateApply: () => {
        expect(() => execSync('source ~/.zshrc; which jenv', { shell: 'zsh' })).to.not.throw;
        expect(execSync('source ~/.zshrc; java --version', { shell: 'zsh' }).toString('utf-8').trim()).to.include('21')

        const jenvVersions = execSync('source ~/.zshrc; jenv versions', { shell: 'zsh' }).toString('utf-8').trim()
        expect(jenvVersions).to.include('21')
        expect(jenvVersions).to.include('17')
      },
      validateDestroy: () => {
        expect(() => execSync('source ~/.zshrc; which jenv', { shell: 'zsh' })).to.throw;
        expect(() => execSync('source ~/.zshrc; which java', { shell: 'zsh' })).to.throw;
      }
    })
  })

  afterEach(() => {
    plugin.kill();
  })
})
