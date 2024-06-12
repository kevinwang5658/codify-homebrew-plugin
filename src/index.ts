import { Plugin, runPlugin } from 'codify-plugin-lib';
import { HomebrewResource } from './resources/homebrew/homebrew.js';
import { PyenvResource } from './resources/python/pyenv/pyenv.js';
import { GitLfsResource } from './resources/git/lfs/git-lfs.js';
import { AwsCliResource } from './resources/aws-cli/cli/aws-cli.js';
import { TerraformResource } from './resources/terraform/terraform.js';
import { NvmResource } from './resources/node/nvm/nvm.js';
import { PgcliResource } from './resources/pgcli/pgcli.js';
import { VscodeResource } from './resources/vscode/vscode.js';
import { AwsConfigureResource } from './resources/aws-cli/configure/aws-configure.js';
import { XcodeToolsResource } from './resources/xcode-tools/xcode-tools.js';
import { GitCloneResource } from './resources/git/clone/git-clone.js';
import { PathResource } from './resources/shell/path/path-resource.js';

runPlugin(Plugin.create(
  'default',
  [
    new XcodeToolsResource(),
    new PathResource(),
    new HomebrewResource(),
    new PyenvResource(),
    new GitLfsResource(),
    new AwsCliResource(),
    new AwsConfigureResource(),
    new TerraformResource(),
    new NvmResource(),
    new PgcliResource(),
    new VscodeResource(),
    new GitCloneResource(),
  ])
)
