import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { cn } from "@/lib/utils";

interface TimePickerSelectProps {
    value?: string;
    onChange: (time: string) => void;
    placeholder?: string;
    className?: string;
    timeSlots?: string[];
}

const DEFAULT_TIME_SLOTS = [
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "12:00",
    "12:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
    "17:00",
    "17:30",
];

export const TimePickerSelect: React.FC<TimePickerSelectProps> = ({
    value,
    onChange,
    placeholder = "Select time",
    className,
    timeSlots = DEFAULT_TIME_SLOTS,
}) => {
    const handleValueChange = (time: string) => {
        console.log('🕐 Time slot selected:', time);
        onChange(time);
    };

    return (
        <Select value={value || ""} onValueChange={handleValueChange}>
            <SelectTrigger className={cn("h-11 w-full", className)}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent className="max-h-60">
                {timeSlots && timeSlots.length > 0 ? (
                    timeSlots.map((t) => (
                        <SelectItem key={t} value={t}>
                            {t}
                        </SelectItem>
                    ))
                ) : (
                    <div className="py-2 px-2 text-sm text-center text-muted-foreground">
                        No times available
                    </div>
                )}
            </SelectContent>
        </Select>
    );
};
