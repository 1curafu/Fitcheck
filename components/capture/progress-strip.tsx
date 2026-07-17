export function ProgressStrip({ filled, total = 5 }: { filled: number; total?: number }) {
  return (
    <div className="mt-6 flex justify-center gap-[10px]">
      {Array.from({ length: total }, (_, i) => {
        const isFilled = i < filled;
        return (
          <div
            key={i}
            data-filled={isFilled}
            className={`flex aspect-square max-w-[54px] flex-1 items-center justify-center rounded-[11px] border transition-all duration-300 ${
              isFilled
                ? "border-brand/40 bg-[#1c1b1e]"
                : "border-foreground/[0.07] bg-[#141315]"
            }`}
          >
            {!isFilled && <span className="text-[13px] text-[#3b3a3d]">{i + 1}</span>}
          </div>
        );
      })}
    </div>
  );
}
