
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

if (!config.resolver.assetExts.includes('aframe')) {
  config.resolver.assetExts.push('aframe');
}

module.exports = config;
