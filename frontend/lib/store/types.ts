import type { AuthSlice } from './auth-slice';
import type { MapSlice, MapSearchTarget, MapProvider, MapStatus } from './map-slice';
import type { SettingsSlice } from './settings-slice';
import type { UISlice } from './ui-slice';
import type { DataSlice, GpsLocation, NearbyService, NearbyRoadIssue, ServiceSearchMeta, RoadIssueSearchMeta, UserProfile, AiMode, ConnectivityState, ChallanState } from './data-slice';

export type AppState = AuthSlice & MapSlice & SettingsSlice & UISlice & DataSlice;

export type {
  AuthSlice, MapSlice, MapSearchTarget, MapProvider, MapStatus,
  SettingsSlice, UISlice,
  DataSlice, GpsLocation, NearbyService, NearbyRoadIssue,
  ServiceSearchMeta, RoadIssueSearchMeta, UserProfile,
  AiMode, ConnectivityState, ChallanState,
};
