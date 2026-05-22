import { EmergencyMap } from '@/components/EmergencyMap';
import { LocatorService } from '../locator-utils';
import { RouteOption } from '@/lib/api';

export function LocatorMap({
  coords,
  filtered,
  activeRouteOption,
  alternativeRoutes,
  currentLocation,
  address,
  selectedServiceId,
}: {
  coords: [number, number];
  filtered: LocatorService[];
  activeRouteOption: RouteOption | null;
  alternativeRoutes: RouteOption[];
  currentLocation: {
    lat: number;
    lon: number;
    accuracy: number;
    displayName?: string;
  } | null;
  address: string;
  selectedServiceId: string | null;
}) {
  return (
    <EmergencyMap
      center={coords}
      facilities={filtered.map((service) => ({
        id: service.id,
        name: service.name,
        coords: service.coords,
        type: service.type,
        accentColor: service.accentColor,
        distance: service.distance,
      }))}
      route={
        activeRouteOption
          ? {
              routeId: activeRouteOption.routeId,
              label: activeRouteOption.label,
              path: activeRouteOption.path,
              distanceMeters: activeRouteOption.distanceMeters,
              durationSeconds: activeRouteOption.durationSeconds,
            }
          : null
      }
      alternativeRoutes={alternativeRoutes}
      currentLocation={
        currentLocation
          ? {
              lat: currentLocation.lat,
              lon: currentLocation.lon,
              accuracy: currentLocation.accuracy,
              title: 'Current location',
              subtitle: currentLocation.displayName ?? address,
            }
          : null
      }
      selectedFacilityId={selectedServiceId}
    />
  );
}
