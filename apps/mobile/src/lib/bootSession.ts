import type { PublicUser } from "@z-notes/shared";
import {
  ApiError,
  loadToken,
  loadBaseUrl,
  loadCurrentUser,
  loadUserId,
  saveCurrentUser,
  clearToken,
} from "../api/http";
import { authMe } from "../api/resources";
import { clearUserCache } from "./storage";

export interface BootResult {
  screen: "login" | "list";
  user: PublicUser | null;
  /** Dono do cache offline; vale mesmo quando o usuário completo não está salvo. */
  userId: number | null;
}

/**
 * Decide a tela inicial. Só erro de rede mantém a sessão offline;
 * 401 (JWT vencido/revogado) ou "não autenticado" limpam token e cache e voltam ao login.
 */
export async function bootSession(): Promise<BootResult> {
  const [token, , storedUser, storedUserId] = await Promise.all([
    loadToken(),
    loadBaseUrl(),
    loadCurrentUser(),
    loadUserId(),
  ]);
  const userId = storedUser?.id ?? storedUserId;
  if (!token) return { screen: "login", user: null, userId: null };

  const dropSession = async (): Promise<BootResult> => {
    await clearUserCache(userId);
    await clearToken();
    return { screen: "login", user: null, userId: null };
  };

  try {
    const me = await authMe();
    if (!me.authenticated) return await dropSession();
    saveCurrentUser(me.user).catch(() => {});
    return { screen: "list", user: me.user, userId: me.user.id };
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return dropSession();
    // Falha de rede (ou 5xx): abre offline com o cache do usuário.
    return { screen: "list", user: storedUser, userId };
  }
}
