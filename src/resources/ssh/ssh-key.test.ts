import { describe, it } from 'vitest';
import { SshKeyResource } from './ssh-key.js';

describe('ssh key unit test', () => {
  it('Can refresh', async () => {
    const resource = new SshKeyResource();
    const result = await resource.refresh({
      keyType: 'rsa',
      fileName: 'id_rsa',
      comment: 'kevinwang5658@gmail.com',
      bits: 3072
    })

    console.log(result);
  })
})
