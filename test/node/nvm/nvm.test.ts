import { describe, it, expect, beforeEach } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import path from 'node:path';
import { execSync } from 'child_process';

// Example test suite
describe('nvm tests', () => {
  let plugin: PluginTester;

  beforeEach(() => {
    plugin = new PluginTester(path.resolve('./src/index.ts'));
  })

  it('Can install nvm and node',  { timeout: 500000 }, async () => {
    await plugin.fullTest([
      {
        type: 'nvm',
        global: '20',
        nodeVersions: ['20', '18']
      }
    ], {
      validateApply: () => {
        expect(() => execSync('source ~/.zshrc; which nvm', { shell: 'zsh' })).to.not.throw();
        expect(execSync('source ~/.zshrc; node --version', { shell: 'zsh' }).toString('utf-8').trim()).to.include('20');

        const installedVersions = execSync('source ~/.zshrc; nvm list', { shell: 'zsh' }).toString('utf-8').trim();
        expect(installedVersions).to.include('20');
        expect(installedVersions).to.include('18');
      },
      validateDestroy: () => {
        expect(() => execSync('source ~/.zshrc; which nvm', { shell: 'zsh' })).to.throw();
      }
    });
  });
});

export {};
