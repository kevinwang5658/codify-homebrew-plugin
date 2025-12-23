import { Resource, ResourceSettings, getPty, SpawnStatus } from 'codify-plugin-lib';
import { OS, StringIndexedObject } from 'codify-schemas';
import fs from 'node:fs/promises';

import { Utils } from '../../../utils/index.js';
import Schema from './aws-cli-schema.json';

export interface AwsCliConfig extends StringIndexedObject {
  // TODO: Add version parameter
  // TODO: Add setup parameter
  // TODO: Add parameter to prefer homebrew
}

export class AwsCliResource extends Resource<AwsCliConfig> {

  getSettings(): ResourceSettings<AwsCliConfig> {
    return {
      schema: Schema,
      operatingSystems: [OS.Darwin],
      id: 'aws-cli',
    };
  }


  override async refresh(): Promise<Partial<AwsCliConfig> | null> {
    const $ = getPty();

    const awsCliInfo = await $.spawnSafe('which aws');
    console.log('Spawn result', awsCliInfo);

    if (awsCliInfo.status === SpawnStatus.ERROR) {
      return null;
    }

    return {};
  }

  override async create(): Promise<void> {
    const $ = getPty();

    // Amazon has not released a standalone way to install arm aws-cli. See: https://github.com/aws/aws-cli/issues/7252
    // Prefer the homebrew version on M1
    const isArmArch = await Utils.isArmArch();
    const isRosettaInstalled = await Utils.isRosetta2Installed()
    const isHomebrewInstalled = await Utils.isHomebrewInstalled();

    if (isArmArch && isHomebrewInstalled) {
      console.log('Resource: \'aws-cli\'. Detected that mac is aarch64. Installing AWS-CLI via homebrew')
      await $.spawn('HOMEBREW_NO_AUTO_UPDATE=1 brew install awscli', { interactive: true })

    } else if (!isArmArch || isRosettaInstalled) {
      console.log('Resource: \'aws-cli\'. Detected that mac is not ARM or Rosetta is installed. Installing AWS-CLI standalone version')
      await $.spawn('curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"');
      await $.spawn('installer -pkg ./AWSCLIV2.pkg -target /', { requiresRoot: true })
      await fs.rm('./AWSCLIV2.pkg', { recursive: true, force: true });

    } else {
      // This covers arm arch + Homebrew is not installed
      throw new Error(`Resource: 'aws-cli'. This plugin prefers installing AWS-CLI via homebrew for M1 macs.
AWS has not updated the standalone installer to support M1 macs. See: https://github.com/aws/aws-cli/issues/7252. 

Homebrew can be installed by adding: 
{
  "type": "homebrew",
}

Or enable rosetta 2 using the below command and re-run:

softwareupdate --install-rosetta
      `);
    }
  }

  override async destroy(): Promise<void> {
    const $ = getPty();

    const installLocation = await this.findInstallLocation();
    if (!installLocation) {
      return;
    }
    
    if (installLocation.includes('homebrew')) {
      await $.spawn('brew uninstall awscli', { interactive: true, env: { HOMEBREW_NO_AUTO_UPDATE: 1 } });
      return;
    }
    
    await $.spawn(`rm ${installLocation}`, { requiresRoot: true });
    await $.spawn(`rm ${installLocation}_completer`, { requiresRoot: true });
    await $.spawn('rm -rf $HOME/.aws/');
  }
  
  private async findInstallLocation(): Promise<null | string> {
    const $ = getPty();
    const query = await $.spawnSafe('which aws', { interactive: true });
    if (query.status === SpawnStatus.ERROR) {
      return null;
    }

    return query.data;
  }
}
