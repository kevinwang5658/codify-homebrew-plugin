import { CreatePlan, DestroyPlan, RefreshContext, Resource, ResourceSettings, getPty } from 'codify-plugin-lib';
import { OS, ResourceConfig } from 'codify-schemas';

import { Utils } from '../../../utils/index.js';
import schema from './virtualenv-schema.json';

export interface VirtualenvConfig extends ResourceConfig {}

export class Virtualenv extends Resource<VirtualenvConfig> {

  getSettings(): ResourceSettings<VirtualenvConfig> {
    return {
      id: 'virtualenv',
      operatingSystems: [OS.Darwin],
      schema,
      dependencies: ['homebrew'],
    }
  }

  async refresh(parameters: Partial<VirtualenvConfig>): Promise<Partial<VirtualenvConfig> | Partial<VirtualenvConfig>[] | null> {
    const pty = getPty()

    const { status } = await pty.spawnSafe('which virtualenv');
    return status === 'error' ? null : parameters;
  }

  async create(plan: CreatePlan<VirtualenvConfig>): Promise<void> {
    const $ = getPty();

    if (!(await Utils.isHomebrewInstalled())) {
      throw new Error('Homebrew must be installed in order to use the virtualenv resource');
    }

    await $.spawn('brew install virtualenv', { interactive: true, env: { HOMEBREW_NO_AUTO_UPDATE: 1 } });
  }

  async destroy(plan: DestroyPlan<VirtualenvConfig>): Promise<void> {
    const $ = getPty();

    const installLocation = await $.spawn('which virtualenv', { interactive: true });
    if (!installLocation.data.includes('homebrew')) {
      throw new Error('virtualenv resource was installed outside of Codify. Please uninstall manually and re-run Codify');
    }

    await $.spawn('brew uninstall virtualenv', { interactive: true, env: { HOMEBREW_NO_AUTO_UPDATE: 1 } });
  }
}
