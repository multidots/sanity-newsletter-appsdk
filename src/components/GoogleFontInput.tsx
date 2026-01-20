import React, { useEffect, useState } from "react";
import Select from "react-select";

interface GoogleFont {
  family: string;
}

interface GoogleFontInputProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
}

const GoogleFontInput: React.FC<GoogleFontInputProps> = ({
  value,
  onChange,
  label,
}) => {
  const [fonts, setFonts] = useState<{ label: string; value: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFonts() {
      try {
        const res = await fetch(
          `https://www.googleapis.com/webfonts/v1/webfonts?key=AIzaSyCx-v15Te-mZLHyG4eEWhAZicfOMh_tRd0&sort=popularity`
        );
        const data = await res.json();
        const options =
          data.items?.map((font: GoogleFont) => ({
            label: font.family,
            value: font.family,
          })) || [];
        setFonts(options);
      } catch (err) {
        console.error("Error fetching Google Fonts:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchFonts();
  }, []);

  const handleChange = (selected: any) => {
    const newValue = selected?.value || '';
    onChange(newValue);
  };

  const selectedOption = value ? { label: value, value } : null;

  return (
    <div className="google-font-input">
      {label && <label className="setting-label">{label}</label>}
      
      {loading ? (
        <div className="font-loading">Loading fonts...</div>
      ) : (
        <>
          <Select
            options={fonts}
            value={selectedOption}
            onChange={handleChange}
            isClearable
            isSearchable
            placeholder="Search and select a Google font..."
            styles={{
              control: (base) => ({
                ...base,
                borderRadius: "6px",
                borderColor: "#ccc",
                minHeight: "38px",
                backgroundColor: "#f2f3f4",
                fontSize: "14px",
              }),
              menu: (base) => ({
                ...base,
                zIndex: 20,
              }),
            }}
          />
          
          {value && (
            <div className="font-preview" style={{ fontFamily: value, fontSize: "1.5rem", marginTop: "12px", padding: "12px", backgroundColor: "#f5f5f5", borderRadius: "6px" }}>
              Preview: {value}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GoogleFontInput;


