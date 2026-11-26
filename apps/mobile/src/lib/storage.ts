import AsyncStorage from "@react-native-async-storage/async-storage";

export const WEEK_MS = 1000 * 60 * 60 * 24 * 7;

export function cacheKeyFor(userId?: number | null): string {
  return userId !== undefined && userId !== null ? `z-notes-cache:${userId}` : "z-notes-cache";
}

export function createPersister(userId?: number | null) {
  const key = cacheKeyFor(userId);
  return {
    persistClient: async (client: unknown) => {
      await AsyncStorage.setItem(key, JSON.stringify(client));
    },
    restoreClient: async () => {
      const raw = await AsyncStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    },
    removeClient: async () => {
      await AsyncStorage.removeItem(key);
    },
  };
}

export function persistOptionsFor(userId?: number | null) {
  return {
    persister: createPersister(userId),
    maxAge: WEEK_MS,
    buster: "v2",
  };
}

export const persister = createPersister();

export const persistOptions = {
  persister,
  maxAge: WEEK_MS,
  buster: "v1",
};

export async function clearUserCache(userId?: number | null): Promise<void> {
  await AsyncStorage.removeItem(cacheKeyFor(userId));
}