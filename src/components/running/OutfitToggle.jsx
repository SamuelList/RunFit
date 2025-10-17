import React from "react";
import { SegmentedControl } from "../ui";

/**
 * OutfitToggle Component
 * 
 * Toggle between Performance and Comfort outfit options.
 * Only displayed when the two options differ.
 * 
 * @param {Object} props
 * @param {boolean} props.optionsDiffer - Whether Performance and Comfort options are different
 * @param {string} props.activeOption - Currently selected option ('A' = Performance, 'B' = Comfort)
 * @param {Function} props.onChange - Callback when option changes
 */
const OutfitToggle = ({ optionsDiffer, activeOption, onChange }) => {
  if (!optionsDiffer) return null;

  return (
    <SegmentedControl
      value={activeOption}
      onChange={onChange}
      options={[
        { label: "Performance", value: "A" },
        { label: "Comfort", value: "B" },
      ]}
    />
  );
};

export default OutfitToggle;
