import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_KEY = "z-notes-cache";
const WEEK_MS = 1000 * 60 * 60 * 24 * 7;

export const persister = {
  persistClient: async (client: unknown) => {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(client));
  },
  restoreClient: async () => {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  removeClient: async () => {
    await AsyncStorage.removeItem(CACHE_KEY);
  },
};

export const persistOptions = {
  persister,
  maxAge: WEEK_MS,
  buster: "v1",
};