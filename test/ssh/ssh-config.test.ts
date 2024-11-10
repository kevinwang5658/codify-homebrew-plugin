import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

describe('Ssh config tests', () => {
  let plugin: PluginTester;

  beforeEach(async () => {
    plugin = new PluginTester(path.resolve('./src/index.ts'));
  })

  it('Can generate a new .ssh/config file if it doesn\'t exist', { timeout: 300000 }, async () => {

    await plugin.fullTest([
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
    ], true)

    const fileAfter = await fs.readFile(path.resolve(os.homedir(), '.ssh', 'config'), 'utf-8')
    console.log(fileAfter);

    expect(fileAfter).toMatch(
`Host *
  AddKeysToAgent yes
  IdentityFile id_ed25519

Host github.com
  AddKeysToAgent yes
  UseKeychain yes
  IgnoreUnknown UseKeychain
  IdentityFile ~/.ssh/id_ed25519`)
  })

  it('Can modify an existing file', { timeout: 300000 }, async () => {
    await plugin.fullTest([
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
    ], true)

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
    console.log(file);
  })

  afterEach(() => {
    plugin.kill();
  })
})
