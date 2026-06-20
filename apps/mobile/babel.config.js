module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      // reanimated:false — we don't author reanimated worklets in app code.
      // babel-preset-expo otherwise auto-injects react-native-reanimated/plugin,
      // whose 3.16 build requires 'react-native-worklets/plugin' (a reanimated-4
      // package) that isn't installed → breaks the Metro transform. Disabling it
      // is safe; the reanimated runtime (a transitive nav dep) still works for
      // the default animations used by react-navigation/expo-router.
      ['babel-preset-expo', { jsxImportSource: 'nativewind', reanimated: false }],
      'nativewind/babel',
    ],
  };
};
