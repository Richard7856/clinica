import type {
  Cabin,
  CabinInput,
  Device,
  DeviceInput,
  Treatment,
  TreatmentInput,
} from "@/lib/schemas/catalog";
import type { Repository } from "./types";
import { createDoc, getOne, listAll, removeDoc, updateDocById } from "./firestore-helpers";

const makeRepo = <TInput, T extends { id: string }>(col: string): Repository<TInput, T> => ({
  list: () => listAll<T>(col),
  getById: (id) => getOne<T>(col, id),
  create: (input) => createDoc<T>(col, input as Record<string, unknown>),
  update: (id, patch) => updateDocById(col, id, patch as Record<string, unknown>),
  remove: (id) => removeDoc(col, id),
});

export const treatmentsRepo = makeRepo<TreatmentInput, Treatment>("treatments");
export const cabinsRepo = makeRepo<CabinInput, Cabin>("cabins");
export const devicesRepo = makeRepo<DeviceInput, Device>("devices");
