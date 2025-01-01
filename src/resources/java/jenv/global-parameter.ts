import { getPty, ParameterSetting, SpawnStatus, StatefulParameter } from 'codify-plugin-lib';

import { codifySpawn } from '../../../utils/codify-spawn.js';
import { JenvConfig } from './jenv.js';

export class JenvGlobalParameter extends StatefulParameter<JenvConfig, string>{

  getSettings(): ParameterSetting {
    return {
      type: 'version'
    }
  }

  override async refresh(): Promise<null | string> {
    const $ = getPty();

    const { data, status } = await $.spawnSafe('jenv global')
    if (status === SpawnStatus.ERROR) {
      return null;
    }

    return data.trim();
  }

  override async add(valueToAdd: string): Promise<void> {
    await codifySpawn(`jenv global ${valueToAdd}`)
  }

  override async modify(newValue: string): Promise<void> {
    await codifySpawn(`jenv global ${newValue}`)
  }

  override async remove(): Promise<void> {
    await codifySpawn('jenv global system')
  }
}
