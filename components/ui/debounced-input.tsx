"use client";
import React, { useState, useEffect, useCallback } from "react";

interface DebouncedInputProps {
  value: string | number;
  onChange: (value: string | number) => void;
  delay?: number;
  type?: "text" | "number" | "textarea";
  step?: string;
  className?: string;
  title?: string;
  placeholder?: string;
}

const DebouncedInput = React.memo(({
  value,
  onChange,
  delay = 300,
  type = "text",
  step,
  className,
  title,
  placeholder,
}: DebouncedInputProps) => {
  const [localValue, setLocalValue] = useState(value);

  // Update local value when external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced onChange handler
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [localValue, delay, onChange, value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = type === "number" 
      ? (e.target.value === "" ? 0 : (type === "number" && step ? parseFloat(e.target.value) : parseInt(e.target.value)))
      : e.target.value;
    setLocalValue(newValue);
  }, [type, step]);

  if (type === "textarea") {
    return (
      <textarea
        value={localValue}
        onChange={handleChange}
        className={className}
        title={title}
        placeholder={placeholder}
      />
    );
  }

  return (
    <input
      type={type}
      value={localValue}
      onChange={handleChange}
      step={step}
      className={className}
      title={title}
      placeholder={placeholder}
    />
  );
});

DebouncedInput.displayName = "DebouncedInput";

export default DebouncedInput;