import { StatefulParameter } from 'codify-plugin-lib/dist/entities/stateful-parameter';
import { PyenvConfig } from './main';
import { codifySpawn, ParameterChange, Plan } from 'codify-plugin-lib';

export class PythonVersionsParameter extends StatefulParameter<PyenvConfig, 'pythonVersions'> {

  get name(): 'pythonVersions' {
    return 'pythonVersions';
  }

  async getCurrent(desiredValue: PyenvConfig['pythonVersions']): Promise<PyenvConfig['pythonVersions']> {
    const installedVersions = await codifySpawn('pyenv version-name')
    return installedVersions.data.split('\n');
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
      await codifySpawn(`pyenv install ${version}`)
    }

    const versionsToUninstall = previousVersions.filter((x) => !newVersions.includes(x))
    for (const version of versionsToUninstall) {
      await codifySpawn(`pyenv uninstall ${version}`)
    }
  }

  async applyRemove(parameterChange: ParameterChange, plan: Plan<PyenvConfig>): Promise<void> {
    const versionsToUninstall = parameterChange.previousValue
    for (const version of versionsToUninstall) {
      await codifySpawn(`pyenv uninstall ${version}`)
    }
  }
}