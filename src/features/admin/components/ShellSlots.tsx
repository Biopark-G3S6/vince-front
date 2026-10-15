import { createContext, useContext, type ReactNode } from 'react';

/**
 * Pontos de composição do cabeçalho. A raiz da aplicação os preenche com componentes
 * de outras features, sem que o shell dependa delas (ADR-0015 §9).
 */
type ShellSlots = {
  notifications?: ReactNode;
};

const ShellSlotsContext = createContext<ShellSlots>({});

export function ShellSlotsProvider({
  children,
  slots,
}: {
  children: ReactNode;
  slots: ShellSlots;
}) {
  return <ShellSlotsContext.Provider value={slots}>{children}</ShellSlotsContext.Provider>;
}

export function useShellSlots() {
  return useContext(ShellSlotsContext);
}
