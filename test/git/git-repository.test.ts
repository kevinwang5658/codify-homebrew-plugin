import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import { execSync } from 'child_process';

describe('Git repository integration tests', async () => {
  const pluginPath = path.resolve('./src/index.ts');

  it('Can install git repo to parent dir', { timeout: 300000 }, async () => {
    await PluginTester.fullTest(pluginPath, [
      {
        type: 'git-repository',
        parentDirectory: '~/projects/test',
        repository: 'https://github.com/kevinwang5658/untitled.git'
      }
    ], {
      skipUninstall: true, // Can't directly delete repos via codify currently.
      validateApply: async () => {
        const location = path.join(os.homedir(), 'projects', 'test', 'untitled');
        const lstat = await fs.lstat(location);

        expect(lstat.isDirectory()).to.be.true;
        console.log(await fs.readdir(location));

        const repoInfo = execSync('git config --get remote.origin.url', { cwd: location }).toString('utf-8').trim();
        console.log(repoInfo);
        expect(repoInfo).to.eq('https://github.com/kevinwang5658/untitled.git')
      }
    });
  })

  it('Can install git repo to specified dir', { timeout: 300000 }, async () => {
    await PluginTester.fullTest(pluginPath, [
      {
        type: 'git-repository',
        directory: '~/projects/nested/codify-plugin',
        repository: 'https://github.com/kevinwang5658/untitled.git'
      }
    ], {
      skipUninstall: true,
      validateApply: async () => {
        const location = path.join(os.homedir(), 'projects', 'nested', 'codify-plugin');
        const lstat = await fs.lstat(location);

        expect(lstat.isDirectory()).to.be.true;

        const repoInfo = execSync('git config --get remote.origin.url', { cwd: location }).toString('utf-8').trim();
        expect(repoInfo).to.eq('https://github.com/kevinwang5658/untitled.git')
      }
    });
  })
})
