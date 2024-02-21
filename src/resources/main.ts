import { codifySpawn, ParameterChange, Plan, Resource, SpawnStatus } from 'codify-plugin-lib';
import { ResourceConfig, ResourceOperation, ResourceSchema } from 'codify-schemas';
import Ajv2020, { ValidateFunction } from 'ajv/dist/2020';
import mainResourceSchema from './main-schema.json'

export interface HomebrewConfig extends ResourceConfig {
  formulae?: string[],
  casks?: string[],
}

export class HomebrewMainResource extends Resource<HomebrewConfig> {
  private ajv = new Ajv2020({
    strict: true,
  })
  private readonly configValidator: ValidateFunction;

  constructor() {
    super();
    this.ajv.addSchema(ResourceSchema);
    this.configValidator = this.ajv.compile(mainResourceSchema);
  }

  getTypeId(): string {
    return 'homebrew';
  }

  async validate(config: unknown): Promise<boolean> {
    return this.configValidator(config);
  }

  async getCurrentConfig(desiredConfig: HomebrewConfig): Promise<HomebrewConfig | null> {
    const homebrewInfo = await codifySpawn('brew config');
    if (homebrewInfo.status === SpawnStatus.ERROR) {
      return null;
    }

    let result: HomebrewConfig = { type: this.getTypeId() };

    if (desiredConfig.formulae) {
      const formulaeQuery = await codifySpawn('brew list --formula -1')
      console.log(formulaeQuery)

      if (formulaeQuery.status === SpawnStatus.SUCCESS && formulaeQuery.data != null) {
        result.formulae = formulaeQuery.data
          .split('\n')
          .filter((x) => desiredConfig.formulae!.find((y) => x === y))
      }
    }

    return result;
  }

  calculateOperation(change: ParameterChange): ResourceOperation.MODIFY | ResourceOperation.RECREATE {
    return ResourceOperation.MODIFY
  }

  async applyCreate(plan: Plan<HomebrewConfig>): Promise<void> {
    if (!(await this.isXcodeSelectInstalled())) {
      console.log('Installing xcode select')
      await codifySpawn('xcode-select --install')
    }

    await codifySpawn('NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"')
    await codifySpawn('(echo; echo \'eval "$(/opt/homebrew/bin/brew shellenv)"\') >> /Users/$USER/.zprofile'); // TODO: may need to support non zsh shells here

    process.env['HOMEBREW_PREFIX'] = '/opt/homebrew';
    process.env['HOMEBREW_CELLAR'] = '/opt/homebrew/Cellar';
    process.env['HOMEBREW_REPOSITORY'] = '/opt/homebrew';
    process.env['PATH'] = `/opt/homebrew/bin:/opt/homebrew/sbin:${process.env['PATH'] ?? ''}`
    process.env['MANPATH'] = `/opt/homebrew/share/man${process.env['MANPATH'] ?? ''}:`
    process.env['INFOPATH'] = `/opt/homebrew/share/info:${process.env['INFOPATH'] ?? ''}`

    if (plan.resourceConfig.formulae) {
      for (const formula of plan.resourceConfig.formulae) {
        await this.createFormula(formula);
      }
    }
  }

  async applyDestroy(plan: Plan<HomebrewConfig>): Promise<void> {
    return Promise.resolve(undefined);
  }

  async applyModify(plan: Plan<HomebrewConfig>): Promise<void> {
    return Promise.resolve(undefined);
  }

  async applyRecreate(plan: Plan<HomebrewConfig>): Promise<void> {
    return Promise.resolve(undefined);
  }

  private async isXcodeSelectInstalled(): Promise<boolean> {
    // 2 if not installed 0 if installed
    const xcodeSelectCheck = await codifySpawn('xcode-select', ['-p', '1>/dev/null;echo', '$?'])
    return xcodeSelectCheck.data ? parseInt(xcodeSelectCheck.data) === 0 : false;
  }

  private async createFormula(name: string): Promise<void> {
    const result = await codifySpawn(`brew install ${name}`)

    if (result.status === SpawnStatus.SUCCESS) {
      console.log(`Installed formula ${name}`);
    } else {
      throw new Error(`Failed to install formula: ${name}. ${result.data}`)
    }
  }

}
