import moment from "moment-timezone";

export interface ProgramSearchResult {
  Identity: string;
  CategoryTypeIdentity: string;
  Name: string;
  Description?: string;
  ParentIdentity?: string | null;
}

export interface RawTimetableProperty {
  Name: string;
  Value: string;
}

export interface RawTimetableEvent {
  Identity: string;
  StartDateTime: string;
  EndDateTime: string;
  Name: string;
  Description?: string;
  EventType?: string;
  Location?: string;
  ExtraProperties?: RawTimetableProperty[];
}

export interface StaffLocation {
  nameSpecification: string | null; // e.g. "Group A"
  location: string | null;          // e.g. "CQ-112 Central Quad"
  locationDetails?: string[];
  staffName?: string | null;        // e.g. "Dr. Alan Turing"
}

export interface NormalizedLesson {
  id: string;
  StartDateTime: moment.Moment;
  EndDateTime: moment.Moment;
  Location: string | null;
  Description: string;
  Name: string;
  EventType: string;
  staffName?: string | null;
  collapsedLocations?: boolean;
  Locations?: StaffLocation[];
}

export interface DayData {
  day: moment.Moment;
  dateKey: string; // YYYY-MM-DD
  lessons: NormalizedLesson[];
  breaks: DayBreak[];
}

export interface DayBreak {
  id: string;
  start: moment.Moment;
  end: moment.Moment;
  durationMinutes: number;
}

export type WeekSchedule = DayData[];

export type EventCategoryType = 
  | "lecture"
  | "laboratory"
  | "tutorial"
  | "studio"
  | "kitchen"
  | "music"
  | "off-site"
  | "clinical"
  | "other";
