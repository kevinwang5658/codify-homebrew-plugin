import {
  CreatePlan,
  DestroyPlan,
  getPty,
  ModifyPlan,
  ParameterChange,
  Resource,
  ResourceSettings
} from 'codify-plugin-lib';
import { StringIndexedObject } from 'codify-schemas';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { codifySpawn } from '../../../utils/codify-spawn.js';
import { FileUtils } from '../../../utils/file-utils.js';
import { untildify } from '../../../utils/untildify.js';
import Schema from './path-schema.json';
import { Utils } from '../../../utils/index.js';

export interface PathConfig extends StringIndexedObject {
  path: string;
  paths: string[];
  prepend: boolean;
}

export class PathResource extends Resource<PathConfig> {
  getSettings(): ResourceSettings<PathConfig> {
    return {
      id: 'path',
      schema: Schema,
      parameterSettings: {
        path: {
          type: 'directory',
          inputTransformation: (value) => {
            const escapedPath = untildify(value);
            return path.resolve(escapedPath)
          }
        },
        paths: {
          canModify: true,
          type: 'array',
          isElementEqual: 'directory',
          inputTransformation: (values) =>
            values.map((value: string) => {
              const escapedPath = untildify(value);
              return path.resolve(escapedPath)
            }
          )
        },
        prepend: { default: false }
      },
      import: {
        refreshKeys: ['paths'],
        defaultRefreshValues: {
          paths: []
        }
      }
    }
  }

  override async validate(parameters: Partial<PathConfig>): Promise<void> {
    if (parameters.path && parameters.paths) {
      throw new Error('Both path and paths cannot be specified together')
    }
  }

  override async refresh(parameters: Partial<PathConfig>): Promise<Partial<PathConfig> | null> {
    const $ = getPty();

    const { data: existingPaths } = await $.spawnSafe('echo $PATH')
    if (parameters.path && (existingPaths.includes(parameters.path) || existingPaths.includes(untildify(parameters.path)))) {
      return parameters;
    }

    if (parameters.paths) {

      // Only add the paths that are found on the system
      const existingPathsSplit = new Set(existingPaths.split(':')
        .filter(Boolean)
        .map((l) => path.resolve(l.trim())))

      const foundPaths = parameters.paths.filter((p) => existingPathsSplit.has(p));
      if (foundPaths.length === 0) {
        return null;
      }

      return { paths: foundPaths, prepend: parameters.prepend };
    }

    return null;
  }

  override async create(plan: CreatePlan<PathConfig>): Promise<void> {
    const { path, paths, prepend } = plan.desiredConfig;

    if (path) {
      return this.addPath(path, prepend);
    }

    if (paths) {
      for (const path of paths) {
        await this.addPath(path, prepend);
      }

    }
  }

  override async modify(pc: ParameterChange<PathConfig>, plan: ModifyPlan<PathConfig>): Promise<void> {
    if (pc.name !== 'paths') {
      return;
    }
    
    const pathsToAdd = pc.newValue.filter((p: string) => !pc.previousValue.includes(p));
    const pathsToRemove = pc.previousValue.filter((p: string) => !pc.newValue.includes(p));

    for (const path of pathsToAdd) {
      await this.addPath(path, plan.desiredConfig.prepend)
    }
      
    for (const value of pathsToRemove) {
      await this.removePath(value);
    }
  }

  async destroy(plan: DestroyPlan<PathConfig>): Promise<void> {
    if (plan.currentConfig.path) {
      return this.removePath(plan.currentConfig.path);
    }

    if (plan.currentConfig.paths) {
      const { paths } = plan.currentConfig;
      for (const value of paths) {
        await this.removePath(value);
      }
    }
  }

  private async addPath(path: string, prepend = false): Promise<void> {
    // Escaping is done within file utils
    await FileUtils.addPathToZshrc(path, prepend);
  }
  
  private async removePath(pathValue: string): Promise<void> {
    const fileInfo = await this.findPathDeclaration(pathValue);
    if (!fileInfo) {
      throw new Error(`Could not find path declaration: ${pathValue}. Please manually remove the path and then re-run Codify`);
    }

    const { content, pathsFound, filePath } = fileInfo;

    const fileLines = content
      .split(/\n/);

    for (const pathFound of pathsFound) {
      const line = fileLines
        .findIndex((l) => l.includes(pathFound));

      if (line === -1) {
        throw new Error(`Could not find path declaration: ${pathValue}. Please manually remove the path and then re-run Codify`);
      }

      fileLines.splice(line, 1);
    }

    console.log(`Removing path: ${pathValue} from ${filePath}`)
    await fs.writeFile(filePath, fileLines.join('\n'), { encoding: 'utf8' });
  }

  private async findPathDeclaration(value: string): Promise<PathDeclaration | null> {
    const filePaths = [
      path.join(os.homedir(), '.zshrc'),
      path.join(os.homedir(), '.zprofile'),
      path.join(os.homedir(), '.zshenv'),
    ];

    const searchTerms = [
      `export PATH=${value}:$PATH`,
      `export PATH=$PATH:${value}`,
      `path+=('${value}')`,
      `path+=(${value})`,
      `path=('${value}' $path)`,
      `path=(${value} $path)`
    ]

    for (const filePath of filePaths) {
      if (await FileUtils.fileExists(filePath)) {
        const fileContents = await fs.readFile(filePath, 'utf8');

        const pathsFound = searchTerms.filter((st) => fileContents.includes(st));
        if (pathsFound.length > 0) {
          return {
            filePath,
            content: fileContents,
            pathsFound,
          }
        }
      }
    }

    return null;
  }
}

interface PathDeclaration {
  filePath: string;
  content: string;
  pathsFound: string[];
}
