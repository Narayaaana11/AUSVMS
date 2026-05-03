import { cn } from "@/lib/utils";
import { CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";

type StatusType = "pending" | "approved" | "rejected" | "completed" | "warning";

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const statusConfig = {
  pending: {
    icon: Clock,
    label: "Pending",
    className: "bg-warning/10 text-warning border-warning/20 hover:bg-warning/20"
  },
  approved: {
    icon: CheckCircle,
    label: "Approved",
    className: "bg-success/10 text-success border-success/20 hover:bg-success/20"
  },
  rejected: {
    icon: XCircle,
    label: "Rejected",
    className: "bg-error/10 text-error border-error/20 hover:bg-error/20"
  },
  completed: {
    icon: CheckCircle,
    label: "Completed",
    className: "bg-muted text-muted-foreground border-border hover:bg-muted/80"
  },
  warning: {
    icon: AlertCircle,
    label: "Warning",
    className: "bg-warning/10 text-warning border-warning/20 hover:bg-warning/20"
  }
};

const StatusBadge = ({ status, className, size = "md" }: StatusBadgeProps) => {
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  const Icon = config.icon;

  const sizeClasses = {
    sm: "h-6 px-2 text-xs",
    md: "h-7 px-3 text-sm",
    lg: "h-8 px-4 text-sm"
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4"
  };

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 rounded-full border font-medium transition-all duration-200",
      sizeClasses[size],
      config.className,
      className
    )}>
      <Icon className={iconSizes[size]} />
      {config.label}
    </div>
  );
};

export { StatusBadge };