// Generador mínimo de IDs url-safe. Evitamos sumar una dependencia para una
// función trivial. Usa crypto.getRandomValues para entropía.
const ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export function nanoid(size = 10): string {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < size; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}
