import { Plan, Resource } from 'codify-plugin-lib';
import { StringIndexedObject } from 'codify-schemas';
import { codifySpawn, SpawnStatus } from '../../../utils/codify-spawn.js';
import { Utils } from '../../../utils/index.js';
import Schema from './aws-cli-schema.json';

export interface AwsCliConfig extends StringIndexedObject {
  // TODO: Add version parameter
  // TODO: Add setup parameter
  // TODO: Add parameter to prefer homebrew
}

export class AwsCliResource extends Resource<AwsCliConfig> {

  constructor() {
    super({
      type: 'aws-cli',
      schema: Schema,
    });
  }

  async refresh(): Promise<Partial<AwsCliConfig> | null> {
    const awsCliInfo = await codifySpawn('which aws', { throws: false });
    if (awsCliInfo.status === SpawnStatus.ERROR) {
      return null;
    }

    return {};
  }

  async applyCreate(plan: Plan<AwsCliConfig>): Promise<void> {
    // Amazon has not released a standalone way to install arm aws-cli. See: https://github.com/aws/aws-cli/issues/7252
    // Prefer the homebrew version on M1
    const isArmArch = await Utils.isArmArch();
    const isRosettaInstalled = await Utils.isRosetta2Installed()
    const isHomebrewInstalled = await Utils.isHomebrewInstalled();

    if (isArmArch && isHomebrewInstalled) {
      console.log(`Resource: ${this.typeId}. Detected that mac is aarch64. Installing AWS-CLI via homebrew`)
      await codifySpawn('brew install awscli')

    } else if (!isArmArch || isRosettaInstalled) {
      console.log(`Resource: ${this.typeId}. Detected that mac is not ARM or Rosetta is installed. Installing AWS-CLI standalone version`)
      await codifySpawn('curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"');
      await codifySpawn('sudo installer -pkg ./AWSCLIV2.pkg -target /')
      await codifySpawn('rm -rf ./AWSCLIV2.pkg')

    } else {
      // This covers arm arch + Homebrew is not installed
      throw new Error(`Resource: ${this.typeId}. This plugin prefers installing AWS-CLI via homebrew for M1 macs.
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

  async applyDestroy(plan: Plan<AwsCliConfig>): Promise<void> {
    const installLocation = await this.findInstallLocation();
    if (!installLocation) {
      return;
    }
    
    if (installLocation.includes('homebrew')) {
      await codifySpawn('brew uninstall awscli');
      return;
    }
    
    await codifySpawn(`sudo rm ${installLocation}`);
    await codifySpawn(`sudo rm ${installLocation}_completer`);
    await codifySpawn('sudo rm -rf /usr/local/aws-cli')
    await codifySpawn('sudo rm -rf $HOME/.aws/')
  }
  
  private async findInstallLocation(): Promise<string | null> {
    const query = await codifySpawn('which aws', { throws: false });
    if (query.status === SpawnStatus.ERROR) {
      return null;
    }
    
    return query.data;
  }
}
