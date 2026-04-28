import '@testing-library/jest-native/extend-expect';
import { jest } from '@jest/globals';

// Mock React Native Core and Libraries
import mockSafeAreaContext from 'react-native-safe-area-context/jest/mock';
jest.mock('react-native-safe-area-context', () => mockSafeAreaContext);

// Navigation mock
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      reset: jest.fn(),
      dispatch: jest.fn(),
      replace: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
  };
});

// Mock Linking
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(() => Promise.resolve()),
  canOpenURL: jest.fn(() => Promise.resolve(true)),
}));

// Mock Stripe
jest.mock('@stripe/stripe-react-native', () => ({
  StripeProvider: ({ children }) => children,
  useStripe: () => ({
    initPaymentSheet: jest.fn().mockResolvedValue({ error: null }),
    presentPaymentSheet: jest.fn().mockResolvedValue({ error: null }),
  }),
}));

jest.mock('react-native-fs', () => {
  return {
    mkdir: jest.fn(),
    moveFile: jest.fn(),
    copyFile: jest.fn(),
    pathForBundle: jest.fn(),
    pathForGroup: jest.fn(),
    getFSInfo: jest.fn(),
    getAllExternalFilesDirs: jest.fn(),
    hasActionViewIntent: jest.fn(),
    showHelpForSymlink: jest.fn(),
    readDir: jest.fn(),
    readDirAssets: jest.fn(),
    exists: jest.fn(),
    existsAssets: jest.fn(),
    existsRes: jest.fn(),
    stat: jest.fn(),
    readFile: jest.fn(),
    readFileAssets: jest.fn(),
    readFileRes: jest.fn(),
    hash: jest.fn(),
    copyFileAssets: jest.fn(),
    copyFileAssetsIOS: jest.fn(),
    copyAssetsVideoIOS: jest.fn(),
    writeFile: jest.fn(),
    appendFile: jest.fn(),
    write: jest.fn(),
    downloadFile: jest.fn(),
    uploadFiles: jest.fn(),
    touch: jest.fn(),
    MainBundlePath: jest.fn(),
    CachesDirectoryPath: jest.fn(),
    DocumentDirectoryPath: jest.fn(),
    ExternalDirectoryPath: jest.fn(),
    ExternalStorageDirectoryPath: jest.fn(),
    TemporaryDirectoryPath: jest.fn(),
    LibraryDirectoryPath: jest.fn(),
    PicturesDirectoryPath: jest.fn(),
  };
});

jest.mock('react-native-linear-gradient', () => 'LinearGradient');
jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
  launchCamera: jest.fn(),
}));

jest.mock('@react-native-documents/picker', () => ({
  pick: jest.fn(),
  types: {},
}));

// Global console overrides to silence predictable expected warnings in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('Warning: ReactDOM.render is no longer supported')) {
    return;
  }
  originalConsoleError(...args);
};
console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('Non-serializable values were found in the navigation state')) {
    return;
  }
  originalConsoleWarn(...args);
};
