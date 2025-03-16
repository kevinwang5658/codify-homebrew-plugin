import { CreatePlan, DestroyPlan, RefreshContext, Resource, ResourceSettings, getPty } from 'codify-plugin-lib';
import { ResourceConfig } from 'codify-schemas';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { codifySpawn } from '../../../utils/codify-spawn.js';
import { FileUtils } from '../../../utils/file-utils.js';
import schema from './pnpm-schema.json';

export interface PnpmConfig extends ResourceConfig {
  version?: string;
}

export class Pnpm extends Resource<PnpmConfig> {
  getSettings(): ResourceSettings<PnpmConfig> {
    return {
      id: 'pnpm',
      schema,
      parameterSettings: {
        version: { type: 'version' }
      }
    }
  }

  async refresh(parameters: Partial<PnpmConfig>, context: RefreshContext<PnpmConfig>): Promise<Partial<PnpmConfig> | Partial<PnpmConfig>[] | null> {
    const pty = getPty();

    const { status } = await pty.spawnSafe('which pnpm');
    if (status === 'error') {
      return null;
    }

    // Return a specific version if it's required from the user.
    if (parameters.version) {
      const { data } = await pty.spawn('pnpm --version');
      return { version: data }
    }
 
      return parameters;
    
  }

  async create(plan: CreatePlan<PnpmConfig>): Promise<void> {
    const specificVersion = plan.desiredConfig.version;

    specificVersion
      ? await codifySpawn(`curl -fsSL https://get.pnpm.io/install.sh | env PNPM_VERSION=${specificVersion} sh -`)
      : await codifySpawn('curl -fsSL https://get.pnpm.io/install.sh | sh -')
  }

  async destroy(plan: DestroyPlan<PnpmConfig>): Promise<void> {
    const { data: pnpmLocation } = await codifySpawn('which pnpm');
    if (pnpmLocation.trim().toLowerCase() !== path.join(os.homedir(), 'Library', 'pnpm', 'pnpm').trim().toLowerCase()) {
      throw new Error('pnpm was installed outside of Codify. Please uninstall manually and re-run Codify');
    }

    const { data: pnpmHome } = await codifySpawn('echo $PNPM_HOME', { throws: false });
    if (!pnpmHome) {
      throw new Error('$PNPM_HOME variable is not set. Unable to determine how to uninstall pnpm. Please uninstall manually and re-run Codify.')
    }

    await fs.rm(pnpmHome, { recursive: true, force: true });
    console.log('Successfully uninstalled pnpm');

    await FileUtils.removeLineFromZshrc('# pnpm')
    await FileUtils.removeLineFromZshrc(`export PNPM_HOME="${os.homedir()}/Library/pnpm"`)
    await FileUtils.removeFromFile(path.join(os.homedir(), '.zshrc'),
`case ":$PATH:" in
  *":$PNPM_HOME:"*) ;;
  *) export PATH="$PNPM_HOME:$PATH" ;;
esac`)
    await FileUtils.removeLineFromZshrc('# pnpm end')
  }
}
