export type SearchRequestParams = {
  make: string;
  model: string;
  location: string;
  locationType: string;
  radius: string;
  page: number;
  sort: string;
  yearFrom: string;
  yearTo: string;
  kmMax: string;
  priceFrom: string;
  priceTo: string;
  fuel: string;
  snapshotId: string;
};

const OPTIONAL_SEARCH_PARAMS = [
  "location",
  "locationType",
  "yearFrom",
  "yearTo",
  "kmMax",
  "priceFrom",
  "priceTo",
  "fuel",
  "snapshotId",
] as const satisfies readonly (keyof SearchRequestParams)[];

const REQUEST_KEY_PARAMS = [
  "make",
  "model",
  "location",
  "locationType",
  "radius",
  "page",
  "sort",
  "yearFrom",
  "yearTo",
  "kmMax",
  "priceFrom",
  "priceTo",
  "fuel",
  "snapshotId",
] as const satisfies readonly (keyof SearchRequestParams)[];

const RESULTS_VIEW_KEY_PARAMS = [
  "make",
  "model",
  "location",
  "locationType",
  "radius",
  "sort",
  "yearFrom",
  "yearTo",
  "kmMax",
  "priceFrom",
  "priceTo",
  "fuel",
] as const satisfies readonly (keyof SearchRequestParams)[];

export function appendOptionalSearchParams(params: URLSearchParams, values: SearchRequestParams) {
  for (const key of OPTIONAL_SEARCH_PARAMS) {
    const value = values[key];
    if (value) params.set(key, String(value));
  }
}

export function createSearchParams(values: SearchRequestParams, pageValue = String(values.page)) {
  const params = new URLSearchParams({
    make: values.make,
    model: values.model,
    radius: values.radius,
    page: pageValue,
    sort: values.sort,
  });
  appendOptionalSearchParams(params, values);
  return params;
}

export function createRequestKey(params: SearchRequestParams) {
  return REQUEST_KEY_PARAMS.map((key) => params[key]).join("|");
}

export function createResultsViewKey(params: SearchRequestParams) {
  return RESULTS_VIEW_KEY_PARAMS.map((key) => params[key]).join("|");
}
