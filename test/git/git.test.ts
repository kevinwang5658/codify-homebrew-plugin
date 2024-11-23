import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

describe('Git integration tests', async () => {
  let plugin: PluginTester;

  beforeEach(() => {
    plugin = new PluginTester(path.resolve('./src/index.ts'));
  })

  it('Can add global user name and email', { timeout: 300000 }, async () => {
    await plugin.fullTest([
      {
        type: 'git',
        username: 'test',
        email: 'test@test.com'
      }
    ], {
      skipUninstall: true,
      validateApply: async () => {
        const email = execSync('source ~/.zshrc; git config --global user.email')
        expect(email.toString('utf-8').trim()).to.equal('test@test.com')

        const username = execSync('source ~/.zshrc; git config --global user.name')
        expect(username.toString('utf-8').trim()).to.equal('test')
      }
    });
  })

  it('Can modify git user name and email', { timeout: 300000 }, async () => {
    await plugin.fullTest([
      {
        type: 'git',
        username: 'test2',
        email: 'test2@test.com'
      }
    ], {
      // Set true here because git resource cannot be destroyed right now
      skipUninstall: true,
      validateApply: async () => {
        const email = execSync('source ~/.zshrc; git config --global user.email')
        expect(email.toString('utf-8').trim()).to.equal('test2@test.com')

        const username = execSync('source ~/.zshrc; git config --global user.name')
        expect(username.toString('utf-8').trim()).to.equal('test2')
      }
    });
  })

  afterEach(() => {
    plugin.kill();
  })
})
