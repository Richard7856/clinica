// Punto único de importación de repositorios. Cuando migremos de Firestore
// a Supabase/FastAPI, sólo se cambia lo que se exporta acá — los componentes
// siguen llamando a `patientsRepo.list()` sin enterarse.
export { patientsRepo } from "./patients";
export { treatmentsRepo, cabinsRepo, devicesRepo } from "./catalog";
export { packagesRepo } from "./packages";
export { sessionsRepo } from "./sessions";
export { appointmentsRepo } from "./appointments";
export { checkinsRepo } from "./checkins";
export { paymentsRepo } from "./payments";
export { rewardsRepo } from "./rewards";
export { staffRepo } from "./staff";
export { settingsRepo } from "./settings";
export { historyRepo } from "./history";
