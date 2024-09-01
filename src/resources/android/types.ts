export interface JetbrainsAndroidStudiosResponse {
  content: {
    item: Array<AndroidStudioVersionData>
  }
}

export interface AndroidStudioVersionData {
  date: string; // "June 13, 2024"
  platformBuild: string; // "241.15989.150"
  download: Array<{
    size: string; // "992.0 MB"
    link: string; // "https://redirector.gvt1.com/edgedl/android/studio/install/2024.1.1.11/android-studio-2024.1.1.11-cros.deb"
    checksum: string; // "96133c24b890ffa6dbee8976ec996391b68ac2e5288516806bc5e5c74382162e"
  }>;
  build: string; // "AI-241.15989.150.2411.11948838"
  platformVersion: string; // "2024.1.1"
  name: string; // "Android Studio Koala | 2024.1.1"
  channel: 'Canary' | 'RC' | 'Release' | 'Beta';
  version: string; // "2024.1.1.11"
}
