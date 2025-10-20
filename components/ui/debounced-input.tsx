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

    // Helper function to truncate a number to specified decimal places without rounding
    const truncateToDecimals = useCallback(
      (num: number, decimals: number): number => {
        const numStr = num.toString();
        const decimalIndex = numStr.indexOf(".");

        // If no decimal point or precision is 0, return the integer part
        if (decimalIndex === -1 || decimals === 0) {
          return Math.floor(num);
        }

        // Extract the truncated string up to the desired decimal places
        const truncatedStr = numStr.slice(0, decimalIndex + decimals + 1);
        return parseFloat(truncatedStr);
      },
      []
    );

    // Helper function to evaluate simple mathematical expressions
    const evaluateExpression = useCallback((expr: string): number => {
      try {
        // Remove whitespace
        const cleaned = expr.replace(/\s/g, "");

        // Security: Only allow numbers, basic operators, parentheses, and decimal points
        if (!/^[0-9+\-*/().]+$/.test(cleaned)) {
          return NaN;
        }

        // Evaluate the expression using Function constructor (safer than eval)
        const result = new Function(`return ${cleaned}`)();
        return typeof result === "number" && !isNaN(result) ? result : NaN;
      } catch {
        return NaN;
      }
    }, []);
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        isEditingRef.current = true;
        const inputValue = e.target.value;
        setDisplayValue(inputValue);

        if (type === "number") {
          if (inputValue === "" || inputValue === "-") {
            setLocalValue(0);
          } else {
            // Check if it contains operators (it's an expression)
            const hasOperator = /[+\-*/()]/.test(inputValue);

            if (!hasOperator) {
              // Simple number, parse it directly but keep it as a number
              const numValue = parseFloat(inputValue);
              if (!isNaN(numValue)) {
                // Keep localValue as a raw number, don't apply formatting here
                setLocalValue(numValue);
              }
            }
            // For expressions with operators, don't evaluate here
            // Wait for blur or Enter key to evaluate the complete expression
          }
        } else {
          setLocalValue(inputValue);
        }
      },
      [type, precision]
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
        // Always use displayValue as the source of truth for what user typed
        const currentValue = displayValue.trim();

        // Check if the display value contains operators (it's an expression)
        const hasOperator = /[+\-*/()]/.test(currentValue);

        let numValue: number;
        if (hasOperator) {
          // Evaluate the expression
          numValue = evaluateExpression(currentValue);
          if (isNaN(numValue)) {
            numValue = Number(localValue); // Fallback to last valid value
          }
        } else {
          // Parse the current displayed value directly
          numValue = parseFloat(currentValue);
          if (isNaN(numValue)) {
            numValue = Number(localValue); // Fallback to last valid value
          }
        }

        // Only proceed if we have a valid number
        if (!isNaN(numValue) && isFinite(numValue)) {
          // Truncate to the specified precision without rounding
          const truncatedValue = truncateToDecimals(numValue, precision);

          // Format the display with toFixed
          const formatted = truncatedValue.toFixed(precision);

          setDisplayValue(formatted);
          // Update the actual value with the truncated number
          setLocalValue(truncatedValue);
          onChange(truncatedValue);
        }
      }
    }, [
      type,
      precision,
      localValue,
      displayValue,
      evaluateExpression,
      truncateToDecimals,
      onChange,
    ]);

    // Handle Enter key to apply precision
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (e.key === "Enter") {
          e.preventDefault(); // Prevent form submission
          isEditingRef.current = false;
          if (type === "number" && precision !== undefined) {
            // Always use displayValue as the source of truth for what user typed
            const currentValue = displayValue.trim();

            // Check if the display value contains operators (it's an expression)
            const hasOperator = /[+\-*/()]/.test(currentValue);

            let numValue: number;
            if (hasOperator) {
              // Evaluate the expression
              numValue = evaluateExpression(currentValue);
              if (isNaN(numValue)) {
                numValue = Number(localValue); // Fallback to last valid value
              }
            } else {
              // Parse the current displayed value directly
              numValue = parseFloat(currentValue);
              if (isNaN(numValue)) {
                numValue = Number(localValue); // Fallback to last valid value
              }
            }

            // Only proceed if we have a valid number
            if (!isNaN(numValue) && isFinite(numValue)) {
              // Truncate to the specified precision without rounding
              const truncatedValue = truncateToDecimals(numValue, precision);

              // Format the display with toFixed
              const formatted = truncatedValue.toFixed(precision);

              setDisplayValue(formatted);
              // Update the actual value with the truncated number
              setLocalValue(truncatedValue);
              onChange(truncatedValue);
            }
          }
          // Blur the input to trigger debounced save
          if (inputRef.current) inputRef.current.blur();
          if (textareaRef.current) textareaRef.current.blur();
        }
      },
      [
        type,
        precision,
        localValue,
        displayValue,
        evaluateExpression,
        truncateToDecimals,
        onChange,
      ]
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
