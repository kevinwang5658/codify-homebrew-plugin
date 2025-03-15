import { CreatePlan, DestroyPlan, ModifyPlan, ParameterChange, Resource, ResourceSettings } from 'codify-plugin-lib';
import { StringIndexedObject } from 'codify-schemas';
import fs from 'node:fs/promises';
import path from 'node:path';

import { FileUtils } from '../../utils/file-utils.js';
import schema from './file-schema.json'

export interface FileConfig extends StringIndexedObject {
  path: string;
  contents: string;
  onlyCreate: boolean;
}

export class FileResource extends Resource<FileConfig> {
  getSettings(): ResourceSettings<FileConfig> {
    return {
      id: 'file',
      schema,
      parameterSettings: {
        path: { type: 'directory' },
        contents: { canModify: true },
        onlyCreate: { type: 'boolean', setting: true },
      },
      importAndDestroy:{
        requiredParameters: ['path']
      },
      allowMultiple: {
        identifyingParameters: ['path']
      }
    }
  }

  async refresh(parameters: Partial<FileConfig>): Promise<Partial<FileConfig> | Partial<FileConfig>[] | null> {
    const filePath  = parameters.path!;

    if (!(await FileUtils.exists(filePath))) {
      return null;
    }

    const isFile = (await fs.lstat(filePath)).isFile()
    if (!isFile) {
      throw new Error(`A directory exists at ${filePath}`)
    }

    // If we only care that the contents of the file is created then there's no point checking the contents
    const { onlyCreate } = parameters;
    if (onlyCreate) {
      return parameters;
    }

    const contents = (await fs.readFile(filePath)).toString('utf8');
    return {
      path: parameters.path,
      contents,
      onlyCreate,
    }
  }

  async create(plan: CreatePlan<FileConfig>): Promise<void> {
    const { contents, path } = plan.desiredConfig;

    await fs.writeFile(path, contents, 'utf8');
  }

  async modify(pc: ParameterChange<FileConfig>, plan: ModifyPlan<FileConfig>): Promise<void> {
    const filePath = path.resolve(plan.desiredConfig.path!);
    const { contents } = plan.desiredConfig;

    await fs.writeFile(filePath, contents, 'utf8');
  }

  async destroy(plan: DestroyPlan<FileConfig>): Promise<void> {
    await fs.rm(path.resolve(plan.currentConfig.path));
  }
}
