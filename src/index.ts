import { Plugin, runPlugin } from 'codify-plugin-lib';
import { HomebrewMainResource } from './resources/main';

function buildPlugin(): Plugin {
  const resourceMap = new Map();

  const homebrewResource = new HomebrewMainResource()
  resourceMap.set(homebrewResource.getTypeId(), homebrewResource)

  return new Plugin(resourceMap);
}

runPlugin(buildPlugin())
