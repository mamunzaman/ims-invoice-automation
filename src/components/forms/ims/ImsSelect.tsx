"use client";

import {
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
} from "@mui/material";
import { imsSelectMenuProps } from "@/components/forms/ims/imsStyles";

export interface ImsSelectOption {
  value: string;
  label: string;
}

interface ImsSelectProps {
  label: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  options: ImsSelectOption[];
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

export function ImsSelect({
  label,
  name,
  value,
  onChange,
  options,
  error,
  required,
  disabled,
}: ImsSelectProps) {
  const labelId = `${name || label}-label`;

  function handleChange(event: SelectChangeEvent<string>) {
    onChange(event.target.value);
  }

  return (
    <FormControl fullWidth error={Boolean(error)}>
      <InputLabel id={labelId} required={required}>
        {label}
      </InputLabel>
      <Select
        labelId={labelId}
        label={label}
        name={name}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        MenuProps={imsSelectMenuProps}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
      {error ? <FormHelperText>{error}</FormHelperText> : null}
    </FormControl>
  );
}
