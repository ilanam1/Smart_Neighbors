module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect', '<rootDir>/__tests__/setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native(-community)?|lucide-react-native|react-navigation|@react-navigation/.*|@supabase/.*|react-native-url-polyfill|react-native-safe-area-context|react-native-vector-icons|@stripe/stripe-react-native)/',
  ],
  testPathIgnorePatterns: [
    '\\.snap$',
    '<rootDir>/node_modules/',
    '<rootDir>/__tests__/setup.js',
    '<rootDir>/__tests__/__mocks__/'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
