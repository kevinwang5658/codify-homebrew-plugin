import { CreatePlan, DestroyPlan, ModifyPlan, ParameterChange, Resource, ResourceSettings } from 'codify-plugin-lib';
import { StringIndexedObject } from 'codify-schemas';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { SpawnStatus, codifySpawn } from '../../../utils/codify-spawn.js';
import { FileUtils } from '../../../utils/file-utils.js';
import { Utils } from '../../../utils/index.js';
import Schema from './alias-schema.json';

export interface AliasConfig extends StringIndexedObject {
  alias: string;
  value: string;
}

export class AliasResource extends Resource<AliasConfig> {
  getSettings(): ResourceSettings<AliasConfig> {
    return {
      id: 'alias',
      schema: Schema,
      parameterSettings: {
        value: { canModify: true }
      },
    }
  }

  override async refresh(parameters: Partial<AliasConfig>): Promise<Partial<AliasConfig> | null> {
    const { alias: desired } = parameters;

    const { data, status } = await codifySpawn(`alias ${desired}`, { throws: false })

    if (status === SpawnStatus.ERROR) {
      return null;
    }

    const matchedAlias = data.split(/\n/g)
      .find((l) => {
        const [name] = l.split('=');
        return name === desired;
      });

    if (!matchedAlias) {
      return null;
    }

    const [name, value] = matchedAlias.split('=');

    let processedValue = value.trim()
    if ((processedValue.startsWith('\'') && processedValue.endsWith('\'')) || (processedValue.startsWith('"') && processedValue.endsWith('"'))) {
      processedValue = processedValue.slice(1, -1)
    }

    return {
      alias: name,
      value: processedValue,
    }
  }

  override async create(plan: CreatePlan<AliasConfig>): Promise<void> {
    const zshrcPath = path.join(os.homedir(), '.zshrc');

    if (!(await FileUtils.fileExists(zshrcPath))) {
      await fs.writeFile(zshrcPath, '', { encoding: 'utf8' });
    }

    const { alias, value } = plan.desiredConfig;
    const aliasString = this.aliasString(alias, value);

    const file = await fs.readFile(zshrcPath, 'utf8');
    const fileWithAlias = FileUtils.appendToFileWithSpacing(file, aliasString);

    await fs.writeFile(zshrcPath, fileWithAlias, { encoding: 'utf8' });
  }

  async modify(pc: ParameterChange<AliasConfig>, plan: ModifyPlan<AliasConfig>): Promise<void> {
    if (pc.name !== 'value') {
      return;
    }

    const { alias, value } = plan.currentConfig;
    const aliasInfo = await this.findAlias(alias, value);
    if (!aliasInfo) {
      throw new Error(`Unable to find alias: ${alias} on the system. Codify isn't able to search all locations on the system. Please delete the alias manually and re-run Codify.`);
    }

    const aliasString = this.aliasString(alias, value);
    const aliasStringShort = this.aliasStringShort(alias, value);

    const lines = aliasInfo.contents.trimEnd().split(/\n/)

    const aliasLineNum = lines
      .findIndex((l) => l.trim() === aliasStringShort || l.trim() === aliasString);
    if (aliasLineNum === -1) {
      throw new Error(`Unable to modify Alias. Cannot find line ${aliasString} in ${aliasInfo.path}. Please delete the alias manually and re-run Codify.`);
    }
    
    const newAlias = this.aliasString(plan.desiredConfig.alias, plan.desiredConfig.value);
    lines.splice(aliasLineNum, 1, newAlias);
    
    await fs.writeFile(aliasInfo.path, lines.join('\n'), 'utf8');
  }

  async destroy(plan: DestroyPlan<AliasConfig>): Promise<void> {
    const { alias, value } = plan.currentConfig;
    const aliasInfo = await this.findAlias(alias, value);
    if (!aliasInfo) {
      throw new Error(`Unable to find alias: ${alias} on the system. Codify isn't able to search all locations on the system. Please delete the alias manually and re-run Codify.`);
    }

    const aliasString = this.aliasString(alias, value);
    const aliasStringShort = this.aliasStringShort(alias, value);
    
    await FileUtils.removeLineFromFile(aliasInfo.path, aliasString);
    await FileUtils.removeLineFromFile(aliasInfo.path, aliasStringShort);
  }

  private async findAlias(alias: string, value: string): Promise<{ path: string; contents: string; } | null> {
    const paths = [
      path.join(os.homedir(), '.zshrc'),
      path.join(os.homedir(), '.zprofile'),
      path.join(os.homedir(), '.zshenv'),
    ];

    const aliasString = this.aliasString(alias, value);
    const aliasStringShort = this.aliasStringShort(alias, value);

    for (const path of paths) {
      if (await FileUtils.fileExists(path)) {
        const fileContents = await fs.readFile(path, 'utf8');

        if (fileContents.includes(aliasString) || fileContents.includes(aliasStringShort)) {
          return {
            path,
            contents: fileContents,
          }
        }
      }
    }

    return null;
  }

  private aliasString(alias: string, value: string): string {
    return `alias ${alias}='${value}'`
  }

  private aliasStringShort(alias: string, value: string): string {
    return `alias ${alias}=${value}`
  }
}
