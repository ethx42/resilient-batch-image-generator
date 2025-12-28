/**
 * Routes Barrel Export
 *
 * @module server/routes
 */

export { registerEventsRoute } from "./events.route.js";
export { registerDashboardRoute } from "./dashboard.route.js";
export { registerApiRoutes, type ApiDependencies } from "./api.route.js";
export { registerBenchmarkRoutes, type BenchmarkDependencies } from "./benchmark.route.js";
export { registerReferenceRoutes, type ReferenceDependencies } from "./reference.route.js";

