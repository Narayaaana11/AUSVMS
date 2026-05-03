import { useState } from "react";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "../overlay";
import { Calendar } from "./calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DatePickerInputProps {
    value?: Date;
    onChange: (date?: Date) => void;
    disablePastDates?: boolean;
    disableSundays?: boolean;
    minDate?: Date;
    disabled?: (date: Date) => boolean;
    placeholder?: string;
    className?: string;
}

export const DatePickerInput: React.FC<DatePickerInputProps> = ({
    value,
    onChange,
    disablePastDates = false,
    disableSundays = false,
    minDate,
    disabled,
    placeholder = "Pick a date",
    className,
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const isDateDisabled = (date: Date) => {
        // Custom disabled function takes precedence
        if (disabled) return disabled(date);

        const checks = [];

        // Disable past dates if requested
        if (disablePastDates) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            checks.push(date < today);
        }

        // Disable Sundays if requested
        if (disableSundays) {
            checks.push(date.getDay() === 0);
        }

        // Disable dates before minDate if provided
        if (minDate) {
            checks.push(date < minDate);
        }

        return checks.some(Boolean);
    };

    const handleDateSelect = (date: Date | undefined) => {
        console.log('📅 Date picker value changed:', date);
        onChange(date);
        setIsOpen(false);
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "w-full pl-3 text-left font-normal h-11",
                        !value && "text-muted-foreground",
                        className
                    )}
                >
                    {value ? format(value, "PPP") : <span>{placeholder}</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={value}
                    onSelect={handleDateSelect}
                    disabled={isDateDisabled}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    );
};
