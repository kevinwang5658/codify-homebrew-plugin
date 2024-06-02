import { ArrayStatefulParameter, Plan } from 'codify-plugin-lib';

import { codifySpawn, SpawnStatus } from '../../../utils/codify-spawn.js';
import { NvmConfig } from './nvm.js';

export class NvmNodeVersionsParameter extends ArrayStatefulParameter<NvmConfig, string> {
  async refresh(desired: null | string[]): Promise<null | string[]> {

    // Desired values are provided, then use nvm which to match the desired values to existing installed versions. The
    // reason behind this is that nvm does special version matching that we do not want to replicate. For ex: desired 18
    // will match to 18.20.2. lts would match to the latest lts, etc...
    const matchedVersions = desired
      ? await Promise.all(desired.map(async (desiredVersion) => {
        const { data, status } = await codifySpawn(`nvm which ${desiredVersion}`, { throws: false });
        if (status === SpawnStatus.ERROR) {
          return null;
        }

        return desiredVersion;
      }))
      : [];

    // TODO: Add this when stateful parameters get implemented. Otherwise this is un-needed.
    // Get all values from nvm. This way we know what is not desired but still installed.
    // const { status, data } = await codifySpawn('nvm ls --no-colors --no-alias')
    // if (status === SpawnStatus.ERROR) {
    //   return null;
    // }
    //
    // const parsedLs = this.parseLsOutput(data);

    return matchedVersions.filter(Boolean) as string[];
  }

  async applyAddItem(version: string, plan: Plan<NvmConfig>): Promise<void> {
    await codifySpawn(`nvm install ${version}`);
  }

  async applyRemoveItem(version: string, plan: Plan<NvmConfig>): Promise<void> {
    await codifySpawn(`nvm uninstall ${version}`);
  }

  // private parseLsOutput(output: string): string[] {
  //   return output.split('\n')
  //     .map((l) => {
  //       return l
  //         ?.trim()
  //         ?.replace('default', '') // Remove word default
  //         ?.replace(/\(.*\)/g, '') // Remove brackets and anything inside
  //         ?.replaceAll(/\r*->v/g, '') // Replace characters ->v and spaces
  //         ?.trim() ?? null;
  //     })
  //     .filter(Boolean)
  // }
}
