import { ValidateFunction } from 'ajv';
import Ajv2020 from 'ajv/dist/2020.js';
import { ParameterChange, Plan, Resource, SpawnStatus } from 'codify-plugin-lib';
import { ResourceConfig, ResourceOperation, ResourceSchema } from 'codify-schemas';
import * as fs from 'node:fs/promises';
import path from 'node:path';

import { untildify } from '../../utils/untildify.js';
import { CasksParameter } from './casks-parameter.js'
import { FormulaeParameter } from './formulae-parameter.js';
import mainResourceSchema from './main-schema.json'
import { codifySpawn } from '../../utils/codify-spawn.js';

export interface HomebrewConfig extends ResourceConfig {
  casks?: string[],
  directory?: string,
  formulae?: string[],
}

export class HomebrewMainResource extends Resource<HomebrewConfig> {
  private ajv = new Ajv2020.default({
    strict: true,
  })

  private readonly configValidator: ValidateFunction;

  constructor() {
    super();
    this.registerStatefulParameter(new FormulaeParameter())
    this.registerStatefulParameter(new CasksParameter())

    this.ajv.addSchema(ResourceSchema);
    this.configValidator = this.ajv.compile(mainResourceSchema);
  }

  getTypeId(): string {
    return 'homebrew';
  }

  async validate(config: unknown): Promise<string[] | undefined> {
    const isValid = this.configValidator(config);
    if (!isValid) {
      return this.configValidator.errors
        ?.map((e) => e.message)
        .filter(Boolean) as string[];
    }

    const homebrewConfig = config as HomebrewConfig;

    if (homebrewConfig.directory) {
      const dir = homebrewConfig.directory
      const isDirectory = await this.dirExists(dir)
        ? (await fs.lstat(dir)).isDirectory()
        : true

      if (!path.isAbsolute(homebrewConfig.directory) || !isDirectory) {
        return [`HomebrewConfig directory ${dir} does not exist`]
      }
    }

    return undefined
  }

  async getCurrentConfig(desiredConfig: HomebrewConfig): Promise<HomebrewConfig | null> {
    const homebrewInfo = await codifySpawn('brew config', [], { throws: false });
    if (homebrewInfo.status === SpawnStatus.ERROR) {
      return null;
    }

    const currentConfig: HomebrewConfig = { type: this.getTypeId() }
    if (desiredConfig.directory) {
      const desiredLocation = untildify(desiredConfig.directory);
      const currentInstallLocation = this.getCurrentLocation(homebrewInfo.data);

      currentConfig.directory = (currentInstallLocation && path.resolve(currentInstallLocation) === path.resolve(desiredLocation))
        ? desiredConfig.directory
        : currentInstallLocation;
    }

    return currentConfig
  }

  calculateOperation(change: ParameterChange): ResourceOperation.MODIFY | ResourceOperation.RECREATE {
    return ResourceOperation.RECREATE
  }

  async applyCreate(plan: Plan<HomebrewConfig>): Promise<void> {
    if (!(await this.isXcodeSelectInstalled())) {
      console.log('Installing xcode select')
      await codifySpawn('xcode-select --install')
    }

    if (plan.resourceConfig.directory) {
      return this.installBrewInCustomDir(plan.resourceConfig.directory)
    }

    await codifySpawn('NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"')
    await codifySpawn('(echo; echo \'eval "$(/opt/homebrew/bin/brew shellenv)"\') >> /Users/$USER/.zshenv'); // TODO: may need to support non zsh shells here

    // Set env variables in the current process for downstream commands to work properly
    // The child processes spawned by node can't set environment variables on the parent
    // This command only works when called from bash or sh
    const brewEnvVars = await codifySpawn('/opt/homebrew/bin/brew shellenv', [], { shell: 'sh' })
    this.setEnvVarFromBrewResponse(brewEnvVars.data)

    // TODO: Add a check here to see if homebrew is writable
    //  Either add a warning or a parameter to edit the permissions on /opt/homebrew
  }

  async applyDestroy(plan: Plan<HomebrewConfig>): Promise<void> {
    const homebrewInfo = await codifySpawn('brew config');
    const homebrewDirectory = this.getCurrentLocation(homebrewInfo.data)

    if (homebrewDirectory === '/opt/homebrew') {
      await codifySpawn(
        'NONINTERACTIVE=1 /bin/bash -c "$(/usr/bin/curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/uninstall.sh)"',
        [],
        { throws: false }
      )
    }

    await codifySpawn(`sudo rm -rf ${homebrewDirectory}`, []);

    // Delete eval from .zshenv
    const zshEnvLocation = `${process.env.HOME}/.zshenv`
    const zshEnvFile = await fs.readFile(zshEnvLocation)
    const editedZshEnvFile = zshEnvFile.toString().replace(`eval "$(${homebrewDirectory}/bin/brew shellenv)"`, '')
    await fs.writeFile(zshEnvLocation, editedZshEnvFile)
  }

  async applyModify(plan: Plan<HomebrewConfig>): Promise<void> {
  }

  async applyRecreate(plan: Plan<HomebrewConfig>): Promise<void> {
  }

  private async isXcodeSelectInstalled(): Promise<boolean> {
    // 2 if not installed 0 if installed
    const xcodeSelectCheck = await codifySpawn('xcode-select -p 1>/dev/null;echo $?') // TODO: Fix this because it's buggy
    return xcodeSelectCheck.data ? Number.parseInt(xcodeSelectCheck.data) === 0 : false;
  }

  private async dirExists(dir: string): Promise<boolean> {
    try {
      await fs.access(dir)
      return true;
    } catch {
      return false;
    }
  }

  private async installBrewInCustomDir(dir: string): Promise<void> {
    const absoluteDir = path.resolve(untildify(dir))

    try {
      await fs.access(absoluteDir)
    } catch {
      await codifySpawn(`mkdir ${absoluteDir}`)
    }

    // Un-tar brew in a custom dir: https://github.com/Homebrew/brew/blob/664d0c67d5947605c914c4c56ebcfaa80cb6eca0/docs/Installation.md#untar-anywhere
    // the local where brew is first activated is where it will be installed
    await codifySpawn('curl -L https://github.com/Homebrew/brew/tarball/master | tar xz --strip 1', [], { cwd: absoluteDir })
    await codifySpawn('./brew config', [], { cwd: path.join(absoluteDir, '/bin') })

    // Set env variables in the current process for downstream commands to work properly
    // The child processes spawned by node can't set environment variables on the parent
    await codifySpawn(`(echo; echo 'eval "$(${absoluteDir}/bin/brew shellenv)"') >> /Users/$USER/.zshenv`);

    // This command only works when called from bash or sh
    const brewEnvVars = await codifySpawn(`${absoluteDir}/bin/brew shellenv`, [], { cwd: absoluteDir, shell: 'sh' })
    this.setEnvVarFromBrewResponse(brewEnvVars.data)
  }

  // Ex:
  // export HOMEBREW_PREFIX="/Users/Personal/homebrew";
  // export HOMEBREW_CELLAR="/Users/Personal/homebrew/Cellar";
  // export HOMEBREW_REPOSITORY="/Users/Personal/homebrew";
  // ...
  private async setEnvVarFromBrewResponse(response: string): Promise<void> {
    const separatedLines = response.split('\n')
          .filter(Boolean)
          .map((x) => x.split(' ')[1])
//    for (const line of separatedLines) {
//      await codifySpawn(line);
//    }


//
    for (const x of separatedLines) {
      const [key, value] = x.split('=')
      const cleanedValue = value.replace(';', '');
      const resolvedValue = await codifySpawn(`echo ${cleanedValue}`);
      process.env[key] = resolvedValue.data.replace('\n', '');
    }
  }

  // Ex:
  // HOMEBREW_VERSION: 4.2.9-114-ge9cb65b
  // ORIGIN: https://github.com/Homebrew/brew
  private getCurrentLocation(homebrewInfo: string) {
    const homebrewPrefix = homebrewInfo.split('\n')
      .find((x) => x.includes('HOMEBREW_PREFIX'))
    if (!homebrewPrefix) {
      throw new Error(`Homebrew prefix not found in config \n${homebrewInfo}`)
    }

    return homebrewPrefix.split(':')[1].trim()
  }
}
