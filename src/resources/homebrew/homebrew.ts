import { Plan, Resource, SpawnStatus, ValidationResult } from 'codify-plugin-lib';
import { ResourceConfig } from 'codify-schemas';
import * as fs from 'node:fs/promises';
import path from 'node:path';

import { untildify } from '../../utils/untildify.js';
import { CasksParameter } from './casks-parameter.js'
import { FormulaeParameter } from './formulae-parameter.js';
import HomebrewSchema from './homebrew-schema.json'
import { codifySpawn } from '../../utils/codify-spawn.js';
import { TapsParameter } from './tap-parameter.js';

export interface HomebrewConfig extends ResourceConfig {
  casks?: string[],
  directory?: string,
  formulae?: string[],
  taps?: string[],
}

export class HomebrewResource extends Resource<HomebrewConfig> {
  constructor() {
    super({
      type: 'homebrew',
      schema: HomebrewSchema,
      parameterOptions: {
        directory: { isEqual: (a, b) => untildify(a) === untildify(b) },
        taps: { statefulParameter: new TapsParameter(), order: 1 },
        formulae: { statefulParameter: new FormulaeParameter(), order: 2 },
        casks: { statefulParameter: new CasksParameter(), order: 3 },
      }
    });
  }

  async validate(config: unknown): Promise<ValidationResult> {
    const homebrewConfig = config as HomebrewConfig;

    if (homebrewConfig.directory) {
      const dir = homebrewConfig.directory
      const isDirectory = await this.dirExists(dir)
        ? (await fs.lstat(dir)).isDirectory()
        : true

      if (!path.isAbsolute(homebrewConfig.directory) || !isDirectory) {
        return {
          isValid: false,
          errors: [`HomebrewConfig directory ${dir} does not exist`]
        }
      }
    }

    return {
      isValid: true
    }
  }

  async refresh(desired: Map<keyof HomebrewConfig, any>): Promise<Partial<HomebrewConfig> | null> {
    const homebrewInfo = await codifySpawn('brew config', { throws: false });
    if (homebrewInfo.status === SpawnStatus.ERROR) {
      return null;
    }

    const result: Partial<HomebrewConfig> = {}
    if (desired.has('directory')) {
      result.directory = this.getCurrentLocation(homebrewInfo.data);
    }

    return result;
  }

  async applyCreate(plan: Plan<HomebrewConfig>): Promise<void> {
    if (!(await this.isXcodeSelectInstalled())) {
      console.log('Installing xcode select')
      await codifySpawn('xcode-select --install')
    }

    if (plan.desiredConfig.directory) {
      return this.installBrewInCustomDir(plan.desiredConfig.directory)
    }

    await codifySpawn('NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"')
    await codifySpawn('(echo; echo \'eval "$(/opt/homebrew/bin/brew shellenv)"\') >> /Users/$USER/.zshenv'); // TODO: may need to support non zsh shells here

    // TODO: Add a check here to see if homebrew is writable
    //  Either add a warning or a parameter to edit the permissions on /opt/homebrew
  }

  async applyDestroy(plan: Plan<HomebrewConfig>): Promise<void> {
    const homebrewInfo = await codifySpawn('brew config');
    const homebrewDirectory = this.getCurrentLocation(homebrewInfo.data)

    if (homebrewDirectory === '/opt/homebrew') {
      await codifySpawn(
        'NONINTERACTIVE=1 /bin/bash -c "$(/usr/bin/curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/uninstall.sh)"',
        { throws: false }
      )
    }

    await codifySpawn(`sudo rm -rf ${homebrewDirectory}`);

    // Delete eval from .zshenv
    const zshEnvLocation = `${process.env.HOME}/.zshenv`
    const zshEnvFile = await fs.readFile(zshEnvLocation, 'utf8')
    const editedZshEnvFile = zshEnvFile.replace(`eval "$(${homebrewDirectory}/bin/brew shellenv)"`, '')
    await fs.writeFile(zshEnvLocation, editedZshEnvFile)
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
    // the location where brew is first activated is where it will be installed
    await codifySpawn('curl -L https://github.com/Homebrew/brew/tarball/master | tar xz --strip 1', { cwd: absoluteDir })

    // Activate brew to install it in the directory
    await codifySpawn('./brew config', { cwd: path.join(absoluteDir, '/bin') })

    // Update shell startup scripts
    await codifySpawn(`(echo; echo 'eval "$(${absoluteDir}/bin/brew shellenv)"') >> /Users/$USER/.zshenv`);
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
