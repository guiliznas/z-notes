/** Timestamp seguro para nome de arquivo/diretório (sem `:` nem `.`). */
export function isoStamp(d: Date): string {
  return d.toISOString().replace(/[:.]/g, "-");
}
