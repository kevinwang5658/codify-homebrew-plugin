import { describe, expect, it } from 'vitest';
import { TerraformResource } from './terraform';

describe('Terraform unit tests', () => {
  it('Can download info about the latest terraform release', async () => {
    const resource = new TerraformResource();
    const response = await resource.getLatestTerraformInfo();

    expect(response).toMatchObject({
      builds: expect.any(Object),
      name: expect.any(String),
      version: expect.any(String),
      is_prerelease: expect.any(Boolean)
    })
  })

  it('Can get info on a specific terraform release', async () => {
    const resource = new TerraformResource();
    const response = await resource.getReleaseInfo('1.7.2');

    expect(response).toMatchObject({
      builds: expect.any(Object),
      name: expect.any(String),
      version: expect.any(String),
      is_prerelease: expect.any(Boolean)
    })
  })

  it('Can get info on a specific terraform release (error)', async () => {
    const resource = new TerraformResource();
    const response = await resource.getReleaseInfo('1.72');

    expect(response).to.be.null;
  })
})
