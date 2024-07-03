import { SpawnStatus, StatefulParameter } from 'codify-plugin-lib';

import { codifySpawn } from '../../../utils/codify-spawn.js';
import { JenvConfig } from './jenv.js';

export class JenvGlobalParameter extends StatefulParameter<JenvConfig, string>{

  constructor() {
    super({
      // The current version number must be at least as specific as the desired one. Ex: 3.12.9 = 3.12 but 3 != 3.12
      isEqual: (desired: string, current: string) => current.includes(desired)
    });
  }

  async refresh(): Promise<null | string> {
    const { data, status } = await codifySpawn('jenv global', { throws: false })

    if (status === SpawnStatus.ERROR) {
      return null;
    }

    return data;
  }

  async applyAdd(valueToAdd: string): Promise<void> {
    await codifySpawn(`jenv global ${valueToAdd}`)
  }

  async applyModify(newValue: string): Promise<void> {
    await codifySpawn(`jenv global ${newValue}`)
  }

  async applyRemove(): Promise<void> {
    await codifySpawn('jenv global system')
  }
}
