export const RADIUS_OPTIONS = [25, 50, 100, 200, 500];

export const YEAR_OPTIONS = (() => {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let year = current + 1; year >= 2000; year--) years.push(year);
  return years;
})();

export const KM_OPTIONS = [
  { value: "", label: "Qualsiasi" },
  { value: "10000", label: "10.000 km" },
  { value: "25000", label: "25.000 km" },
  { value: "50000", label: "50.000 km" },
  { value: "75000", label: "75.000 km" },
  { value: "100000", label: "100.000 km" },
  { value: "150000", label: "150.000 km" },
  { value: "200000", label: "200.000 km" },
];

export const FUEL_OPTIONS = [
  { value: "", label: "Qualsiasi" },
  { value: "benzina", label: "Benzina" },
  { value: "diesel", label: "Diesel" },
  { value: "elettrica", label: "Elettrica" },
  { value: "gpl", label: "GPL" },
  { value: "metano", label: "Metano" },
  { value: "ibrida", label: "Ibrida" },
];
