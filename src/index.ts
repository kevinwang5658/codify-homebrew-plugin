import { Plugin, runPlugin } from 'codify-plugin-lib';
import { HomebrewMainResource } from './resources/homebrew/main';
import { PyenvResource } from './resources/python/main';

function buildPlugin(): Plugin {
  const resourceMap = new Map();

  const homebrewResource = new HomebrewMainResource()
  resourceMap.set(homebrewResource.getTypeId(), homebrewResource)

  const pythonResource = new PyenvResource()
  resourceMap.set(pythonResource.getTypeId(), pythonResource)

  return new Plugin(resourceMap);
}

runPlugin(buildPlugin())
