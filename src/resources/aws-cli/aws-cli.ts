import { Plan, Resource, ValidationResult } from 'codify-plugin-lib';
import { StringIndexedObject } from 'codify-schemas';
import { codifySpawn, SpawnStatus } from '../../utils/codify-spawn.js';

export interface AwsCliConfig extends StringIndexedObject {
  // TODO: Add version parameter
  // TODO: Add setup parameter
  // TODO: Add parameter to prefer homebrew
}

export class AwsCliResource extends Resource<AwsCliConfig> {
  constructor() {
    super({
      type: 'aws-cli',
    });
  }

  async validate(config: unknown): Promise<ValidationResult> {
    // TODO: Add validation here

    return {
      isValid: true,
    }
  }

  async refresh(keys: Set<string | number>): Promise<Partial<AwsCliConfig> | null> {
    const awsCliInfo = await codifySpawn('which aws', { throws: false });
    if (awsCliInfo.status === SpawnStatus.ERROR) {
      return null;
    }

    return {};
  }

  async applyCreate(plan: Plan<AwsCliConfig>): Promise<void> {
    // Amazon has not released a standalone way to install arm aws-cli. See: https://github.com/aws/aws-cli/issues/7252
    // Prefer the homebrew version on M1
    const isM1 = await this.isM1();
    const isRosettaInstalled = await this.isRosetta2Installed()

    if (!isM1 || isRosettaInstalled) {
      console.log(`Resource: ${this.typeId}. Detected that mac is not ARM or Rosetta is installed. Installing AWS-CLI standalone version`)

      await codifySpawn('curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"');
      await codifySpawn('sudo installer -pkg ./AWSCLIV2.pkg -target /')
      await codifySpawn('rm -rf ./AWSCLIV2.pkg')
      return;
    }

    const isHomebrewInstalled = await this.isHomebrewInstalled();
    if (!isHomebrewInstalled) {
      throw new Error(`Resource: ${this.typeId}. This plugin prefers installing AWS-CLI via homebrew for M1 macs.
AWS has not updated the standalone installer to support M1 macs. See: . 

Please install homebrew: https://github.com/aws/aws-cli/issues/7252
{
  "type": "homebrew",
}

Or enable rosetta 2 and re-run:
softwareupdate --install-rosetta`
      );
    }

    console.log(`Resource: ${this.typeId}. Detected that mac is ARM and Rosetta is not installed. Installing AWS-CLI via homebrew`)
    await codifySpawn('brew install awscli')
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

  private async isM1(): Promise<boolean> {
    const query = await codifySpawn('uname -m');
    return query.data.includes('arm');
  }

  private async isRosetta2Installed(): Promise<boolean> {
    const query = await codifySpawn('arch -x86_64 /usr/bin/true 2> /dev/null', { throws: false });
    return query.status === SpawnStatus.SUCCESS;
  }

  private async isHomebrewInstalled(): Promise<boolean> {
    const query = await codifySpawn('which brew', { throws: false });
    return query.status === SpawnStatus.SUCCESS;
  }
  
  private async findInstallLocation(): Promise<string | null> {
    const query = await codifySpawn('which aws', { throws: false });
    if (query.status === SpawnStatus.ERROR) {
      return null;
    }
    
    return query.data;
  }
}
