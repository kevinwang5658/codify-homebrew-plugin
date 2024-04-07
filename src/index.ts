import { Plugin, runPlugin } from 'codify-plugin-lib';
import { HomebrewMainResource } from './resources/homebrew/main.js';
import { PyenvResource } from './resources/python/pyenv/main.js';

function buildPlugin(): Plugin {
  const resourceMap = new Map();

  const homebrewResource = new HomebrewMainResource()
  resourceMap.set(homebrewResource.getTypeId(), homebrewResource)

  const pythonResource = new PyenvResource()
  resourceMap.set(pythonResource.getTypeId(), pythonResource)

  return new Plugin(resourceMap);
}

runPlugin(buildPlugin())
