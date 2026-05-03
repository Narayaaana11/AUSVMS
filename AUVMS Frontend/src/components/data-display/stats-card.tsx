import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

const StatsCard = ({ title, value, description, icon, trend, className }: StatsCardProps) => {
  return (
    <div className={cn(
      "group relative overflow-hidden rounded-xl border bg-gradient-surface p-6 transition-all duration-300",
      "hover:shadow-enterprise-lg hover:scale-[1.02] hover:border-primary/20",
      "interactive-lg",
      className
    )}>
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold tracking-tight">{value}</h3>
            {trend && (
              <span className={cn(
                "text-sm font-medium",
                trend.isPositive ? "text-success" : "text-error"
              )}>
                {trend.isPositive ? "+" : ""}{trend.value}%
              </span>
            )}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        
        <div className={cn(
          "flex h-12 w-12 items-center justify-center rounded-lg",
          "bg-primary/10 text-primary transition-all duration-300",
          "group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110"
        )}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export { StatsCard };