import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs/promises';
import { TestUtils } from '../test-utils.js';

describe('Aws profile tests', async () => {
  const pluginPath = path.resolve('./src/index.ts');

  it('Can add a aws-cli profile', { timeout: 300000 }, async () => {
    await PluginTester.fullTest(pluginPath, [
      { type: 'homebrew' },
      { type: 'aws-cli' },
      {
        type: 'aws-profile',
        awsAccessKeyId: 'keyId',
        awsSecretAccessKey: 'secretAccessKey',
        region: 'us-west-2',
        output: 'json'
      }
    ], {
      skipUninstall: true,
      validateApply: async () => {
        validateProfile({
          name: 'default',
          region: 'us-west-2',
          output: 'json',
          accessKeyId: 'keyId',
          secretAccessKey: 'secretAccessKey'
        })
      }
    });
  })

  it('Always defaults output to json + can modify a previous profile', { timeout: 300000 }, async () => {
    await PluginTester.fullTest(pluginPath, [
      {
        type: 'aws-profile',
        profile: 'default',
        output: 'text',
        awsAccessKeyId: 'keyId2',
        awsSecretAccessKey: 'secretAccessKey2',
        region: 'us-east-2',
      },
      {
        type: 'aws-profile',
        profile: 'codify2',
        region: 'us-east-1',
        awsAccessKeyId: 'keyId',
        awsSecretAccessKey: 'secretAccessKey',
      }
    ], {
      skipUninstall: true,
      validateApply: async () => {
        validateProfile({
          name: 'default',
          region: 'us-east-2',
          output: 'text',
          accessKeyId: 'keyId2',
          secretAccessKey: 'secretAccessKey2'
        })
        validateProfile({
          name: 'codify2',
          region: 'us-east-1',
          output: 'json',
          accessKeyId: 'keyId',
          secretAccessKey: 'secretAccessKey'
        })
      }
    });
  })

  it('Supports csv files + can be destroyed', { timeout: 300000 }, async () => {
    const csvFilePath = path.resolve('csv_credentials');
    await fs.writeFile(
      csvFilePath,
`Access key ID,Secret access key
AKIA,zhKpjk
`, 'utf-8');

    await PluginTester.fullTest(pluginPath, [
      {
        type: 'aws-profile',
        profile: 'codify3',
        region: 'us-east-1',
        csvCredentials: csvFilePath,
      }
    ], {
      validateApply: async () => {
        validateProfile({
          name: 'codify3',
          region: 'us-east-1',
          output: 'json',
          accessKeyId: 'AKIA',
          secretAccessKey: 'zhKpjk'
        })
      },
      validateDestroy: async () => {
        const profiles = execSync(TestUtils.getShellCommand('aws configure list-profiles'))
        const profileList = profiles.toString('utf-8').trim().split(/\n/);
        expect(profileList).to.not.include('codify3');
      }
    });
  })

  function validateProfile(profile: {
    name: string;
    region: string;
    output: string;
    accessKeyId: string;
    secretAccessKey: string;
  }) {
    const profiles = execSync(TestUtils.getShellCommand('aws configure list-profiles'))
    expect(profiles.toString('utf-8')).to.include(profile.name);

    const region = execSync(TestUtils.getShellCommand(`aws configure get region --profile ${profile.name}`));
    expect(region.toString('utf-8').trim()).to.equal(profile.region);

    const output = execSync(TestUtils.getShellCommand(`aws configure get output --profile ${profile.name}`));
    expect(output.toString('utf-8').trim()).to.equal(profile.output);

    const accessKeyId = execSync(TestUtils.getShellCommand(`aws configure get aws_access_key_id --profile ${profile.name}`));
    expect(accessKeyId.toString('utf-8').trim()).to.equal(profile.accessKeyId);

    const secretAccessKey = execSync(TestUtils.getShellCommand(`aws configure get aws_secret_access_key --profile ${profile.name}`));
    expect(secretAccessKey.toString('utf-8').trim()).to.equal(profile.secretAccessKey);
  }

})
