import { ArrayStatefulParameter } from 'codify-plugin-lib';

import { SpawnStatus, codifySpawn } from '../../../utils/codify-spawn.js';
import { Utils } from '../../../utils/index.js';
import { JenvConfig } from './jenv.js';

export const OPENJDK_SUPPORTED_VERSIONS = [8, 11, 17, 21, 22]
export const JAVA_VERSION_INTEGER = /^\d+$/;

export class JenvAddParameter extends ArrayStatefulParameter<JenvConfig, string> {
  async refresh(desired: null | string[]): Promise<null | string[]> {
    const { data } = await codifySpawn('jenv versions')

    /** Example:
     *   system
     * * 17 (set by /Users/kevinwang/.jenv/version)
     *   17.0
     *   17.0.11
     *   openjdk64-17.0.11
     */
    const versions = new Set(
      data
        .split(/\n/)
        // Regex to split out the version part
        .map((v) => this.getFirstRegexGroup(/^[ *] ([\d.A-Za-z-]+)[ \\n]?/g, v))
    );

    return desired
      ?.filter((v) => versions.has(v))
      ?.filter(Boolean) ?? null;
  }

  async applyAddItem(param: string): Promise<void> {
    
    const isHomebrewInstalled = await Utils.isHomebrewInstalled();
    
    // Add special handling if the user specified an integer version. We add special functionality to automatically 
    // install java if a lts version is specified and homebrew is installed.
    if (JAVA_VERSION_INTEGER.test(param)) {
      if (!isHomebrewInstalled) {
        throw new Error('Homebrew not detected. Cannot automatically install java version. Jenv does not automatically install' +
          ' java versions, see the jenv docs: https://www.jenv.be. Please manually install a version of java and provide a path to the jenv resource')
      }
      
      const parsedVersion = Number.parseInt(param, 10);
      if (!OPENJDK_SUPPORTED_VERSIONS.includes(parsedVersion)) {
        throw new Error(`Unsupported version of java specified. Only [${OPENJDK_SUPPORTED_VERSIONS.join(', ')}] is supported`)
      }

      const openjdkName = (parsedVersion === 22) ? 'openjdk' : `openjdk@${param}`;
      const { status } = await codifySpawn(`brew list --formula -1 ${openjdkName}`, { throws: false });

      // That version is not currently installed with homebrew. Let's install it
      if (status === SpawnStatus.ERROR) {
        console.log(`Homebrew detected. Attempting to install java version ${openjdkName} automatically using homebrew`)
        await codifySpawn(`brew install ${openjdkName}`)
      }

      const location = await this.getHomebrewInstallLocation(openjdkName);
      if (!location) {
        throw new Error('Unable to determine location of jdk installed by homebrew. Please report this to the Codify team');
      }

      await codifySpawn(`jenv add ${location}`)

      return;
    }

    await codifySpawn(`jenv add ${param}`);
  }

  async applyRemoveItem(param: string): Promise<void> {
    const isHomebrewInstalled = await Utils.isHomebrewInstalled();

    if (JAVA_VERSION_INTEGER.test(param) && isHomebrewInstalled) {
      const parsedVersion = Number.parseInt(param, 10);
      const openjdkName = (parsedVersion === 22) ? 'openjdk' : `openjdk@${param}`;
      
      const location = await this.getHomebrewInstallLocation(openjdkName);
      if (location) {
        await codifySpawn(`jenv remove ${location}`)
        await codifySpawn(`brew uninstall ${openjdkName}`)
      }
      
      return
    }

    await codifySpawn(`jenv uninstall ${param}`);
  }

  private async getHomebrewInstallLocation(openjdkName: string): Promise<string | null> {
    const { data: installInfo } = await codifySpawn(`brew list --formula -1 ${openjdkName}`)

    // Example: /opt/homebrew/Cellar/openjdk@17/17.0.11/libexec/
    const libexec = installInfo
      .split(/\n/)
      .find((l) => l.includes('libexec'))
      ?.split('openjdk.jdk/')
      ?.at(0)

    if (!libexec) {
      return null;
    }

    return libexec + 'openjdk.jdk/Contents/Home';
  }

  private getFirstRegexGroup(regexp: RegExp, str: string): null | string {
    return Array.from(str.matchAll(regexp), m => m[1])?.at(0) ?? null;
  }
}
