export type UniversityId = "tudublin" | "dcu";

export interface UniversityOption {
  id: UniversityId;
  name: string;
  shortName: string;
  databaseName: string;
  institutionId: string;
  categoryTypeIdentity: string;
  timezone: string;
  baseUrl: string;
  defaultProgram: {
    Identity: string;
    CategoryTypeIdentity: string;
    Name: string;
    Description: string;
  };
}

export const UNIVERSITIES: Record<UniversityId, UniversityOption> = {
  tudublin: {
    id: "tudublin",
    name: "Technological University Dublin",
    shortName: "TU Dublin",
    databaseName: "scientia-eu-v4-api-d4-01",
    institutionId: "50a55ae1-1c87-4dea-bb73-c9e67941e1fd",
    categoryTypeIdentity: "241e4d36-93f2-4938-9e15-d4536fe3b2eb",
    timezone: "Europe/Dublin",
    baseUrl: "https://scientia-eu-v4-api-d4-01.azurewebsites.net/api/Public",
    defaultProgram: {
      Identity: "d8b3f124-7b90-4bf6-9051-93c6fcf376b5",
      CategoryTypeIdentity: "241e4d36-93f2-4938-9e15-d4536fe3b2eb",
      Name: "TU856/2 - Computer Science (Infrastructure)",
      Description: "BSc (Hons) in Computer Science (Infrastructure)",
    },
  },
  dcu: {
    id: "dcu",
    name: "Dublin City University",
    shortName: "DCU",
    databaseName: "scientia-eu-v4-api-d1-03",
    institutionId: "a1fdee6b-68eb-47b8-b2ac-a4c60c8e6177",
    categoryTypeIdentity: "241e4d36-60e0-49f8-b27e-99416745d98d",
    timezone: "Europe/Dublin",
    baseUrl: "https://scientia-eu-v4-api-d1-03.azurewebsites.net/api/Public",
    defaultProgram: {
      Identity: "d810d60d-8f84-834c-3fce-78cbec883f6e",
      CategoryTypeIdentity: "241e4d36-60e0-49f8-b27e-99416745d98d",
      Name: "COMSCI1 (Computer Science-1)",
      Description: "BSc Computer Science (Computer Science-1) - FT",
    },
  },
};

export const UNIVERSITY_LIST: UniversityOption[] = [
  UNIVERSITIES.tudublin,
  UNIVERSITIES.dcu,
];

export function getActiveUniversity(): UniversityOption {
  try {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("mytimetable_university");
      if (saved && saved in UNIVERSITIES) {
        return UNIVERSITIES[saved as UniversityId];
      }
    }
  } catch {}
  return UNIVERSITIES.tudublin;
}

/**
 * Dynamic proxy that transparently routes config queries to the active university
 */
export const TIMETABLE_CONFIG: UniversityOption = new Proxy(UNIVERSITIES.tudublin, {
  get(_target, prop: string | symbol) {
    const active = getActiveUniversity();
    return Reflect.get(active, prop);
  },
});
