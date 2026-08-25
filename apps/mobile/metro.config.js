// Learn more: https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;

// Expo's default config already detects this npm-workspaces monorepo and sets
// up watchFolders / nodeModulesPaths correctly, so we keep those defaults.
const config = getDefaultConfig(projectRoot);

// Force a single copy of React across the whole dependency graph.
//   react-native is hoisted to the monorepo root, where the web app pulled a
//   newer React (19.2.4), while the mobile app pins 19.1.0. Two React copies
//   break hooks ("Invalid hook call" / "Cannot read property 'useId' of
//   null"). Pinning these specifiers to the app-local copy guarantees the
//   hoisted react-native and the app share the exact same React instance.
const pinnedModules = {
  react: require.resolve('react', { paths: [projectRoot] }),
  'react/jsx-runtime': require.resolve('react/jsx-runtime', {
    paths: [projectRoot],
  }),
  'react/jsx-dev-runtime': require.resolve('react/jsx-dev-runtime', {
    paths: [projectRoot],
  }),
};

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const pinned = pinnedModules[moduleName];
  if (pinned) {
    return { type: 'sourceFile', filePath: pinned };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
