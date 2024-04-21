import { ParameterChange, Plan, StatefulParameter } from 'codify-plugin-lib';

import { codifySpawn, SpawnStatus } from '../../../utils/codify-spawn.js';
import { PyenvConfig } from './main.js';

export class PythonVersionsParameter extends StatefulParameter<PyenvConfig, 'pythonVersions'> {

  get name(): 'pythonVersions' {
    return 'pythonVersions';
  }

  async getCurrent(desiredValue: PyenvConfig['pythonVersions']): Promise<PyenvConfig['pythonVersions']> {
    const { status, data } = await codifySpawn('pyenv versions --bare')

    if (status === SpawnStatus.ERROR) {
      return undefined;
    }

    const installedVersions = data.split('\n');

    if (!desiredValue) {
      return installedVersions;
    }

    return desiredValue
      .filter((dv) => installedVersions.some((iv) => iv.includes(dv)));
  }

  async applyAdd(parameterChange: ParameterChange, plan: Plan<PyenvConfig>): Promise<void> {
    const versionsToInstall = parameterChange.newValue

    for (const version of versionsToInstall) {
      await codifySpawn(`pyenv install ${version}`)
    }
  }

  async applyModify(parameterChange: ParameterChange, plan: Plan<PyenvConfig>): Promise<void> {
    const newVersions = (parameterChange.newValue ?? [] ) as string[];
    const previousVersions = (parameterChange.previousValue ?? []) as string[];

    const versionsToInstall = newVersions.filter((x) => !previousVersions.includes(x))
    for (const version of versionsToInstall) {
      await codifySpawn(`pyenv install ${version}`);
    }

    const versionsToUninstall = previousVersions.filter((x) => !newVersions.includes(x))
    for (const version of versionsToUninstall) {
      await codifySpawn(`pyenv uninstall ${version}`);
    }
  }

  async applyRemove(parameterChange: ParameterChange, plan: Plan<PyenvConfig>): Promise<void> {
    const versionsToUninstall = parameterChange.previousValue;
    for (const version of versionsToUninstall) {
      await codifySpawn(`pyenv uninstall ${version}`);
    }
  }
}
