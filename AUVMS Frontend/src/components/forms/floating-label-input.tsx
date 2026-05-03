import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface FloatingLabelInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const FloatingLabelInput = forwardRef<HTMLInputElement, FloatingLabelInputProps>(
  ({ className, type = "text", label, error, ...props }, ref) => {
    return (
      <div className="relative">
        <input
          type={type}
          className={cn(
            "peer flex h-14 w-full rounded-lg border border-input bg-surface px-4 pt-6 pb-2 text-sm transition-all duration-200",
            "placeholder:text-transparent",
            "focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-error focus:border-error focus:ring-error/20",
            className
          )}
          placeholder={label}
          ref={ref}
          {...props}
        />
        <label
          className={cn(
            "absolute left-4 top-4 text-sm text-muted-foreground transition-all duration-200 pointer-events-none",
            "peer-focus:top-2 peer-focus:text-xs peer-focus:text-primary",
            "peer-[&:not(:placeholder-shown)]:top-2 peer-[&:not(:placeholder-shown)]:text-xs",
            error && "peer-focus:text-error"
          )}
        >
          {label}
        </label>
        {error && (
          <p className="mt-1 text-sm text-error animate-slide-in-up">
            {error}
          </p>
        )}
      </div>
    );
  }
);

FloatingLabelInput.displayName = "FloatingLabelInput";

export { FloatingLabelInput };