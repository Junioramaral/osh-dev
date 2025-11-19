import * as React from "react";
import InputMask from "react-input-mask";
import { cn } from "@/lib/utils";

export interface PhoneInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <InputMask
        mask="(99) 99999-9999"
        maskChar="_"
        {...props}
        inputRef={ref}
      >
        {(inputProps: any) => (
          <input
            {...inputProps}
            type="tel"
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
              className,
            )}
          />
        )}
      </InputMask>
    );
  },
);
PhoneInput.displayName = "PhoneInput";

export { PhoneInput };
