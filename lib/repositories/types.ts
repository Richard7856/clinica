// Interfaces genéricas de los repositorios. Toda la app consume estas
// interfaces; la capa Firestore (implementación actual) queda aislada.
// Cuando migremos a Supabase/FastAPI, reemplazamos sólo los archivos
// `*.firestore.ts` sin tocar componentes.

export interface Repository<TInput, T extends { id: string }> {
  list(): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  create(input: TInput): Promise<T>;
  update(id: string, patch: Partial<TInput>): Promise<void>;
  remove(id: string): Promise<void>;
}

export type Timestamped<T> = T & { createdAt: string; updatedAt: string };
