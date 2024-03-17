import { ParameterChange, Plan, Resource, SpawnStatus, codifySpawn } from 'codify-plugin-lib';
import { ResourceConfig, ResourceOperation } from 'codify-schemas';

import { PyenvGlobalParameter } from './global-parameter.js';

export interface PyenvConfig extends ResourceConfig {
  pythonVersions?: string[],
  global?: string,
}

export class PyenvResource extends Resource<PyenvConfig> {

  constructor() {
    super();

    this.registerStatefulParameter(new PyenvGlobalParameter())
  }

  getTypeId(): string {
    return 'pyenv';
  }

  async validate(config: unknown): Promise<boolean> {
    return true;
  }

  async getCurrentConfig(desiredConfig: PyenvConfig): Promise<PyenvConfig | null> {
    const pyenvVersion = await codifySpawn('pyenv --version', [], { throws: false })
    if (pyenvVersion.status === SpawnStatus.ERROR) {
      return null
    }

    return { type: this.getTypeId() }
  }

  calculateOperation(change: ParameterChange): ResourceOperation.MODIFY | ResourceOperation.RECREATE {
    return ResourceOperation.RECREATE
  }


  async applyCreate(plan: Plan<PyenvConfig>): Promise<void> {
    await codifySpawn('curl https://pyenv.run | bash')

    // Add startup script
    // TODO: Need to support bash in addition to zsh here
    await codifySpawn('echo \'export PYENV_ROOT="$HOME/.pyenv"\' >> ~/.zshrc')
    await codifySpawn('echo \'[[ -d $PYENV_ROOT/bin ]] && export PATH="$PYENV_ROOT/bin:$PATH"\' >> ~/.zshrc')
    await codifySpawn('echo \'eval "$(pyenv init -)"\' >> ~/.zshrc')
  }

  async applyDestroy(plan: Plan<PyenvConfig>): Promise<void> {
    await codifySpawn('rm -rf $(pyenv root)')
  }

  async applyModify(plan: Plan<PyenvConfig>): Promise<void> {
  }

  async applyRecreate(plan: Plan<PyenvConfig>): Promise<void> {
  }

}
