export interface DatasetMetadata {
  source: string;
  source_url?: string;
  licence: "Open Government Licence - Canada";
  last_updated: string;
  extracted_at: string;
  notes?: string;
}

export type GeographyCode =
  | "CA"
  | "NL"
  | "PE"
  | "NS"
  | "NB"
  | "QC"
  | "ON"
  | "MB"
  | "SK"
  | "AB"
  | "BC"
  | "YT"
  | "NT"
  | "NU";

export type ImmigrationCategory = "Economic" | "Family" | "Refugee" | "Other";

export interface PopulationYearRecord extends Record<GeographyCode, number> {
  year: number;
}

export interface PopulationHistoryPayload {
  metadata: DatasetMetadata;
  series: PopulationYearRecord[];
}

export type PopulationAgeGroup =
  | "0 to 14 years old"
  | "15 to 29 years old"
  | "30 to 44 years old"
  | "45 to 59 years old"
  | "60 to 74 years old"
  | "75 years old or more";

export interface PopulationAgeGroupRecord {
  year: number;
  geo: GeographyCode;
  ageGroup: PopulationAgeGroup;
  value: number;
}

export interface PopulationAgeGroupsPayload {
  metadata: DatasetMetadata;
  ageGroups: PopulationAgeGroup[];
  series: PopulationAgeGroupRecord[];
}

export type PopulationGrowthComponent =
  | "Births"
  | "Deaths"
  | "Immigrants"
  | "Net emigration"
  | "Net non-permanent residents"
  | "Net interprovincial migration"
  | "Net temporary emigration"
  | "Residual deviation";

export interface PopulationComponentRecord {
  year: number;
  geo: GeographyCode;
  component: PopulationGrowthComponent;
  value: number;
}

export interface PopulationComponentsPayload {
  metadata: DatasetMetadata;
  components: PopulationGrowthComponent[];
  series: PopulationComponentRecord[];
}

export interface ImmigrationYearRecord extends Record<ImmigrationCategory | "Total", number> {
  year: number;
}

export interface ImmigrationTrendsPayload {
  metadata: DatasetMetadata;
  series: ImmigrationYearRecord[];
}

export type EconomicIndicator =
  | "Median employment income"
  | "Unemployment rate"
  | "Employment rate";

export type EconomicUnit = "2024 constant dollars" | "Percent";

export interface EconomicContextRecord {
  year: number;
  geo: GeographyCode;
  indicator: EconomicIndicator;
  value: number;
  unit: EconomicUnit;
}

export interface EconomicContextPayload {
  metadata: DatasetMetadata;
  indicators: EconomicIndicator[];
  series: EconomicContextRecord[];
}

export type ImmigrationBreakdownKind =
  | "countryOfCitizenship"
  | "countryOfCitizenshipByGeo"
  | "ageGroup"
  | "gender"
  | "intendedOccupation";

export interface ImmigrationBreakdownRecord {
  year: number;
  label: string;
  value: number;
  geo?: GeographyCode;
}

export interface ImmigrationBreakdownsPayload {
  metadata: DatasetMetadata;
  dimensions: Record<ImmigrationBreakdownKind, ImmigrationBreakdownRecord[]>;
  countryCategory?: ImmigrationCountryCategoryRecord[];
}

export interface ImmigrationCountryOverviewPayload {
  metadata: DatasetMetadata;
  records: ImmigrationBreakdownRecord[];
}

export interface ImmigrationCountryCategoryRecord {
  year: number;
  country: string;
  category: ImmigrationCategory;
  value: number;
}

export type TemporaryResidentStream =
  | "Study permit holders"
  | "IMP work permit holders"
  | "TFWP work permit holders";

export interface TemporaryResidentRecord {
  year: number;
  geo: GeographyCode;
  stream: TemporaryResidentStream;
  value: number;
}

export interface TemporaryResidentCountryRecord {
  year: number;
  country: string;
  stream: TemporaryResidentStream;
  value: number;
}

export interface TemporaryResidentsPayload {
  metadata: DatasetMetadata;
  streams: TemporaryResidentStream[];
  series: TemporaryResidentRecord[];
  countryOfCitizenship: TemporaryResidentCountryRecord[];
}
