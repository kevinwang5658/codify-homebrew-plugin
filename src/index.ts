import { Plugin, runPlugin } from 'codify-plugin-lib';

import { AndroidStudioResource } from './resources/android/android-studio.js';
import { AsdfResource } from './resources/asdf/asdf.js';
import { AsdfGlobalResource } from './resources/asdf/asdf-global.js';
import { AsdfInstallResource } from './resources/asdf/asdf-install.js';
import { AsdfLocalResource } from './resources/asdf/asdf-local.js';
import { AsdfPluginResource } from './resources/asdf/asdf-plugin.js';
import { AwsCliResource } from './resources/aws-cli/cli/aws-cli.js';
import { AwsProfileResource } from './resources/aws-cli/profile/aws-profile.js';
import { GitCloneResource } from './resources/git/clone/git-clone.js';
import { GitResource } from './resources/git/git/git-resource.js';
import { GitLfsResource } from './resources/git/lfs/git-lfs.js';
import { HomebrewResource } from './resources/homebrew/homebrew.js';
import { JenvResource } from './resources/java/jenv/jenv.js';
import { NvmResource } from './resources/node/nvm/nvm.js';
import { PgcliResource } from './resources/pgcli/pgcli.js';
import { PyenvResource } from './resources/python/pyenv/pyenv.js';
import { AliasResource } from './resources/shell/alias/alias-resource.js';
import { PathResource } from './resources/shell/path/path-resource.js';
import { SshKeyResource } from './resources/ssh/ssh-key.js';
import { TerraformResource } from './resources/terraform/terraform.js';
import { VscodeResource } from './resources/vscode/vscode.js';
import { XcodeToolsResource } from './resources/xcode-tools/xcode-tools.js';

runPlugin(Plugin.create(
  'default',
  [
    new GitResource(),
    new XcodeToolsResource(),
    new PathResource(),
    new AliasResource(),
    new HomebrewResource(),
    new PyenvResource(),
    new GitLfsResource(),
    new AwsCliResource(),
    new AwsProfileResource(),
    new TerraformResource(),
    new NvmResource(),
    new JenvResource(),
    new PgcliResource(),
    new VscodeResource(),
    new GitCloneResource(),
    new AndroidStudioResource(),
    new AsdfResource(),
    new AsdfPluginResource(),
    new AsdfGlobalResource(),
    new AsdfLocalResource(),
    new AsdfInstallResource(),
    new SshKeyResource()
  ])
)
