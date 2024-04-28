export type HashicorpReleasesAPIResponse = Array<HashicorpReleaseInfo>;

export interface HashicorpReleaseInfo {
  builds: Array<{
    arch: string,
    os: string,
    unsupported: boolean,
    url: string,
  }>,
  is_prerelease: boolean,
  name: string,
  version: string,
}

export interface TerraformVersionInfo {
  terraform_version: string,
  platform: string,
  provider_selections: string,
  terraform_outdated: boolean,
}
