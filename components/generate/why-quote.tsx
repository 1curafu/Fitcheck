// The signature element (README §7 / DESIGN.md Italic Why Rule): the one-sentence
// reasoning as a hero italic pull-quote, led by the rust "f" glyph (D5), the look
// name below as secondary tracked-caps metadata (D2: muted-foreground, never faint).

export function WhyQuote({ name, why }: { name: string; why: string }) {
  return (
    <div className="mt-[14px]">
      <p className="font-serif text-[18px] italic leading-[1.36] text-foreground text-pretty">
        <span
          aria-hidden="true"
          className="mr-2 inline-flex h-5 w-5 translate-y-0.5 items-center justify-center rounded-full bg-brand align-middle font-serif text-[12px] not-italic text-canvas"
        >
          f
        </span>
        {why}
      </p>
      <p className="mt-[10px] text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">{name}</p>
    </div>
  );
}
