import { vi } from "vitest";

/** Stub do `virtual:pwa-register/react` para testes (o módulo real só existe no build). */
export const useRegisterSW = vi.fn(() => ({
  needRefresh: [false, vi.fn()] as [boolean, (v: boolean) => void],
  offlineReady: [false, vi.fn()] as [boolean, (v: boolean) => void],
  updateServiceWorker: vi.fn(),
}));
