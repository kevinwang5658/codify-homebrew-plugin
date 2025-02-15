import { CreatePlan, getPty, Resource, ResourceSettings, SpawnStatus } from 'codify-plugin-lib';
import { StringIndexedObject } from 'codify-schemas';
import semver from 'semver';

import { codifySpawn } from '../../utils/codify-spawn.js';
import { FileUtils } from '../../utils/file-utils.js';
import { Utils } from '../../utils/index.js';
import Schema from './terraform-schema.json';
import { HashicorpReleaseInfo, HashicorpReleasesAPIResponse, TerraformVersionInfo } from './terraform-types.js';

const TERRAFORM_RELEASES_API_URL = 'https://api.releases.hashicorp.com/v1/releases/terraform';
const TERRAFORM_RELEASE_INFO_API_URL = (version: string) => `https://api.releases.hashicorp.com/v1/releases/terraform/${version}`;

export interface TerraformConfig extends StringIndexedObject {
  directory?: string,
  version?: string,
  // TODO: Add option to install using brew.
  // TODO: Add option to install auto-complete
}

export class TerraformResource extends Resource<TerraformConfig> {

  getSettings(): ResourceSettings<TerraformConfig> {
    return {
      id: 'terraform',
      schema: Schema,
      parameterSettings: {
        directory: {
          type: 'directory',
        }
      },
      importAndDestroy:{
        refreshKeys: ['directory', 'version'],
        defaultRefreshValues: {
          version: 'latest',
        }
      }
    }
  }

  override async refresh(parameters: Partial<TerraformConfig>): Promise<Partial<TerraformConfig> | null> {
    const $ = getPty();

    const terraformInfo = await $.spawnSafe('which terraform');
    if (terraformInfo.status === SpawnStatus.ERROR) {
      return null;
    }

    const results: Partial<TerraformConfig> = {}
    if (parameters.directory) {
      const directory = terraformInfo.data.trim();

      // which command returns the directory with the binary included. For Ex: /usr/local/bin/terraform. Remove the terraform and return.
      results.directory = directory.slice(0, Math.max(0, directory.lastIndexOf('/')));
    }

    if (parameters.version) {
      const versionQuery = await $.spawn('terraform version -json');
      const versionJson = JSON.parse(versionQuery.data.trim().replaceAll('\n', '')) as TerraformVersionInfo;

      results.version = versionJson.terraform_version;
    }

    return results;
  }

  override async create(plan: CreatePlan<TerraformConfig>): Promise<void> {
    const { version } = plan.desiredConfig;
    const isArm = await Utils.isArmArch()
    const directory = plan.desiredConfig.directory ?? '/usr/local/bin';

    const releaseInfo = await (version ? this.getReleaseInfo(version) : this.getLatestTerraformInfo());
    if (!releaseInfo) {
      throw new Error(`Resource ${this.getSettings().id} unable to resolve Terraform download url ${version}`);
    }

    const downloadUrl = await this.getDownloadUrl(releaseInfo, isArm);
    if (!downloadUrl) {
      throw new Error(`Resource ${this.getSettings().id}. Could not parse download url for arch ${isArm ? 'arm64' : 'amd64'}, os: darwin, and version: ${version}. 
${JSON.stringify(releaseInfo, null, 2)}
      `);
    }
    
    // Create a temporary tmp dir
    const temporaryDirQuery = await codifySpawn('mktemp -d');
    const temporaryDir = temporaryDirQuery.data.trim();

    // Download and unzip the terraform binary
    await codifySpawn(`curl -fsSL ${downloadUrl} -o terraform.zip`, { cwd: temporaryDir });
    await codifySpawn('unzip -q terraform.zip', { cwd: temporaryDir });

    // Ensure that /usr/local/bin exists. If not then create it
    await (directory === '/usr/local/bin' ? Utils.createBinDirectoryIfNotExists() : Utils.createDirectoryIfNotExists(directory));

    await codifySpawn(`mv ./terraform ${directory}`, { cwd: temporaryDir, requiresRoot: true })
    await codifySpawn(`rm -rf ${temporaryDir}`)

    if (!await Utils.isDirectoryOnPath(directory)) {
      await codifySpawn(`echo 'export PATH=$PATH:${directory}' >> $HOME/.zshrc`);
    }
  }

  override async destroy(): Promise<void> {
    const installLocationQuery = await codifySpawn('which terraform', { throws: false });
    if (installLocationQuery.status === SpawnStatus.ERROR) {
      return;
    }

    if (installLocationQuery.data.includes('homebrew')) {
      await codifySpawn('brew uninstall terraform');
      return;
    }

    await codifySpawn(`rm ${installLocationQuery.data}`, { requiresRoot: true });
    await FileUtils.removeLineFromZshrc(`echo 'export PATH=$PATH:${installLocationQuery.data}' >> $HOME/.zshrc`);
  }

  private async getLatestTerraformInfo(): Promise<HashicorpReleaseInfo> {
    const terraformVersionQuery = await fetch(TERRAFORM_RELEASES_API_URL)
    if (!terraformVersionQuery.ok) {
      throw new Error(`Resource ${this.getSettings().id}. Un-able to fetch Terraform version list`)
    }

    const json = await terraformVersionQuery.json() as HashicorpReleasesAPIResponse;

    // TODO: Allow pre-release builds here in the future
    return json
      .filter((r) => !r.is_prerelease)
      .sort((a, b) =>
        semver.rcompare(a.version, b.version)
      )[0];
  }

  private async getReleaseInfo(version: string): Promise<HashicorpReleaseInfo | null> {
    const terraformVersionQuery = await fetch(TERRAFORM_RELEASE_INFO_API_URL(version))
    if (!terraformVersionQuery.ok) {
      return null;
    }

    return terraformVersionQuery.json()
  }

  private async getDownloadUrl(releaseInfo: HashicorpReleaseInfo, isArm: boolean): Promise<null | string> {
    const arch = isArm ? 'arm64' : 'amd64';
    const os = 'darwin';

    const build = releaseInfo.builds.find((b) => b.arch === arch && b.os === os);
    if (!build) {
      return null;
    }

    return build.url;
  }
}
