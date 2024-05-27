import { Plugin, runPlugin } from 'codify-plugin-lib';
import { HomebrewResource } from './resources/homebrew/homebrew.js';
import { PyenvResource } from './resources/python/pyenv/pyenv.js';
import { GitLfsResource } from './resources/git/git-lfs.js';
import { AwsCliResource } from './resources/aws-cli/cli/aws-cli.js';
import { TerraformResource } from './resources/terraform/terraform.js';
import { NvmResource } from './resources/node/nvm/nvm.js';
import { PgcliResource } from './resources/pgcli/pgcli.js';
import { VscodeResource } from './resources/vscode/vscode.js';
import { AwsConfigureResource } from './resources/aws-cli/configure/aws-configure.js';

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

  const awsConfigureResource = new AwsConfigureResource()
  resourceMap.set(awsConfigureResource.typeId, awsConfigureResource)

  const terraformResource = new TerraformResource()
  resourceMap.set(terraformResource.typeId, terraformResource)

  const nvmResource = new NvmResource();
  resourceMap.set(nvmResource.typeId, nvmResource);

  const pgcliResource = new PgcliResource();
  resourceMap.set(pgcliResource.typeId, pgcliResource);

  const vscodeResource = new VscodeResource();
  resourceMap.set(vscodeResource.typeId, vscodeResource);

  return new Plugin('default', resourceMap);
}

runPlugin(buildPlugin())
