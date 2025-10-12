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
  precision?: number; // Number of decimal places to format to
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
    precision,
  }: DebouncedInputProps) => {
    const [localValue, setLocalValue] = useState(value);
    const [displayValue, setDisplayValue] = useState(String(value));
    const inputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const isEditingRef = useRef(false);

    // Update local value when external value changes (only when not editing)
    useEffect(() => {
      if (!isEditingRef.current) {
        setLocalValue(value);
        if (type === "number" && precision !== undefined) {
          setDisplayValue(Number(value).toFixed(precision));
        } else {
          setDisplayValue(String(value));
        }
      }
    }, [value, type, precision]);

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
        isEditingRef.current = true;
        const inputValue = e.target.value;
        setDisplayValue(inputValue);

        if (type === "number") {
          if (inputValue === "" || inputValue === "-") {
            setLocalValue(0);
          } else {
            const numValue = parseFloat(inputValue);
            setLocalValue(isNaN(numValue) ? 0 : numValue);
          }
        } else {
          setLocalValue(inputValue);
        }
      },
      [type]
    );

    // Auto-select content when field is focused
    const handleFocus = useCallback(
      (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        isEditingRef.current = true;
        e.target.select();
      },
      []
    );

    // Apply precision formatting on blur
    const handleBlur = useCallback(() => {
      isEditingRef.current = false;
      if (type === "number" && precision !== undefined) {
        const numValue = Number(localValue);
        const formatted = numValue.toFixed(precision);
        setDisplayValue(formatted);
        // Update the actual value with the parsed number
        const finalValue = parseFloat(formatted);
        if (finalValue !== localValue) {
          setLocalValue(finalValue);
          onChange(finalValue);
        }
      }
    }, [type, precision, localValue, onChange]);

    // Handle Enter key to apply precision
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (e.key === "Enter") {
          isEditingRef.current = false;
          if (type === "number" && precision !== undefined) {
            const numValue = Number(localValue);
            const formatted = numValue.toFixed(precision);
            setDisplayValue(formatted);
            // Update the actual value with the parsed number
            const finalValue = parseFloat(formatted);
            if (finalValue !== localValue) {
              setLocalValue(finalValue);
              onChange(finalValue);
            }
          }
          // Blur the input to trigger debounced save
          if (inputRef.current) inputRef.current.blur();
          if (textareaRef.current) textareaRef.current.blur();
        }
      },
      [type, precision, localValue, onChange]
    );

    if (type === "textarea") {
      return (
        <textarea
          ref={textareaRef}
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
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
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
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
