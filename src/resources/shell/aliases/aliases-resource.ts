import {
  CreatePlan,
  DestroyPlan,
  ModifyPlan,
  ParameterChange,
  RefreshContext,
  Resource,
  ResourceSettings,
  SpawnStatus,
  getPty,
  z
} from 'codify-plugin-lib';
import { OS } from 'codify-schemas';
import fs from 'node:fs/promises';

import { FileUtils } from '../../../utils/file-utils.js';
import { Utils } from '../../../utils/index.js';

const ALIAS_REGEX = /^'?([^=]+?)'?='?(.*?)'?$/

export const schema = z.object({
  aliases: z
    .array(z.object({
      alias: z.string(),
      value: z.string(),
    }))
    .describe('Aliases to create')
    .optional(),
})

export type AliasesConfig = z.infer<typeof schema>;
export class AliasesResource extends Resource<AliasesConfig> {
  getSettings(): ResourceSettings<AliasesConfig> {
    return {
      id: 'aliases',
      operatingSystems: [OS.Darwin, OS.Linux],
      schema,
      parameterSettings: {
        aliases: {
          type: 'array',
          itemType: 'object',
          isElementEqual: (a, b) => a.alias === b.alias && a.value === b.value,
          filterInStatelessMode: (desired, current) =>
            current.filter((c) => desired.some((d) => d.alias === c.alias)),
          canModify: true,
        }
      },
      importAndDestroy: {
        requiredParameters: ['aliases'],
      },
      allowMultiple: {
        identifyingParameters: ['alias'],
      },
    }
  }

  override async refresh(parameters: any, context: RefreshContext<AliasesConfig>): Promise<Partial<AliasesConfig> | null> {
    const $ = getPty();

    const { data, status } = await $.spawnSafe('alias', { interactive: true });

    console.log('Data', data);

    if (status === SpawnStatus.ERROR) {
      return null;
    }

    const aliases = data.split(/\n/g)
      .map((l) => l.trim())
      .map((l) => l.match(ALIAS_REGEX))
      .filter(Boolean)
      .map((m) => (m ? { alias: m[1], value: m[2] } : null))
      .filter(Boolean) as Array<{ alias: string; value: string }>;

    console.log('Command type', context.commandType);
    console.log('Aliases', aliases);

    // If validation plan and no aliases match, return null
    if (context.commandType === 'validationPlan'
      && aliases.filter((a) =>
        context.originalDesiredConfig?.aliases?.some((d) => d.alias === a.alias)).length === 0
    ) {
      return null;
    }

    if (!aliases || aliases.length === 0) {
      return null;
    }

    return {
      aliases,
    }
  }

  override async create(plan: CreatePlan<AliasesConfig>): Promise<void> {
    const shellRcPath = Utils.getPrimaryShellRc();

    if (!(await FileUtils.fileExists(shellRcPath))) {
      await fs.writeFile(shellRcPath, '', { encoding: 'utf8' });
    }

    await this.addAliases(plan.desiredConfig.aliases ?? []);
  }

  async modify(pc: ParameterChange<AliasesConfig>, plan: ModifyPlan<AliasesConfig>): Promise<void> {
    const shellRcPath = Utils.getPrimaryShellRc();

    if (!(await FileUtils.fileExists(shellRcPath))) {
      await fs.writeFile(shellRcPath, '', { encoding: 'utf8' });
    }

    const { isStateful } = plan;
    if (isStateful) {
      const aliasesToRemove = pc.previousValue
        ?.filter((a) => !pc.newValue?.some((c) => c.alias === a.alias)
          || pc.newValue?.some((c) => c.alias === a.alias && c.value !== a.value)
        );
      const aliasesToAdd = pc.newValue
        ?.filter((a) => !pc.previousValue?.some((c) => c.alias === a.alias));

      await this.removeAliases(aliasesToRemove);
      await this.addAliases(aliasesToAdd);
    } else {
      const aliasesToRemove = pc.previousValue
        ?.filter((a) => pc.newValue?.some((c) => c.alias === a.alias && c.value !== a.value));

      const aliasesToAdd = pc.newValue
        ?.filter((a) => !pc.previousValue?.some((c) => c.alias === a.alias)
        || pc.previousValue?.some((c) => c.alias === a.alias && c.value !== a.value));

      console.log('Aliases to add', aliasesToAdd);

      await this.removeAliases(aliasesToRemove);
      await this.addAliases(aliasesToAdd);
    }
  }

  async destroy(plan: DestroyPlan<AliasesConfig>): Promise<void> {
    console.log(plan.currentConfig.aliases);
    await this.removeAliases(plan.currentConfig.aliases ?? []);
  }

  private async findAlias(alias: string, value: string): Promise<{ path: string; contents: string; } | null> {
    const paths = Utils.getShellRcFiles();

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

  private async removeAliases(aliasesToRemove: Array<{ alias: string; value: string }>): Promise<void> {
    for (const { alias, value } of aliasesToRemove ?? []) {
      const aliasInfo = await this.findAlias(alias, value);
      if (!aliasInfo) {
        console.warn(`Unable to find alias: ${alias} on the system. Codify isn't able to search all locations on the system. Please delete the alias manually and re-run Codify.`);
        continue;
      }

      const aliasString = this.aliasString(alias, value);
      const aliasStringShort = this.aliasStringShort(alias, value);

      await FileUtils.removeLineFromFile(aliasInfo.path, aliasString);
      await FileUtils.removeLineFromFile(aliasInfo.path, aliasStringShort);
    }
  }

  private async addAliases(aliasesToAdd: Array<{ alias: string; value: string }>): Promise<void> {
    for (const { alias, value } of aliasesToAdd ?? []) {
      const aliasString = this.aliasString(alias, value);
      await FileUtils.addToStartupFile(aliasString);
    }
  }
}


