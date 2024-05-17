import { Plan, Resource, ValidationResult } from 'codify-plugin-lib';
import { ResourceConfig } from 'codify-schemas';
import { codifySpawn, SpawnStatus } from '../../utils/codify-spawn.js';
import Ajv2020 from 'ajv/dist/2020.js';
import Schema from './vscode-schema.json';
import { ValidateFunction } from 'ajv';
import { TerraformConfig } from '../terraform/terraform.js';
import path from 'node:path';

const DEFAULT_INSTALL_DIRECTORY = '/Applications';
const VSCODE_APPLICATION_NAME = 'Visual Studio Code.app';
const DOWNLOAD_LINK = 'https://code.visualstudio.com/sha/download?build=stable&os=darwin-universal';

export interface VscodeConfig extends ResourceConfig {
  directory: string;
}

export class VscodeResource extends Resource<VscodeConfig> {
  private ajv = new Ajv2020.default({
    strict: true,
  })
  private readonly validator: ValidateFunction;

  constructor() {
    super({
      type: 'vscode',
      dependencies: ['homebrew'],
      parameterConfigurations: {
        directory: {}
      }
    });

    this.validator = this.ajv.compile(Schema);
  }

  async validate(config: unknown): Promise<ValidationResult> {
    const isValid = this.validator(config)

    return {
      isValid,
      errors: this.validator.errors ?? undefined,
    }
  }

  async refresh(desired: Map<string, any>): Promise<Partial<VscodeConfig> | null> {
    const directory = desired.get('directory') ?? DEFAULT_INSTALL_DIRECTORY

    const isInstalled = await this.isVscodeInstalled(directory);
    if (!isInstalled) {
      return null;
    }

    const results: Partial<TerraformConfig> = {}
    if (desired.has('directory')) {
      results.directory = directory;
    }

    return results;
  }

  async applyCreate(plan: Plan<VscodeConfig>): Promise<void> {
    // Create a temporary tmp dir
    const temporaryDirQuery = await codifySpawn('mktemp -d');
    const temporaryDir = temporaryDirQuery.data.trim();

    // Download vscode
    await codifySpawn(`curl -fsSL "${DOWNLOAD_LINK}" -o "${VSCODE_APPLICATION_NAME}"`, { cwd: temporaryDir });

    // Move VSCode to the applications folder
    await codifySpawn('ls', { cwd: temporaryDir });
    await codifySpawn(`mv "${VSCODE_APPLICATION_NAME}" ${plan.desiredConfig.directory}`, { cwd: temporaryDir })
    await codifySpawn(`rm -rf ${temporaryDir}`)
  }

  async applyDestroy(plan: Plan<VscodeConfig>): Promise<void> {
    const directory = plan.currentConfig.directory ?? DEFAULT_INSTALL_DIRECTORY

    const location = path.join(directory, `"${VSCODE_APPLICATION_NAME}"`);
    await codifySpawn(`rm -r ${location}`);
  }

  private async isVscodeInstalled(directory: string): Promise<boolean> {
    const query = await codifySpawn(`ls ${directory}`, { throws: false });
    if (query.status === SpawnStatus.ERROR) {
      return false;
    }

    return query.data.split('\n')
      .includes(VSCODE_APPLICATION_NAME);
  }
}
