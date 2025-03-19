import { ParameterSetting, StatefulParameter, getPty } from 'codify-plugin-lib';
import fs from 'node:fs/promises';

import { codifySpawn } from '../../../utils/codify-spawn.js';
import { FileUtils } from '../../../utils/file-utils.js';
import { PnpmConfig } from './pnpm.js';

export class PnpmGlobalEnvStatefulParameter extends StatefulParameter<PnpmConfig, string> {

  getSettings(): ParameterSetting {
    return {
      type: 'version',
    }
  }

  async refresh(): Promise<null | string> {
    const pty = getPty()

    const { data: path } = await pty.spawnSafe('echo $PNPM_HOME/node')
    if (!path || !(await FileUtils.fileExists(path))) {
      return null;
    }

    const { data: version } = await pty.spawn(`${path} -v`)
    return version.trim().slice(1);
  }

  async add(valueToAdd: string): Promise<void> {
    await codifySpawn(`pnpm env use --global ${valueToAdd}`);
  }

  async modify(newValue: string): Promise<void> {
    await codifySpawn(`pnpm env use --global ${newValue}`)
  }

  async remove(): Promise<void> {
    const { data: path } = await codifySpawn('echo $PNPM_HOME/nodejs')
    await fs.rm(path!, { recursive: true, force: true });
  }
}
