const { withAppBuildGradle } = require('@expo/config-plugins');

const withAndroidBrowserFix = (config) => {
  return withAppBuildGradle(config, (config) => {
    const { modResults } = config;
    
    if (!modResults.contents.includes('androidx.browser:browser:1.8.0')) {
      modResults.contents = modResults.contents.replace(
        /dependencies\s*\{/,
        `configurations.all {
    resolutionStrategy {
        force 'androidx.browser:browser:1.8.0'
    }
}

dependencies {`
      );
    }
    
    return config;
  });
};

module.exports = withAndroidBrowserFix;
