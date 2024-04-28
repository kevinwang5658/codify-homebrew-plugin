import { Plugin, runPlugin } from 'codify-plugin-lib';
import { HomebrewResource } from './resources/homebrew/homebrew.js';
import { PyenvResource } from './resources/python/pyenv/main.js';
import { GitLfsResource } from './resources/git/git-lfs.js';
import { AwsCliResource } from './resources/aws-cli/aws-cli.js';

function buildPlugin(): Plugin {
  const resourceMap = new Map();

  const homebrewResource = new HomebrewResource()
  resourceMap.set(homebrewResource.typeId, homebrewResource)

  const pythonResource = new PyenvResource()
  resourceMap.set(pythonResource.typeId, pythonResource)

  const gitLfsResource = new GitLfsResource()
  resourceMap.set(gitLfsResource.typeId, gitLfsResource)

  const awsCliResource = new AwsCliResource()
  resourceMap.set(awsCliResource.typeId, awsCliResource)

  return new Plugin(resourceMap);
}

runPlugin(buildPlugin())
