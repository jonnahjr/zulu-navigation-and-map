let fallbackStore: Record<string, string> = {};

export const safeSetItem = async (key: string, value: string) => {
  try {
    // lazy require to avoid native-only module in web bundles
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem(key, value);
  } catch (e) {
    fallbackStore[key] = value;
  }
};

export const safeGetItem = async (key: string) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return await AsyncStorage.getItem(key);
  } catch (e) {
    return fallbackStore[key] || null;
  }
};

export default { safeSetItem, safeGetItem };
