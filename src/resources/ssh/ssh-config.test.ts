import { describe, expect, it } from 'vitest';
import { SshConfigFileResource } from './ssh-config.js';
import { SshConfigHostsParameter } from './ssh-config-hosts-parameter';

describe('Ssh config unit test', () => {
  it('Can parse a ssh config file', async () => {
    const resource = new SshConfigFileResource();
    const result = await resource.refresh({});

    console.log(JSON.stringify(result, null, 2));
  })

  it('Can remap the input hosts objects', async () => {
    const resource = new SshConfigHostsParameter();
    const transformedInput = resource.getSettings().transformation?.to([
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
    ])

    expect(transformedInput).toMatchObject([
        {
          'Host': '*',
          'HostName': 'test',
          'IdentityFile': '~/.ssh/id_ed25519',
          'AddKeysToAgent': 'yes'
        },
        {
          'Host': '192.168.0.1',
          'User': 'pi'
        }
      ]
    )
  })
})
