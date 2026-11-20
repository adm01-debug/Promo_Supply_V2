/**
 * Canal global de eventos entre módulos da UI.
 * Evita acoplamento direto (ex.: dialog de pedidos -> chat de fornecedores).
 */
export type HubEvent<T = unknown> = { type: string; payload: T };

type HubListener<T = unknown> = (event: HubEvent<T>) => void;

const hubListeners = new Map<string, Set<HubListener>>();

export function emitHubEvent<T = unknown>(type: string, payload: T) {
  hubListeners.get(type)?.forEach((listener) => listener({ type, payload }));
}

export function onHubEvent<T = unknown>(type: string, listener: HubListener<T>) {
  if (!hubListeners.has(type)) hubListeners.set(type, new Set());
  hubListeners.get(type)!.add(listener as HubListener);
  return () => {
    hubListeners.get(type)?.delete(listener as HubListener);
  };
}
