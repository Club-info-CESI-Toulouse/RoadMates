// Server entry point of the geo module: geocoding (IGN) and routing (OpenRouteService).
export { reverseGeocode, searchAddresses } from "./geocoding";
export { getRoute, RoutingUnavailableError, type Route, type RouteProfile } from "./routing";
export { getRouteAlternatives, type LabelledRoute } from "./alternatives";
export * from "./types";
