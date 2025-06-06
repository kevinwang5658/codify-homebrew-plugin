import { CreatePlan, getPty, Resource, ResourceSettings, SpawnStatus } from 'codify-plugin-lib';
import { ResourceConfig } from 'codify-schemas';
import * as fsSync from 'node:fs';
import * as fs from 'node:fs/promises';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import { codifySpawn } from '../../utils/codify-spawn.js';
import { FileUtils } from '../../utils/file-utils.js';
import { untildify } from '../../utils/untildify.js';
import { CasksParameter } from './casks-parameter.js'
import { FormulaeParameter } from './formulae-parameter.js';
import HomebrewSchema from './homebrew-schema.json'
import { TapsParameter } from './tap-parameter.js';

const SUDO_ASKPASS_PATH = '~/Library/Caches/codify/homebrew/sudo_prompt.sh'

export interface HomebrewConfig extends ResourceConfig {
  casks?: string[];
  directory?: string;
  formulae?: string[];
  taps?: string[];
  skipAlreadyInstalledCasks: boolean;
  onlyPlanUserInstalled: boolean
}

export class HomebrewResource extends Resource<HomebrewConfig> {

  override getSettings(): ResourceSettings<HomebrewConfig> {
    return {
      schema: HomebrewSchema,
      id: 'homebrew',
      parameterSettings: {
        taps: { type: 'stateful', definition: new TapsParameter(), order: 1 },
        formulae: { type: 'stateful', definition: new FormulaeParameter(), order: 2 },
        casks: { type: 'stateful', definition: new CasksParameter(), order: 3 },
        directory: { type: 'directory' },
        skipAlreadyInstalledCasks: { type: 'boolean', default: true, setting: true },
        onlyPlanUserInstalled: { type: 'boolean', default: true, setting: true },
      }
    };
  }

  override async refresh(parameters: Partial<HomebrewConfig>): Promise<Partial<HomebrewConfig> | null> {
    const $ = getPty();

    const homebrewInfo = await $.spawnSafe('brew config');
    if (homebrewInfo.status === SpawnStatus.ERROR) {
      return null;
    }

    const result: Partial<HomebrewConfig> = {}
    if (parameters.directory) {
      result.directory = this.getCurrentLocation(homebrewInfo.data);
    }

    return result;
  }

  override async create(plan: CreatePlan<HomebrewConfig>): Promise<void> {
    await this.saveSudoAskpassIfNotExists();

    if (plan.desiredConfig.directory) {
      return this.installBrewInCustomDir(plan.desiredConfig.directory)
    }

    await codifySpawn(`SUDO_ASKPASS=${SUDO_ASKPASS_PATH} NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`, { requestsTTY: true })
    await codifySpawn('(echo; echo \'eval "$(/opt/homebrew/bin/brew shellenv)"\') >> /Users/$USER/.zshrc'); // TODO: may need to support non zsh shells here

    // TODO: Add a check here to see if homebrew is writable
    //  Either add a warning or a parameter to edit the permissions on /opt/homebrew
  }

  override async destroy(): Promise<void> {
    const homebrewInfo = await codifySpawn('brew config');
    const homebrewDirectory = this.getCurrentLocation(homebrewInfo.data)

    if (homebrewDirectory === '/opt/homebrew') {
      await codifySpawn(
        `SUDO_ASKPASS=${SUDO_ASKPASS_PATH} NONINTERACTIVE=1 /bin/bash -c "$(/usr/bin/curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/uninstall.sh)"`,
        { throws: false, requestsTTY: true }
      )
    }

    await codifySpawn(`sudo rm -rf ${homebrewDirectory}`);

    // Delete eval from .zshrc
    await FileUtils.removeLineFromZshrc(`eval "$(${homebrewDirectory}/bin/brew shellenv)"`)
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
    await codifySpawn(`SUDO_ASKPASS=${SUDO_ASKPASS_PATH} NONINTERACTIVE=1 ./brew config`, { cwd: path.join(absoluteDir, '/bin') })

    // Update shell startup scripts
    await codifySpawn(`(echo; echo 'eval "$(${absoluteDir}/bin/brew shellenv)"') >> /Users/$USER/.zshrc`);
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

  private async saveSudoAskpassIfNotExists(): Promise<void> {
    const fullPath = untildify(SUDO_ASKPASS_PATH);
    const exists = fsSync.existsSync(fullPath)
    if (exists) {
      return;
    }

    await mkdir(path.dirname(fullPath), { recursive: true });
    await codifySpawn(`cat << 'EOF' > ${SUDO_ASKPASS_PATH}
#!/bin/bash    
osascript -e 'display dialog "Enter user password:" default answer "" with hidden answer with icon file "System:Library:Frameworks:SecurityInterface.framework:Versions:A:Resources:Lock_Locked State@2x.png" with title "sudo"'\\
| grep 'text returned:' \\
| sed 's/^.*text returned:\\(.*\\).*$/\\1/'
EOF`);
    await codifySpawn(`chmod +x ${SUDO_ASKPASS_PATH}`);
  }
}
