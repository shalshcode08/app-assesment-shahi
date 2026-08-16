export type HubOption = {
  id: string;
  name: string;
};

export type RegionOption = {
  hubs: HubOption[];
  id: string;
  name: string;
};

export type LoginLocationsResult = {
  backendReady: boolean;
  message?: string;
  regions: RegionOption[];
};
