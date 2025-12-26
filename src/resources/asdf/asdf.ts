import { CreatePlan, DestroyPlan, Resource, ResourceSettings, SpawnStatus, getPty, FileUtils } from 'codify-plugin-lib';
import { OS, ResourceConfig } from 'codify-schemas';
import fs from 'node:fs/promises';
import os, { homedir } from 'node:os';
import path from 'node:path';

import { Utils } from '../../utils/index.js';
import AsdfSchema from './asdf-schema.json';
import { AsdfPluginsParameter } from './plugins-parameter.js';

export interface AsdfConfig extends ResourceConfig {
  plugins: string[];
}

export class AsdfResource extends Resource<AsdfConfig> {
    getSettings(): ResourceSettings<AsdfConfig> {
      return {
        id: 'asdf',
        operatingSystems: [OS.Darwin, OS.Linux],
        schema: AsdfSchema,
        parameterSettings: {
          plugins: { type: 'stateful', definition: new AsdfPluginsParameter() },
        }
      }
    }

    async refresh(parameters: Partial<AsdfConfig>): Promise<Partial<AsdfConfig> | Partial<AsdfConfig>[] | null> {
      const $ = getPty();

      const { status } = await $.spawnSafe('which asdf');
      return status === SpawnStatus.SUCCESS ? {} : null;
    }

    async create(plan: CreatePlan<AsdfConfig>): Promise<void> {
      const $ = getPty();

      if (Utils.isMacOS()) {
        if (!(await Utils.isHomebrewInstalled())) {
          throw new Error('Homebrew is not installed. Please install Homebrew before installing asdf.');
        }

        await $.spawn('brew install asdf', { interactive: true, env: { HOMEBREW_NO_AUTO_UPDATE: 1 } });

      }

      if (Utils.isLinux()) {
        const { data: latestVersion } = await $.spawn('curl -s https://api.github.com/repos/asdf-vm/asdf/releases/latest | grep \'"tag_name":\' | sed -E \'s/.*"([^"]+)".*/\\1/\'');

        // Create .asdf directory if it doesn't exist
        const asdfDir = path.join(os.homedir(), '.local', 'bin');
        await fs.mkdir(asdfDir, { recursive: true });
        const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codify-asdf'));
        const arch = Utils.isLinux() ? 'amd64' : 'arm64';

        // Download and extract asdf
        await $.spawn(`curl -Lo ${tmpDir}/asdf.tar.gz "https://github.com/asdf-vm/asdf/releases/download/${latestVersion}/asdf-${latestVersion}-linux-${arch}.tar.gz"`, { cwd: tmpDir });
        console.log(await $.spawn('ls -la', { cwd: tmpDir }));
        await $.spawn(`tar -xzf ${tmpDir}/asdf.tar.gz -C ${asdfDir}`, { cwd: tmpDir });
        await fs.chmod(path.join(asdfDir, 'asdf'), 0o755);

        await fs.rm(tmpDir, { recursive: true, force: true });
      }

      await FileUtils.addPathToShellRc(path.join(os.homedir(), '.local', 'bin'), true);
      // eslint-disable-next-line no-template-curly-in-string
      await FileUtils.addToShellRc('export PATH="${ASDF_DATA_DIR:-$HOME/.asdf}/shims:$PATH"')

      // TODO: Add filtering to resources for operating systems
      // os parameter
      // TODO: Move all utils to codify-plugin-lib
      // TODO: Move OsUtils to a separate name space? All things that have to do with the os.
      // TODO: Add a way to run multiple commands in sequence
      // TODO: Add a easier way to make sure path is on the path
      // TODO: Change all plugins to install to ~/.local/bin

      await $.spawnSafe('which asdf', { interactive: true });
      await $.spawnSafe('ls ~/.local/bin');
      console.log((await $.spawnSafe('echo $PATH', { interactive: true })).data);

    }

    async destroy(): Promise<void> {
      const $ = getPty();

      const asdfDir = (await $.spawn('which asdf', { interactive: true })).data;
      if (Utils.isMacOS() && asdfDir.includes('homebrew')) {
        if (!(await Utils.isHomebrewInstalled())) {
          return;
        }

        await $.spawn('brew uninstall asdf', { interactive: true, env: { HOMEBREW_NO_AUTO_UPDATE: 1 } });
      } else {
        await fs.rm(asdfDir, { recursive: true, force: true });
      }

      // eslint-disable-next-line no-template-curly-in-string
      await FileUtils.removeLineFromShellRc('export PATH="${ASDF_DATA_DIR:-$HOME/.asdf}/shims:$PATH"')
      await fs.rm(path.join(os.homedir(), '.asdf'), { recursive: true, force: true });
    }

}
