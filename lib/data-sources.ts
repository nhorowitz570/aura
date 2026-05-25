export type DataSourceId = "apple_health" | "google_fit" | "fitbit" | "whoop" | "garmin" | "oura";

export type DataSource = {
  id: DataSourceId;
  name: string;
  description: string;
  provides: ("sleep" | "vitals" | "workouts" | "nutrition" | "hydration")[];
};

export const DATA_SOURCES: DataSource[] = [
  {
    id: "apple_health",
    name: "Apple Health",
    description: "iPhone, Apple Watch, and connected devices.",
    provides: ["sleep", "vitals", "workouts"],
  },
  {
    id: "google_fit",
    name: "Google Fit",
    description: "Android, Wear OS, and connected devices.",
    provides: ["sleep", "vitals", "workouts"],
  },
  {
    id: "fitbit",
    name: "Fitbit",
    description: "Wearables and the Fitbit ecosystem.",
    provides: ["sleep", "vitals", "workouts"],
  },
  {
    id: "whoop",
    name: "Whoop",
    description: "Recovery, strain, and sleep tracking.",
    provides: ["sleep", "vitals", "workouts"],
  },
  {
    id: "garmin",
    name: "Garmin",
    description: "Garmin watches and Connect.",
    provides: ["sleep", "vitals", "workouts"],
  },
  {
    id: "oura",
    name: "Oura",
    description: "Oura Ring sleep and readiness.",
    provides: ["sleep", "vitals"],
  },
];

export type Feature = "sleep" | "vitals" | "workouts" | "nutrition" | "hydration";

export function sourcesProviding(feature: Feature): DataSource[] {
  return DATA_SOURCES.filter((s) => s.provides.includes(feature));
}

export function hasSourceFor(feature: Feature, connected: DataSourceId[]): boolean {
  return connected.some((id) => {
    const src = DATA_SOURCES.find((s) => s.id === id);
    return src?.provides.includes(feature) ?? false;
  });
}
