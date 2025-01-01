import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';

describe('Ssh config tests', () => {
  const pluginPath = path.resolve('./src/index.ts');

  it('Can generate a new .ssh/config file if it doesn\'t exist', { timeout: 300000 }, async () => {

    await PluginTester.fullTest(pluginPath, [
      {
        type: 'ssh-config',
        hosts: [
          {
            Host: '*',
            AddKeysToAgent: true,
            IdentityFile: 'id_ed25519'
          },
          {
            Host: 'github.com',
            AddKeysToAgent: true,
            UseKeychain: true,
            IgnoreUnknown: 'UseKeychain',
            IdentityFile: '~/.ssh/id_ed25519'
          }
        ]
      }
    ], {
      skipUninstall: true,
      validateApply: async () => {
        const fileAfter = await fs.readFile(path.resolve(os.homedir(), '.ssh', 'config'), 'utf-8')
        expect(fileAfter).toMatch(
`Host *
  AddKeysToAgent yes
  IdentityFile id_ed25519

Host github.com
  AddKeysToAgent yes
  UseKeychain yes
  IgnoreUnknown UseKeychain
  IdentityFile ~/.ssh/id_ed25519`)
      }
    })


  })

  it('Can modify an existing file', { timeout: 300000 }, async () => {
    await PluginTester.fullTest(pluginPath, [
      {
        type: 'ssh-config',
        hosts: [
          {
            Host: 'new.com',
            AddKeysToAgent: true,
            IdentityFile: 'id_ed25519'
          },
          {
            Host: 'github.com',
            AddKeysToAgent: true,
            UseKeychain: true,
          },
          {
            Match: 'User bob,joe,phil',
            PasswordAuthentication: true,
          }
        ],
      }
    ], {
      skipUninstall: true,
      validateApply: async () => {
        const file = await fs.readFile(path.resolve(os.homedir(), '.ssh', 'config'), 'utf-8')
        expect(file).toMatch(
`Host *
  AddKeysToAgent yes
  IdentityFile id_ed25519

Host new.com
  AddKeysToAgent yes
  IdentityFile id_ed25519

Match User bob,joe,phil
  PasswordAuthentication yes

Host github.com
  AddKeysToAgent yes
  UseKeychain yes`
        )
      }
    })
  })

  it('Can match similar host names + destroy a .ssh/config file by renaming it', { timeout: 300000 }, async () => {
    await PluginTester.fullTest(pluginPath, [
      {
        type: 'ssh-config',
        hosts: [
          {
            Host: 'new.com_2',
            AddKeysToAgent: true,
            IdentityFile: 'id_ed25519'
          },
        ],
      }
    ], {
      validateApply: async () => {
        const file = await fs.readFile(path.resolve(os.homedir(), '.ssh', 'config'), 'utf-8')
        expect(file).toMatch(
`Host *
  AddKeysToAgent yes
  IdentityFile id_ed25519

Host new.com
  AddKeysToAgent yes
  IdentityFile id_ed25519

Match User bob,joe,phil
  PasswordAuthentication yes

Host github.com
  AddKeysToAgent yes
  UseKeychain yes

Host new.com_2
  AddKeysToAgent yes
  IdentityFile id_ed25519`
        )
      },
      validateDestroy: async () => {
        expect(async () => await fs.lstat(path.resolve(os.homedir(), '.ssh', 'config'))).to.throws;
        expect(async () => await fs.lstat(path.resolve(os.homedir(), '.ssh', 'config_deleted_by_codify'))).to.not.throws;
      }
    })
  })
})
