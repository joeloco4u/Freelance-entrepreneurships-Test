import {
  isLocationCode,
  LOCATIONS,
  type LocationCode,
} from "../../config/locations";

const BADGE_STYLES: Record<LocationCode, string> = {
  VF: "bg-blue-50 text-blue-600 border-blue-100",
  GO: "bg-slate-100 text-slate-600 border-slate-200",
};

interface Props {
  codes: LocationCode[];
}

export function SedeBadge({ codes }: Props) {
  const validCodes = codes.filter(isLocationCode);

  if (validCodes.length === 0) {
    return (
      <span className="text-xs text-gray-300" role="img" aria-label="Sin sede">
        —
      </span>
    );
  }

  return (
    <div
      role="group"
      className="flex items-center gap-1.5"
      aria-label={`Sedes: ${validCodes.map((code) => LOCATIONS[code].name).join(", ")}`}
    >
      {validCodes.map((code) => (
        <span
          key={code}
          title={LOCATIONS[code].name}
          aria-hidden="true"
          className={`inline-flex items-center px-1.5 py-0.5 rounded-md border text-[10px] font-bold uppercase ${BADGE_STYLES[code]}`}
        >
          {code}
        </span>
      ))}
    </div>
  );
}
