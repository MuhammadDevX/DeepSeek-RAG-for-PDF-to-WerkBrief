"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";

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

const DebouncedInput = React.memo(
  ({
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
    const inputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

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

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (type === "number") {
          const inputValue = e.target.value;
          if (inputValue === "" || inputValue === "-") {
            setLocalValue(0);
          } else {
            const numValue = parseFloat(inputValue);
            setLocalValue(isNaN(numValue) ? 0 : numValue);
          }
        } else {
          setLocalValue(e.target.value);
        }
      },
      [type]
    );

    // Auto-select content when field is focused
    const handleFocus = useCallback(
      (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        e.target.select();
      },
      []
    );

    if (type === "textarea") {
      return (
        <textarea
          ref={textareaRef}
          value={localValue}
          onChange={handleChange}
          onFocus={handleFocus}
          className={className}
          title={title}
          placeholder={placeholder}
        />
      );
    }

    return (
      <input
        ref={inputRef}
        type={type}
        value={localValue}
        onChange={handleChange}
        onFocus={handleFocus}
        step={step}
        className={className}
        title={title}
        placeholder={placeholder}
      />
    );
  }
);

DebouncedInput.displayName = "DebouncedInput";

export default DebouncedInput;
