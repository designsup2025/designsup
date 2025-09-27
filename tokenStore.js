import * as SecureStore from "expo-secure-store";
const ACCESS_KEY = "st_access"; const REFRESH_KEY = "st_refresh";

export async function saveTokens({ access, refresh }) {
  if (access)  await SecureStore.setItemAsync(ACCESS_KEY, access);
  if (refresh) await SecureStore.setItemAsync(REFRESH_KEY, refresh);
}
export async function loadTokens() {
  const access  = await SecureStore.getItemAsync(ACCESS_KEY);
  const refresh = await SecureStore.getItemAsync(REFRESH_KEY);
  return { access, refresh };
}
export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}
