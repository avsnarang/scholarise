import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface PhoneInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  countryCode?: string;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value, onChange, countryCode = "+91", ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState("");

    // Initialize display value from prop value
    React.useEffect(() => {
      if (value) {
        const stringValue = String(value);
        // If value already has country code, use as is
        if (stringValue.startsWith(countryCode)) {
          setDisplayValue(stringValue.substring(countryCode.length));
        } else if (stringValue.startsWith("+")) {
          // Has different country code, strip it for display
          const numberPart = stringValue.replace(/^\+\d+/, "");
          setDisplayValue(numberPart);
        } else {
          // Just the number without country code
          setDisplayValue(stringValue);
        }
      } else {
        setDisplayValue("");
      }
    }, [value, countryCode]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      
      // Remove any non-digit characters
      const cleaned = input.replace(/\D/g, "");
      
      // Limit to 10 digits for Indian numbers
      const limited = cleaned.substring(0, 10);
      
      setDisplayValue(limited);
      
      // Create synthetic event with full phone number including country code
      const fullNumber = limited ? `${countryCode}${limited}` : "";
      
      if (onChange) {
        const syntheticEvent = {
          ...e,
          target: {
            ...e.target,
            value: fullNumber,
            name: e.target.name,
          },
        };
        onChange(syntheticEvent as React.ChangeEvent<HTMLInputElement>);
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // Format display on blur if we have a valid number
      if (displayValue && displayValue.length === 10) {
        // You can add formatting here if needed, e.g., "98765 43210"
      }
      
      if (props.onBlur) {
        props.onBlur(e);
      }
    };

    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
          {countryCode}
        </span>
        <Input
          ref={ref}
          type="tel"
          inputMode="numeric"
          className={cn("pl-12", className)}
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="9876543210"
          maxLength={10}
          {...props}
        />
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";

export { PhoneInput }; 