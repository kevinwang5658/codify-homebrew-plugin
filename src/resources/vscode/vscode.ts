import { CreatePlan, DestroyPlan, Resource } from 'codify-plugin-lib';
import { ResourceConfig } from 'codify-schemas';
import path from 'node:path';

import { codifySpawn, SpawnStatus } from '../../utils/codify-spawn.js';
import Schema from './vscode-schema.json';

const VSCODE_APPLICATION_NAME = 'Visual Studio Code.app';
const DOWNLOAD_LINK = 'https://code.visualstudio.com/sha/download?build=stable&os=darwin-universal';

export interface VscodeConfig extends ResourceConfig {
  directory: string;
}

export class VscodeResource extends Resource<VscodeConfig> {
  constructor() {
    super({
      dependencies: ['homebrew'],
      parameterOptions: {
        directory: { default: '/Applications' }
      },
      schema: Schema,
      type: 'vscode'
    });
  }

  async refresh(parameters: Partial<VscodeConfig>): Promise<Partial<VscodeConfig> | null> {
    const directory = parameters.directory!;

    const isInstalled = await this.isVscodeInstalled(directory);
    if (!isInstalled) {
      return null;
    }

    return parameters;
  }

  async applyCreate(plan: CreatePlan<VscodeConfig>): Promise<void> {
    // Create a temporary tmp dir
    const temporaryDirQuery = await codifySpawn('mktemp -d');
    const temporaryDir = temporaryDirQuery.data.trim();

    // Download vscode
    await codifySpawn(`curl -fsSL "${DOWNLOAD_LINK}" -o vscode.zip`, { cwd: temporaryDir });

    // Unzip
    await codifySpawn('unzip vscode.zip', { cwd: temporaryDir });

    // Move VSCode to the applications folder
    const { directory } = plan.desiredConfig;
    await codifySpawn(`mv "${VSCODE_APPLICATION_NAME}" ${directory}`, { cwd: temporaryDir })
    await codifySpawn(`rm -rf ${temporaryDir}`)
  }

  async applyDestroy(plan: DestroyPlan<VscodeConfig>): Promise<void> {
    const { directory } = plan.currentConfig;
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
