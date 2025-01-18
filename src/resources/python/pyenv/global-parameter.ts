import { getPty, ParameterSetting, SpawnStatus, StatefulParameter } from 'codify-plugin-lib';

import { codifySpawn } from '../../../utils/codify-spawn.js';
import { PyenvConfig } from './pyenv.js';

export class PyenvGlobalParameter extends StatefulParameter<PyenvConfig, string>{

  getSettings(): ParameterSetting {
    return {
      type: 'version'
    }
  }

  override async refresh(): Promise<null | string> {
    const $ = getPty();

    const { data, status } = await $.spawnSafe('pyenv global')
    if (status === SpawnStatus.ERROR) {
      return null;
    }

    return data.trim();
  }

  override async add(valueToAdd: string): Promise<void> {
    await codifySpawn(`pyenv global ${valueToAdd}`)
  }

  override async modify(newValue: string): Promise<void> {
    await codifySpawn(`pyenv global ${newValue}`)
  }

  override async remove(): Promise<void> {
    await codifySpawn('pyenv global system')
  }
}
