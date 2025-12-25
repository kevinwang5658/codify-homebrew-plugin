import { CreatePlan, DestroyPlan, Resource, ResourceSettings, getPty } from 'codify-plugin-lib';
import { OS, ResourceConfig } from 'codify-schemas';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import Schema from './vscode-schema.json';

const VSCODE_APPLICATION_NAME = 'Visual Studio Code.app';
const DOWNLOAD_LINK = 'https://code.visualstudio.com/sha/download?build=stable&os=darwin-universal';

export interface VscodeConfig extends ResourceConfig {
  directory: string;
}

export class VscodeResource extends Resource<VscodeConfig> {
  getSettings(): ResourceSettings<VscodeConfig> {
    return {
      id: 'vscode',
      operatingSystems: [OS.Darwin],
      schema: Schema,
      parameterSettings: {
        directory: { type: 'directory', default: '/Applications' }
      },
    };
  }

  override async refresh(parameters: Partial<VscodeConfig>): Promise<Partial<VscodeConfig> | null> {
    const directory = parameters.directory!;

    const isInstalled = await this.isVscodeInstalled(directory);
    if (!isInstalled) {
      return null;
    }

    return parameters;
  }

  override async create(plan: CreatePlan<VscodeConfig>): Promise<void> {
    const $ = getPty();
    
    // Create a temporary tmp dir
    const temporaryDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vscode-'));

    // Download vscode
    await $.spawn(`curl -H "user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.182 Safari/537.36" -SL "${DOWNLOAD_LINK}" -o vscode.zip`, { cwd: temporaryDir });
    await $.spawn('unzip -q vscode.zip', { cwd: temporaryDir });

    // Move VSCode to the applications folder
    const { directory } = plan.desiredConfig;
    await $.spawn(`mv "${VSCODE_APPLICATION_NAME}" ${directory}`, { cwd: temporaryDir })
    await $.spawn(`rm -rf ${temporaryDir}`)
  }

  override async destroy(plan: DestroyPlan<VscodeConfig>): Promise<void> {
    const { directory } = plan.currentConfig;
    const location = path.join(directory, `"${VSCODE_APPLICATION_NAME}"`);
    const $ = getPty();
    await $.spawn(`rm -rf ${location}`);
  }

  private async isVscodeInstalled(directory: string): Promise<boolean> {
    const files = await fs.readdir(directory);
    return files
      .includes(VSCODE_APPLICATION_NAME);
  }
}
