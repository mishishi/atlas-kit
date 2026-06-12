import { cn } from "@/lib/utils";
import { formatScore } from "@/lib/utils";

interface ScoreBadgeProps {
  score: number;
  className?: string;
}

export function ScoreBadge({ score, className }: ScoreBadgeProps) {
  const isExcellent = score >= 9.5;
  const isGood = score >= 9.0 && score < 9.5;
  return (
    <div
      className={cn(
        "inline-flex items-baseline gap-0.5 rounded-full px-2.5 py-1 font-serif text-sm font-bold",
        "backdrop-blur-md border shadow-card",
        isExcellent && "bg-gold/90 border-gold-deep text-cream",
        isGood && "bg-sage/90 border-sage-deep text-cream",
        !isExcellent && !isGood && "bg-card/90 border-border text-foreground",
        className,
      )}
      aria-label={`评分 ${formatScore(score)}`}
    >
      <span>{formatScore(score)}</span>
      <span className="text-[10px] font-normal opacity-70">/10</span>
    </div>
  );
}