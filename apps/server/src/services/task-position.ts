/**
 * Posição manual de pastas, listas e tarefas: números reais esparsos.
 * Inserir entre dois vizinhos usa o ponto médio, então reordenar toca UMA linha.
 * Quando os vizinhos ficam colados demais, renumera a sequência (rebalanceamento).
 */
export const POSITION_STEP = 1024;
const MIN_GAP = 1e-6;

export interface Sibling {
  id: number;
  position: number;
}

export interface Placement {
  position: number;
  /** novas posições dos irmãos, quando foi preciso rebalancear (o item movido usa `position`). */
  renumber?: Map<number, number>;
}

/** Posição para o fim de uma sequência. */
export function endPosition(siblings: readonly Sibling[]): number {
  if (siblings.length === 0) return POSITION_STEP;
  return Math.max(...siblings.map((s) => s.position)) + POSITION_STEP;
}

/**
 * Posição para colocar um item logo depois de `afterId` (null = primeiro lugar).
 * `siblings` são os irmãos já ordenados, SEM o item que está sendo movido.
 * Retorna null se `afterId` não está entre os irmãos.
 */
export function placeAfter(siblings: readonly Sibling[], afterId: number | null): Placement | null {
  if (afterId === null) {
    return { position: siblings.length === 0 ? POSITION_STEP : siblings[0].position - POSITION_STEP };
  }
  const index = siblings.findIndex((s) => s.id === afterId);
  if (index === -1) return null;
  const prev = siblings[index];
  const next = siblings[index + 1];
  if (!next) return { position: prev.position + POSITION_STEP };
  if (next.position - prev.position >= MIN_GAP * 2) {
    return { position: (prev.position + next.position) / 2 };
  }
  // Vizinhos colados: renumera tudo em passos largos e coloca o item entre os dois.
  const renumber = new Map<number, number>();
  siblings.forEach((s, i) => renumber.set(s.id, (i + 1) * POSITION_STEP));
  return { position: ((index + 1) * POSITION_STEP + (index + 2) * POSITION_STEP) / 2, renumber };
}
