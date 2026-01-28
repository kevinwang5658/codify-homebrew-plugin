import { getPty, ParameterSetting, SpawnStatus, StatefulParameter } from 'codify-plugin-lib';

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
    const $ = getPty();
    await $.spawn(`pyenv global ${valueToAdd}`, { interactive: true })
  }

  override async modify(newValue: string): Promise<void> {
    const $ = getPty();
    await $.spawn(`pyenv global ${newValue}`, { interactive: true })
  }

  override async remove(): Promise<void> {
    const $ = getPty();
    await $.spawn('pyenv global system', { interactive: true })
  }
}
