import { Plan, Resource, SpawnStatus, ValidationResult } from 'codify-plugin-lib';
import { StringIndexedObject } from 'codify-schemas';
import semver from 'semver/preload.js';

import { codifySpawn } from '../../utils/codify-spawn.js';
import { Utils } from '../../utils/index.js';
import { HashicorpReleaseInfo, HashicorpReleasesAPIResponse, TerraformVersionInfo } from './terraform-types.js';
import { untildify } from '../../utils/untildify.js';

const TERRAFORM_RELEASES_API_URL = 'https://api.releases.hashicorp.com/v1/releases/terraform';
const TERRAFORM_RELEASE_INFO_API_URL = (version: string) => `https://api.releases.hashicorp.com/v1/releases/terraform/${version}`;

export interface TerraformConfig extends StringIndexedObject {
  directory?: string,
  version?: string,
  // TODO: Add option to install using brew.
  // TODO: Add option to install auto-complete
}

export class TerraformResource extends Resource<TerraformConfig> {
  constructor() {
    super({
      type: 'terraform',
      parameterConfigurations: {
        directory: {
          isEqual: (desired, current) => untildify(desired) === untildify(current),
        }
      }
    });
  }

  async validate(config: unknown): Promise<ValidationResult> {
    // TODO: Verify that directory is fully qualified

    return {
      isValid: true,
    }
  }

  async refresh(keys: Set<number | string>): Promise<Partial<TerraformConfig> | null> {
    const terraformInfo = await codifySpawn('which terraform', { throws: false });
    if (terraformInfo.status === SpawnStatus.ERROR) {
      return null;
    }

    const results: Partial<TerraformConfig> = {}
    if (keys.has('directory')) {
      const directory = terraformInfo.data.trim();

      // which command returns the directory with the binary included. For Ex: /usr/local/bin/terraform. Remove the terraform and return.
      results.directory = directory.substring(0, directory.lastIndexOf('/'));
    }

    if (keys.has('version')) {
      const versionQuery = await codifySpawn('terraform version -json');
      const versionJson = JSON.parse(versionQuery.data) as TerraformVersionInfo;
      
      results.version = versionJson.terraform_version;
    }

    return results;
  }

  async applyCreate(plan: Plan<TerraformConfig>): Promise<void> {
    const { version } = plan.desiredConfig;
    const isArm = await Utils.isArmArch()
    const directory = plan.desiredConfig.directory ?? '/usr/local/bin';

    const releaseInfo = await (version ? this.getReleaseInfo(version) : this.getLatestTerraformInfo());
    if (!releaseInfo) {
      throw new Error(`Resource ${this.typeId} unable to resolve Terraform download url ${version}`);
    }

    const downloadUrl = await this.getDownloadUrl(releaseInfo, isArm);
    if (!downloadUrl) {
      throw new Error(`Resource ${this.typeId}. Could not parse download url for arch ${isArm ? 'arm64' : 'amd64'}, os: darwin, and version: ${version}. 
${JSON.stringify(releaseInfo, null, 2)}
      `);
    }
    
    // Create a temporary tmp dir
    const temporaryDirQuery = await codifySpawn('mktemp -d');
    const temporaryDir = temporaryDirQuery.data.trim();

    // Download and unzip the terraform binary
    await codifySpawn(`curl -fsSL ${downloadUrl} -o terraform.zip`, { cwd: temporaryDir });
    await codifySpawn('unzip terraform.zip', { cwd: temporaryDir });

    // Ensure that /usr/local/bin exists. If not then create it
    if (directory === '/usr/local/bin') {
      await Utils.createBinDirectoryIfNotExists()
    } else {
      await Utils.createDirectoryIfNotExists(directory);
    }

    await codifySpawn(`sudo mv ./terraform ${directory}`, { cwd: temporaryDir })
    await codifySpawn(`sudo rm -rf ${temporaryDir}`)

    if (!await Utils.isDirectoryOnPath(directory)) {
      await codifySpawn(`echo 'export PATH=$PATH:${directory}' >> $HOME/.zshenv`);
    }
  }

  async applyDestroy(plan: Plan<TerraformConfig>): Promise<void> {
    const installLocationQuery = await codifySpawn('which terraform', { throws: false });
    if (installLocationQuery.status === SpawnStatus.ERROR) {
      return;
    }

    if (installLocationQuery.data.includes('homebrew')) {
      await codifySpawn('brew uninstall terraform');
      return;
    }

    await codifySpawn(`sudo rm ${installLocationQuery.data}`);
  }

  async getLatestTerraformInfo(): Promise<HashicorpReleaseInfo> {
    const terraformVersionQuery = await fetch(TERRAFORM_RELEASES_API_URL)
    if (!terraformVersionQuery.ok) {
      throw new Error(`Resource ${this.typeId}. Un-able to fetch Terraform version list`)
    }

    const json = await terraformVersionQuery.json() as HashicorpReleasesAPIResponse;

    // TODO: Allow pre-release builds here in the future
    return json
      .filter((r) => !r.is_prerelease)
      .sort((a, b) =>
        semver.rcompare(a.version, b.version)
      )[0];
  }

  async getReleaseInfo(version: string): Promise<HashicorpReleaseInfo | null> {
    const terraformVersionQuery = await fetch(TERRAFORM_RELEASE_INFO_API_URL(version))
    if (!terraformVersionQuery.ok) {
      return null;
    }

    return await terraformVersionQuery.json()
  }

  async getDownloadUrl(releaseInfo: HashicorpReleaseInfo, isArm: boolean): Promise<null | string> {
    const arch = isArm ? 'arm64' : 'amd64';
    const os = 'darwin';

    const build = releaseInfo.builds.find((b) => b.arch === arch && b.os === os);
    if (!build) {
      return null;
    }

    return build.url;
  }
}
