'use client';

import maplibregl from 'maplibre-gl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { addTrafficLayer, toggleTrafficLayer } from '@/lib/traffic-layer';
import { addSafeSpacesLayer } from '@/lib/safe-spaces-layer';
import { logClientError } from '@/lib/client-logger';
import { useAppStore } from '@/lib/store';

// ── Modular imports from split files ──
import type { MapLibreCanvasProps, MapStyleCandidate } from './map-types';
import { buildStyleCandidates } from './map-styles';
import {
  ACCURACY_SOURCE_ID,
  ACCURACY_FILL_LAYER_ID,
  ACCURACY_LINE_LAYER_ID,
  ROUTE_SOURCE_ID,
  ROUTE_ALT_CASING_LAYER_ID,
  ROUTE_ALT_LINE_LAYER_ID,
  ROUTE_CASING_LAYER_ID,
  ROUTE_LINE_LAYER_ID,
  FACILITY_SOURCE_ID,
  FACILITY_CLUSTER_LAYER_ID,
  FACILITY_CLUSTER_COUNT_LAYER_ID,
  FACILITY_UNCLUSTERED_LAYER_ID,
  FACILITY_SELECTED_LAYER_ID,
  HEATMAP_SOURCE_ID,
  HEATMAP_LAYER_ID,
  iconForType,
  buildFacilityCollection,
  buildAccuracyFeature,
  buildMarkerElement,
  buildPopupContent,
} from './map-utils';

// ── Re-export types for backward compatibility ──
export type {
  MapLibreFacility,
  MapLibreIssue,
  MapLibreCurrentLocation,
  MapLibreRoutePoint,
  MapLibreRoute,
} from './map-types';

export function MapLibreCanvas({
  center,
  zoom = Number(process.env.NEXT_PUBLIC_MAP_DEFAULT_ZOOM ?? 13),
  facilities = [],
  issues = [],
  currentLocation,
  route = null,
  alternativeRoutes = [],
  selectedFacilityId = null,
  viewportMode = 'center',
  navigationPosition = 'bottom-left',
  className = 'absolute inset-0 h-full w-full',
}: MapLibreCanvasProps) {
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRefs = useRef<maplibregl.Marker[]>([]);
  const facilityPopupRef = useRef<maplibregl.Popup | null>(null);
  const activeStyleIndexRef = useRef(0);
  const styleReadyRef = useRef(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [statusMessage, setStatusMessage] = useState<string>('Loading map...');
  const [styleRevision, setStyleRevision] = useState(0);
  const showTraffic = useAppStore((state) => state.showTraffic);
  const showSafeSpaces = useAppStore((state) => state.showSafeSpaces);
  const showSatellite = useAppStore((state) => state.showSatellite);
  const { resolvedTheme } = useTheme();
  const setMapState = useAppStore((state) => state.setMapState);
  const showHazardHeatmap = useAppStore((state) => state.showHazardHeatmap);
  const initialCenterRef = useRef(center);
  const initialZoomRef = useRef(zoom);
  const showTrafficRef = useRef(showTraffic);

  useEffect(() => {
    showTrafficRef.current = showTraffic;
  }, [showTraffic]);

  const STYLE_CANDIDATES = useMemo<MapStyleCandidate[]>(
    () => buildStyleCandidates(resolvedTheme, showSatellite),
    [resolvedTheme, showSatellite]
  );

  const candidatesRef = useRef(STYLE_CANDIDATES);
  useEffect(() => {
    candidatesRef.current = STYLE_CANDIDATES;
  }, [STYLE_CANDIDATES]);

  useEffect(() => {
    if (mapRef.current && mapRef.current.isStyleLoaded()) {
      const activeCandidate = STYLE_CANDIDATES[activeStyleIndexRef.current];
      if (activeCandidate) {
        styleReadyRef.current = false;
        setStatus('loading');
        setStatusMessage(`Loading ${activeCandidate.label}...`);
        setMapState({
          mapStatus: 'loading',
          mapProvider: activeCandidate.kind,
          mapError: null,
        });
        setStyleRevision((revision) => revision + 1);
        mapRef.current.setStyle(activeCandidate.style as maplibregl.StyleSpecification);
      }
    }
  }, [STYLE_CANDIDATES, setMapState]);

  const liveFacilities = useMemo(
    () => facilities.filter((facility) => facility.coords),
    [facilities]
  );

  // ═══════════════════════════════════════════
  // MAP INITIALIZATION
  // ═══════════════════════════════════════════

  useEffect(() => {
    if (!mapNodeRef.current || mapRef.current) {
      return;
    }

    let disposed = false;
    let map: maplibregl.Map | null = null;

    async function initializeMap() {
      setStatus('loading');
      setStatusMessage('Loading map...');
      activeStyleIndexRef.current = 0;
      styleReadyRef.current = false;

      if (disposed || !mapNodeRef.current) {
        return;
      }

      const getActiveCandidate = () => candidatesRef.current[activeStyleIndexRef.current];
      setMapState({
        mapStatus: 'loading',
        mapProvider: getActiveCandidate().kind,
        mapError: null,
      });

      map = new maplibregl.Map({
        container: mapNodeRef.current,
        style: getActiveCandidate().style as maplibregl.StyleSpecification,
        center: [initialCenterRef.current[1], initialCenterRef.current[0]],
        zoom: initialZoomRef.current,
        maxZoom: 18,
        minZoom: 3,
        renderWorldCopies: false,
        pitchWithRotate: false,
        cooperativeGestures: false,
        fadeDuration: 0,
      });

      const applyNextStyle = (message: string) => {
        if (!map) {
          return;
        }

        const nextIndex = activeStyleIndexRef.current + 1;
        if (nextIndex >= candidatesRef.current.length) {
          setStatus('error');
          setStatusMessage('Map service is unavailable right now.');
          setMapState({
            mapStatus: 'error',
            mapProvider: getActiveCandidate()?.kind ?? null,
            mapError: 'Map service is unavailable right now.',
          });
          return;
        }

        const nextCandidate = candidatesRef.current[nextIndex];
        activeStyleIndexRef.current = nextIndex;
        styleReadyRef.current = false;
        setStatus('loading');
        setStatusMessage(message);
        setMapState({
          mapStatus: 'loading',
          mapProvider: nextCandidate.kind,
          mapError: null,
        });
        setStyleRevision((revision) => revision + 1);
        map.setStyle(nextCandidate.style as maplibregl.StyleSpecification);
      };

      const handleMapError = (event: unknown) => {
        const errorEvent = event as {
          error?: { message?: string; status?: number };
          sourceId?: string;
        };
        const message = (errorEvent?.error?.message ?? '').toLowerCase();
        const activeCandidate = getActiveCandidate();

        const isHardFailure =
          message.includes('401') ||
          message.includes('403') ||
          message.includes('fetch') ||
          message.includes('failed to fetch') ||
          (message.includes('maptiler') && (message.includes('unavailable') || message.includes('error')));

        if (isHardFailure && activeCandidate.kind !== 'openfreemap') {
          applyNextStyle(`Service unavailable, switching to fallback map...`);
          return;
        }

        if (activeCandidate.kind === 'openfreemap' && !styleReadyRef.current) {
          setStatus('error');
          setStatusMessage('Map service is unavailable right now.');
          setMapState({
            mapStatus: 'error',
            mapProvider: activeCandidate.kind,
            mapError: 'Map service is unavailable right now.',
          });
        }
      };

      const handleStyleImageMissing = (event: unknown) => {
        const imageEvent = event as { id?: string };
        const activeCandidate = getActiveCandidate();
        const missingId = typeof imageEvent?.id === 'string' ? imageEvent.id.trim() : '';

        if (activeCandidate.kind === 'maptiler-vector' && missingId.length === 0) {
          applyNextStyle('MapTiler vector assets unavailable, trying raster fallback...');
        }
      };

      const syncReadyState = () => {
        if (!map || styleReadyRef.current) {
          return;
        }

        if (map.isStyleLoaded() && map.areTilesLoaded()) {
          styleReadyRef.current = true;
          setStatus('ready');
          setMapState({
            mapStatus: 'ready',
            mapProvider: getActiveCandidate().kind,
            mapError: null,
          });
        }
      };

      map.addControl(
        new maplibregl.NavigationControl({
          showCompass: false,
          visualizePitch: false,
        }),
        navigationPosition
      );
      map.dragRotate.disable();
      map.touchZoomRotate.disableRotation();
      map.once('load', () => {
        map?.resize();
        map?.jumpTo({
          center: [initialCenterRef.current[1], initialCenterRef.current[0]],
          zoom: initialZoomRef.current,
        });
        if (map) {
          addTrafficLayer(map);
          toggleTrafficLayer(map, showTrafficRef.current);
        }
      });
      map.on('idle', syncReadyState);
      map.on('sourcedata', syncReadyState);
      map.on('error', handleMapError);
      map.on('styleimagemissing', handleStyleImageMissing);

      mapRef.current = map;

      window.setTimeout(() => {
        if (!disposed && map && !styleReadyRef.current) {
          const activeCandidate = getActiveCandidate();
          if (activeCandidate.kind !== 'openfreemap') {
            applyNextStyle('Map connection timed out, switching to fallback...');
            return;
          }
          setStatus('error');
          setStatusMessage('Map style did not finish loading.');
          setMapState({
            mapStatus: 'error',
            mapProvider: activeCandidate.kind,
            mapError: 'Map style did not finish loading.',
          });
        }
      }, 12000);
    }

    initializeMap().catch(() => {
      if (!disposed) {
        setStatus('error');
        setStatusMessage('Unable to initialize the map.');
        setMapState({
          mapStatus: 'error',
          mapProvider: null,
          mapError: 'Unable to initialize the map.',
        });
      }
    });

    return () => {
      disposed = true;
      map?.remove();
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = [];
      mapRef.current = null;
      activeStyleIndexRef.current = 0;
      styleReadyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigationPosition]);

  // ═══════════════════════════════════════════
  // ACCURACY OVERLAY
  // ═══════════════════════════════════════════

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const syncAccuracyOverlay = () => {
      const hasSource = Boolean(map.getSource(ACCURACY_SOURCE_ID));

      if (!currentLocation?.accuracy) {
        if (map.getLayer(ACCURACY_FILL_LAYER_ID)) map.removeLayer(ACCURACY_FILL_LAYER_ID);
        if (map.getLayer(ACCURACY_LINE_LAYER_ID)) map.removeLayer(ACCURACY_LINE_LAYER_ID);
        if (hasSource) map.removeSource(ACCURACY_SOURCE_ID);
        return;
      }

      const circleFeature = buildAccuracyFeature(
        currentLocation.lat,
        currentLocation.lon,
        Math.max(currentLocation.accuracy, 35)
      );

      if (hasSource) {
        const source = map.getSource(ACCURACY_SOURCE_ID) as maplibregl.GeoJSONSource;
        source.setData(circleFeature);
        return;
      }

      map.addSource(ACCURACY_SOURCE_ID, { type: 'geojson', data: circleFeature });
      map.addLayer({
        id: ACCURACY_FILL_LAYER_ID,
        type: 'fill',
        source: ACCURACY_SOURCE_ID,
        paint: { 'fill-color': '#00c896', 'fill-opacity': 0.12 },
      });
      map.addLayer({
        id: ACCURACY_LINE_LAYER_ID,
        type: 'line',
        source: ACCURACY_SOURCE_ID,
        paint: { 'line-color': '#00c896', 'line-width': 2, 'line-opacity': 0.55 },
      });
    };

    if (map.isStyleLoaded()) {
      syncAccuracyOverlay();
      return;
    }

    map.once('load', syncAccuracyOverlay);
    return () => { map.off('load', syncAccuracyOverlay); };
  }, [currentLocation, styleRevision]);

  // ═══════════════════════════════════════════
  // FLY-TO EVENT
  // ═══════════════════════════════════════════

  useEffect(() => {
    const handleFlyTo = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && mapRef.current) {
        mapRef.current.flyTo({
          center: [customEvent.detail.lng, customEvent.detail.lat],
          zoom: 16,
          essential: true,
        });
      }
    };
    window.addEventListener('svai:fly-to', handleFlyTo);
    return () => window.removeEventListener('svai:fly-to', handleFlyTo);
  }, []);

  // ═══════════════════════════════════════════
  // ROUTE OVERLAY
  // ═══════════════════════════════════════════

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const syncRouteOverlay = () => {
      const hasSource = Boolean(map.getSource(ROUTE_SOURCE_ID));

      const alternativeFeatures = alternativeRoutes
        .filter((candidate) => candidate.path?.length && candidate.path.length >= 2)
        .map((candidate) => ({
          type: 'Feature',
          properties: { kind: 'alternative', routeId: candidate.routeId ?? '' },
          geometry: {
            type: 'LineString',
            coordinates: candidate.path.map((point) => [point.lon, point.lat]),
          },
        }));

      if (!route?.path?.length || route.path.length < 2) {
        if (map.getLayer(ROUTE_LINE_LAYER_ID)) map.removeLayer(ROUTE_LINE_LAYER_ID);
        if (map.getLayer(ROUTE_CASING_LAYER_ID)) map.removeLayer(ROUTE_CASING_LAYER_ID);
        if (map.getLayer(ROUTE_ALT_LINE_LAYER_ID)) map.removeLayer(ROUTE_ALT_LINE_LAYER_ID);
        if (map.getLayer(ROUTE_ALT_CASING_LAYER_ID)) map.removeLayer(ROUTE_ALT_CASING_LAYER_ID);
        if (hasSource) map.removeSource(ROUTE_SOURCE_ID);
        return;
      }

      const routeFeatures = [
        ...alternativeFeatures,
        {
          type: 'Feature',
          properties: { kind: 'primary', routeId: route.routeId ?? '' },
          geometry: {
            type: 'LineString',
            coordinates: route.path.map((point) => [point.lon, point.lat]),
          },
        },
      ] as GeoJSON.Feature<GeoJSON.LineString>[];

      const routeCollection = {
        type: 'FeatureCollection',
        features: routeFeatures,
      } as GeoJSON.FeatureCollection<GeoJSON.LineString>;

      if (hasSource) {
        const source = map.getSource(ROUTE_SOURCE_ID) as maplibregl.GeoJSONSource;
        source.setData(routeCollection);
        return;
      }

      map.addSource(ROUTE_SOURCE_ID, { type: 'geojson', data: routeCollection });
      if (!map.getLayer(ROUTE_ALT_CASING_LAYER_ID)) {
        map.addLayer({
          id: ROUTE_ALT_CASING_LAYER_ID, type: 'line', source: ROUTE_SOURCE_ID,
          filter: ['==', ['get', 'kind'], 'alternative'],
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': 'rgba(255,255,255,0.7)', 'line-width': 7, 'line-opacity': 0.75 },
        });
      }
      if (!map.getLayer(ROUTE_ALT_LINE_LAYER_ID)) {
        map.addLayer({
          id: ROUTE_ALT_LINE_LAYER_ID, type: 'line', source: ROUTE_SOURCE_ID,
          filter: ['==', ['get', 'kind'], 'alternative'],
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#00c896', 'line-width': 4, 'line-opacity': 0.45, 'line-dasharray': [1, 1.4] },
        });
      }
      if (!map.getLayer(ROUTE_CASING_LAYER_ID)) {
        map.addLayer({
          id: ROUTE_CASING_LAYER_ID, type: 'line', source: ROUTE_SOURCE_ID,
          filter: ['==', ['get', 'kind'], 'primary'],
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': 'rgba(255,255,255,0.92)', 'line-width': 10, 'line-opacity': 0.96 },
        });
      }
      if (!map.getLayer(ROUTE_LINE_LAYER_ID)) {
        map.addLayer({
          id: ROUTE_LINE_LAYER_ID, type: 'line', source: ROUTE_SOURCE_ID,
          filter: ['==', ['get', 'kind'], 'primary'],
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#2563eb', 'line-width': 6, 'line-opacity': 0.98 },
        });
      }
    };

    if (map.isStyleLoaded()) {
      syncRouteOverlay();
      return;
    }
    map.once('load', syncRouteOverlay);
    return () => { map.off('load', syncRouteOverlay); };
  }, [alternativeRoutes, route, styleRevision]);

  // ═══════════════════════════════════════════
  // FACILITY LAYERS (Clusters + Points)
  // ═══════════════════════════════════════════

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const popup = facilityPopupRef.current ?? new maplibregl.Popup({ closeButton: false, offset: 22 });
    facilityPopupRef.current = popup;
    const collection = buildFacilityCollection(liveFacilities, selectedFacilityId);
    let handlersBound = false;

    const syncFacilityLayers = () => {
      const existingSource = map.getSource(FACILITY_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (existingSource) {
        existingSource.setData(collection);
      } else {
        map.addSource(FACILITY_SOURCE_ID, {
          type: 'geojson', data: collection, cluster: true, clusterMaxZoom: 13, clusterRadius: 48,
        });
      }

      if (!map.getLayer(FACILITY_CLUSTER_LAYER_ID)) {
        map.addLayer({
          id: FACILITY_CLUSTER_LAYER_ID, type: 'circle', source: FACILITY_SOURCE_ID,
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': ['step', ['get', 'point_count'], '#00c896', 8, '#00a87d', 16, '#008a67'],
            'circle-radius': ['step', ['get', 'point_count'], 18, 8, 22, 16, 28],
            'circle-opacity': 0.92, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2,
          },
        });
      }

      if (!map.getLayer(FACILITY_CLUSTER_COUNT_LAYER_ID)) {
        map.addLayer({
          id: FACILITY_CLUSTER_COUNT_LAYER_ID, type: 'symbol', source: FACILITY_SOURCE_ID,
          filter: ['has', 'point_count'],
          layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12, 'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'] },
          paint: { 'text-color': '#ffffff' },
        });
      }

      if (!map.getLayer(FACILITY_SELECTED_LAYER_ID)) {
        map.addLayer({
          id: FACILITY_SELECTED_LAYER_ID, type: 'circle', source: FACILITY_SOURCE_ID,
          filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'selected'], 1]],
          paint: {
            'circle-color': ['get', 'accentColor'],
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 18, 14, 22],
            'circle-opacity': 0.28, 'circle-stroke-width': 0,
          },
        });
      }

      if (!map.getLayer(FACILITY_UNCLUSTERED_LAYER_ID)) {
        map.addLayer({
          id: FACILITY_UNCLUSTERED_LAYER_ID, type: 'circle', source: FACILITY_SOURCE_ID,
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': ['get', 'accentColor'],
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 7, 11, 9, 16, 11],
            'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2, 'circle-opacity': 0.95,
          },
        });
      }
    };

    const handleClusterClick = (event: maplibregl.MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const clusterId = feature?.properties?.cluster_id;
      if (clusterId == null) return;

      const source = map.getSource(FACILITY_SOURCE_ID) as maplibregl.GeoJSONSource & {
        getClusterExpansionZoom: (clusterId: number, callback: (error: Error | null, zoom: number) => void) => void;
      };

      source.getClusterExpansionZoom(clusterId, (error, expansionZoom) => {
        if (error || !feature || feature.geometry.type !== 'Point') return;
        map.easeTo({ center: feature.geometry.coordinates as [number, number], zoom: Math.max(expansionZoom, 14), duration: 650 });
      });
    };

    const handleFacilityClick = (event: maplibregl.MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature || feature.geometry.type !== 'Point') return;

      const properties = feature.properties as Record<string, string>;
      popup
        .setLngLat(feature.geometry.coordinates as [number, number])
        .setDOMContent(
          buildPopupContent(
            properties.name ?? 'Emergency service',
            [properties.type, properties.distance].filter(Boolean).join(' - '),
            [properties.address, properties.phone ? `Call: ${properties.phone}` : undefined].filter(Boolean) as string[]
          )
        )
        .addTo(map);
    };

    const handlePointerEnter = () => { map.getCanvas().style.cursor = 'pointer'; };
    const handlePointerLeave = () => { map.getCanvas().style.cursor = ''; };

    const bindHandlers = () => {
      if (handlersBound) return;
      map.on('click', FACILITY_CLUSTER_LAYER_ID, handleClusterClick);
      map.on('click', FACILITY_UNCLUSTERED_LAYER_ID, handleFacilityClick);
      map.on('mouseenter', FACILITY_CLUSTER_LAYER_ID, handlePointerEnter);
      map.on('mouseenter', FACILITY_UNCLUSTERED_LAYER_ID, handlePointerEnter);
      map.on('mouseleave', FACILITY_CLUSTER_LAYER_ID, handlePointerLeave);
      map.on('mouseleave', FACILITY_UNCLUSTERED_LAYER_ID, handlePointerLeave);
      handlersBound = true;
    };

    const initializeFacilities = () => { syncFacilityLayers(); bindHandlers(); };

    if (map.isStyleLoaded()) {
      initializeFacilities();
    } else {
      map.once('load', initializeFacilities);
    }

    return () => {
      map.off('load', initializeFacilities);
      if (handlersBound) {
        map.off('click', FACILITY_CLUSTER_LAYER_ID, handleClusterClick);
        map.off('click', FACILITY_UNCLUSTERED_LAYER_ID, handleFacilityClick);
        map.off('mouseenter', FACILITY_CLUSTER_LAYER_ID, handlePointerEnter);
        map.off('mouseenter', FACILITY_UNCLUSTERED_LAYER_ID, handlePointerEnter);
        map.off('mouseleave', FACILITY_CLUSTER_LAYER_ID, handlePointerLeave);
        map.off('mouseleave', FACILITY_UNCLUSTERED_LAYER_ID, handlePointerLeave);
      }
    };
  }, [liveFacilities, selectedFacilityId, styleRevision]);

  // ═══════════════════════════════════════════
  // MARKERS (Current Location, Issues, Selected Facility)
  // ═══════════════════════════════════════════

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = [];

    if (currentLocation) {
      const popup = new maplibregl.Popup({ offset: 18 }).setDOMContent(
        buildPopupContent(
          currentLocation.title ?? 'Current location',
          currentLocation.subtitle,
          currentLocation.accuracy ? [`Accuracy: ${Math.round(currentLocation.accuracy)} m`] : []
        )
      );

      markerRefs.current.push(
        new maplibregl.Marker({
          element: buildMarkerElement({ color: '#00c896', icon: 'my_location', kind: 'current' }),
          anchor: 'center',
        })
          .setLngLat([currentLocation.lon, currentLocation.lat])
          .setPopup(popup)
          .addTo(map)
      );
    }

    issues.forEach((issue) => {
      const [lat, lon] = issue.coords;
      const popup = new maplibregl.Popup({ offset: 22 }).setDOMContent(
        buildPopupContent(
          issue.label,
          issue.overline,
          [issue.roadName, issue.description, issue.status ? `Status: ${issue.status}` : undefined].filter(Boolean) as string[]
        )
      );

      markerRefs.current.push(
        new maplibregl.Marker({
          element: buildMarkerElement({ color: issue.accentColor, icon: issue.icon ?? 'warning', kind: 'issue' }),
          anchor: 'center',
        })
          .setLngLat([lon, lat])
          .setPopup(popup)
          .addTo(map)
      );
    });

    if (selectedFacilityId) {
      const selected = liveFacilities.find((f) => f.id === selectedFacilityId);
      if (selected && selected.coords) {
        markerRefs.current.push(
          new maplibregl.Marker({
            element: buildMarkerElement({
              color: selected.accentColor,
              icon: selected.icon || iconForType(selected.type),
              kind: 'standard',
              selected: true,
            }),
            anchor: 'center',
          })
            .setLngLat([selected.coords[1], selected.coords[0]])
            .addTo(map)
        );
      }
    }
  }, [currentLocation, issues, styleRevision, liveFacilities, selectedFacilityId]);

  // ═══════════════════════════════════════════
  // HEATMAP LAYER
  // ═══════════════════════════════════════════

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const syncHeatmapLayer = () => {
      const hasSource = Boolean(map.getSource(HEATMAP_SOURCE_ID));

      if (!showHazardHeatmap || issues.length === 0) {
        if (map.getLayer(HEATMAP_LAYER_ID)) map.removeLayer(HEATMAP_LAYER_ID);
        if (hasSource) map.removeSource(HEATMAP_SOURCE_ID);
        return;
      }

      const collection = {
        type: 'FeatureCollection',
        features: issues.map(issue => ({
          type: 'Feature',
          properties: { severity: issue.severity || 1 },
          geometry: { type: 'Point', coordinates: [issue.coords[1], issue.coords[0]] },
        })),
      } as GeoJSON.FeatureCollection<GeoJSON.Point>;

      if (hasSource) {
        (map.getSource(HEATMAP_SOURCE_ID) as maplibregl.GeoJSONSource).setData(collection);
      } else {
        map.addSource(HEATMAP_SOURCE_ID, { type: 'geojson', data: collection });
      }

      if (!map.getLayer(HEATMAP_LAYER_ID)) {
        map.addLayer({
          id: HEATMAP_LAYER_ID, type: 'heatmap', source: HEATMAP_SOURCE_ID, maxzoom: 15,
          paint: {
            'heatmap-weight': ['interpolate', ['linear'], ['get', 'severity'], 1, 0.2, 5, 1],
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
            'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(0, 200, 150, 0)', 0.2, '#00c896', 0.5, '#00a87d', 0.8, '#008a67'],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 15, 20],
            'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 7, 1, 15, 0],
          }
        }, FACILITY_UNCLUSTERED_LAYER_ID);
      }
    };

    if (map.isStyleLoaded()) {
      syncHeatmapLayer();
    } else {
      map.once('load', syncHeatmapLayer);
    }
  }, [showHazardHeatmap, issues, styleRevision]);

  // ═══════════════════════════════════════════
  // VIEWPORT MANAGEMENT
  // ═══════════════════════════════════════════

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const allPoints: Array<[number, number]> = [];

    if (currentLocation) allPoints.push([currentLocation.lon, currentLocation.lat]);
    liveFacilities.forEach((facility) => { if (facility.coords) allPoints.push([facility.coords[1], facility.coords[0]]); });
    issues.forEach((issue) => { allPoints.push([issue.coords[1], issue.coords[0]]); });
    if (route?.path?.length) route.path.forEach((point) => { allPoints.push([point.lon, point.lat]); });
    alternativeRoutes.forEach((candidate) => { candidate.path.forEach((point) => { allPoints.push([point.lon, point.lat]); }); });

    if ((viewportMode === 'fit' || route?.path?.length) && allPoints.length > 1) {
      const bounds = allPoints.reduce(
        (acc, point) => acc.extend(point),
        new maplibregl.LngLatBounds(allPoints[0], allPoints[0])
      );
      map.fitBounds(bounds, { padding: { top: 72, right: 56, bottom: 72, left: 56 }, duration: 900, maxZoom: 15.5 });
      return;
    }

    map.easeTo({ center: [center[1], center[0]], zoom, duration: 850, essential: true });
  }, [alternativeRoutes, center, currentLocation, issues, liveFacilities, route, styleRevision, viewportMode, zoom]);

  // ═══════════════════════════════════════════
  // RESIZE HANDLER
  // ═══════════════════════════════════════════

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleResize = () => map.resize();
    window.addEventListener('resize', handleResize);
    const timeout = window.setTimeout(handleResize, 150);

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // ═══════════════════════════════════════════
  // TRAFFIC TOGGLE
  // ═══════════════════════════════════════════

  useEffect(() => {
    if (mapRef.current && mapRef.current.isStyleLoaded()) {
      if (showTraffic && !mapRef.current.getLayer('traffic-flow')) {
        addTrafficLayer(mapRef.current);
      }
      toggleTrafficLayer(mapRef.current, showTraffic);
    }
  }, [showTraffic, styleRevision]);

  // ═══════════════════════════════════════════
  // SAFE SPACES LAYER
  // ═══════════════════════════════════════════

  useEffect(() => {
    if (!mapRef.current || !mapRef.current.isStyleLoaded() || !currentLocation) return;

    if (showSafeSpaces) {
      if (!mapRef.current.getLayer('safe-spaces-circles')) {
        addSafeSpacesLayer(mapRef.current, currentLocation.lat, currentLocation.lon).catch((err) => {
          logClientError('Failed to add safe spaces layer', err);
          useAppStore.getState().setShowSafeSpaces(false);
        });
      }
    }
  }, [showSafeSpaces, currentLocation, styleRevision]);

  useEffect(() => {
    if (!mapRef.current || !mapRef.current.isStyleLoaded()) return;

    if (mapRef.current.getLayer('safe-spaces-circles')) {
      mapRef.current.setLayoutProperty('safe-spaces-circles', 'visibility', showSafeSpaces ? 'visible' : 'none');
    }
    if (mapRef.current.getLayer('safe-spaces-labels')) {
      mapRef.current.setLayoutProperty('safe-spaces-labels', 'visibility', showSafeSpaces ? 'visible' : 'none');
    }
  }, [showSafeSpaces, styleRevision]);

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════

  return (
    <div className={className}>
      <div ref={mapNodeRef} className="absolute inset-0 h-full w-full overflow-hidden" />
      {status !== 'ready' ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-surface-1/80 backdrop-blur-[1px]">
          <div className="rounded-lg border border-white/10 bg-surface-1/85 px-4 py-3 text-center shadow-2xl">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-light">
              {status === 'error' ? 'Map Offline' : 'Initializing Map'}
            </div>
            <div className="mt-2 text-sm font-semibold text-text-1">{statusMessage}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
