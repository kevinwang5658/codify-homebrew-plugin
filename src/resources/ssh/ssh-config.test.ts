import { describe, expect, it } from 'vitest';
import { SshKeyResource } from './ssh-key.js';
import { SshConfigFileResource } from './ssh-config.js';

describe('Ssh config unit test', () => {
  it('Can parse a ssh config file', async () => {
    const resource = new SshConfigFileResource();
    const result = await resource.refresh({});

    console.log(JSON.stringify(result, null, 2));
  })

  it('Can remap the input hosts objects', async () => {
    const resource = new SshConfigFileResource();
    const transformedInput = resource.getSettings().transformation?.to({
      hosts: [
        {
          Host: '*',
          HostName: 'test',
          IdentityFile: '~/.ssh/id_ed25519',
          AddKeysToAgent: true
        },
        {
          Host: '192.168.0.1',
          User: 'pi'
        }
      ]
    })

    expect(transformedInput).toMatchObject({
      "hosts": [
        {
          "Host": "*",
          "HostName": "test",
          "IdentityFile": "~/.ssh/id_ed25519",
          "AddKeysToAgent": "yes"
        },
        {
          "Host": "192.168.0.1",
          "User": "pi"
        }
      ]
    })
  })
})
