import { useMemo } from "react";
import Select from "react-select";
import { getTimeZones } from "@vvo/tzdb";

interface TimezoneInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function TimezoneInput({ value, onChange }: TimezoneInputProps) {
  const timezones = useMemo(() => getTimeZones(), []);

  const options = useMemo(
    () =>
      timezones.map((tz) => ({
        label: `${tz.name} (UTC${tz.currentTimeFormat})`,
        value: tz.name,
      })),
    [timezones]
  );

  // current selected value
  const selected = options.find((opt) => opt.value === value) || null;

  return (
    <Select
      options={options}
      value={selected}
      onChange={(opt) => {
        if (!opt) onChange('');
        else onChange(opt.value);
      }}
      isClearable
      placeholder="Search or select timezone..."
      styles={{
        control: (base) => ({
          ...base,
          borderRadius: "6px",
          borderColor: "#ccc",
          minHeight: "38px",
        }),
        menu: (base) => ({
          ...base,
          zIndex: 20,
        }),
      }}
    />
  );
}

