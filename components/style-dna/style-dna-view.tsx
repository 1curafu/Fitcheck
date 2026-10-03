"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import type { StyleDna } from "@/lib/style-dna";
import type { DnaCardInput } from "@/lib/style-dna/card";
import { ShareDna } from "./share-dna";

type Signature = { id: string; name: string; wears: number; imageUrl: string | null };
const pct = (share: number) => Math.round(share * 100);

export function StyleDnaView({ dna, signaturePieces, isPro }: { dna: StyleDna; signaturePieces: Signature[]; isPro: boolean }) {
  const t = useTranslations("styleDna");
  const archetypes = useTranslations("onboarding.questions.archetype.options");
  const palettes = useTranslations("onboarding.questions.palette.options");
  const fits = useTranslations("onboarding.questions.fit.options");
  const colours = useTranslations("vocab.color");
  const materials = useTranslations("vocab.material");
  const occasions = useTranslations("vocab.occasion");
  const named = (a: string | null) => (a && archetypes.has(`${a}.label` as never) ? archetypes(`${a}.label` as never) : a ?? t("noAnswer"));

  const archetype = named(dna.reading.archetype);
  const blurb = `${t(`opening.${dna.blurb.opening}` as never)} ${t(`trait.${dna.blurb.trait}` as never)}`;
  const third = dna.trio.occasion
    ? { value: `${pct(dna.trio.occasion.share)}%`, label: occasions(dna.trio.occasion.key as never) }
    : { value: String(dna.trio.colours), label: t("stats.colours") };
  const stats = [
    { value: String(dna.trio.pieces), label: t("stats.pieces") },
    { value: String(dna.trio.looksWorn), label: t("stats.looksWorn") },
    third,
  ];
  const card: DnaCardInput = {
    kicker: t("kicker"), label: t("yourArchetype"), archetype, blurb,
    swatches: dna.swatches.map((s) => ({ hex: s.hex, label: colours(s.color as never) })),
    stats, footer: t("footer", { count: dna.trio.pieces }),
  };
  const agrees = dna.reading.source === "closet" && dna.reading.archetype === dna.quizArchetype;
  const locked = (s: { status: string; have?: number; need?: number }) =>
    s.status === "locked" ? <p className="text-[14px] text-muted-foreground">{t("locked", { have: s.have!, need: s.need! })}</p> : null;

  return (
    <div className="px-[22px] pb-[120px]">
      <article className="relative mt-[14px] overflow-hidden rounded-[16px] p-5 shadow-[inset_0_0_0_1px_rgba(184,106,71,0.18)] [background:radial-gradient(120%_120%_at_82%_8%,#241d18,#161517)]">
        <span className="text-[10px] uppercase tracking-[0.22em] text-[#b86a47]">{t("yourArchetype")}</span>
        <h2 className="mt-[6px] font-serif text-[44px] leading-[1.02] text-foreground">{archetype}</h2>
        <p className="mt-[6px] text-[12px] text-muted-foreground">
          {dna.reading.source === "quiz" ? t("notEnough") : agrees ? t("agrees") : dna.quizArchetype ? t("youSaid", { archetype: named(dna.quizArchetype) }) : null}
        </p>
        <p className="mt-[14px] font-serif text-[16px] italic leading-[1.45] text-[#c8c1b3]">{blurb}</p>
        <div className="mt-[18px] flex gap-[8px]">
          {dna.swatches.map((s) => (
            <div key={s.color} className="flex-1">
              <div className="h-[44px] rounded-[8px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]" style={{ background: s.hex }} />
              <div className="mt-[6px] text-center text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{colours(s.color as never)}</div>
            </div>
          ))}
        </div>
        <div className="mt-[18px] grid grid-cols-3 gap-2">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="font-serif text-[26px] text-foreground">{s.value}</div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-[16px] border-t border-[rgba(237,230,216,0.12)] pt-[12px] text-[11px] italic text-muted-foreground">{card.footer}</div>
      </article>
      <ShareDna input={card} fileName="fitcheck-style-dna.jpg" />

      {dna.mix.marked > 0 ? (
        <Section title={t("mix.title")}>
          <div className="flex h-[10px] overflow-hidden rounded-full bg-[#201f22]">
            {(["Preppy", "Old Money", "Streetwear"] as const).map((s, i) => (
              <div key={s} style={{ width: `${pct(dna.mix.shares[s])}%`, opacity: 1 - i * 0.25 }} className="bg-[#b89a6a]" />
            ))}
          </div>
          <ul className="mt-[10px] space-y-1 text-[14px]">
            {(["Preppy", "Old Money", "Streetwear"] as const).filter((s) => dna.mix.shares[s] > 0).map((s) => (
              <li key={s} className="flex justify-between"><span>{named(s)}</span><span>{pct(dna.mix.shares[s])}%</span></li>
            ))}
          </ul>
          <p className="mt-[8px] text-[12px] text-muted-foreground">{t("mix.caption", { marked: dna.mix.marked, total: dna.mix.garments })}</p>
        </Section>
      ) : null}

      {dna.quiz.palette || dna.quiz.fit ? (
        <Section title={t("quiz.title")}>
          {dna.quiz.palette ? <p className="text-[14px]">{t("quiz.palette", { palette: palettes(`${dna.quiz.palette.answer}.label` as never), pct: pct(dna.quiz.palette.share) })}</p> : null}
          {dna.quiz.fit ? <p className="mt-1 text-[14px]">{t("quiz.fit", { fit: fits(`${dna.quiz.fit.answer}.label` as never), pct: pct(dna.quiz.fit.share) })}</p> : null}
        </Section>
      ) : null}

      <Section title={t("tendencies.title")}>
        {(["cut", "tonal", "pattern", "heritage"] as const).map((key) => {
          const v = dna.tendencies[key];
          return v ? (
            <div key={key} className="mb-[12px]">
              <div className="flex justify-between text-[13px]"><span>{t(`tendencies.${key}` as never)}</span><span className="text-muted-foreground">{t(`tendencies.level.${v.level}` as never)}</span></div>
              <div className="mt-[6px] h-[4px] rounded-full bg-[#201f22]"><div className="h-full rounded-full bg-[#b89a6a]" style={{ width: `${pct(v.value)}%` }} /></div>
            </div>
          ) : null;
        })}
      </Section>

      <Section title={t("formula.title")}>
        {locked(dna.formula) ?? (dna.formula.status === "found"
          ? <p><span className="block font-serif text-[20px]">{dna.formula.kinds.map((k) => t(`kind.${k}` as never)).join(" + ")}</span><span className="block text-[12px] text-muted-foreground">{t("formula.worn", { count: dna.formula.wears })}</span></p>
          : <p className="text-[14px] text-muted-foreground">{t("formula.none")}</p>)}
      </Section>

      <Section title={t("pairing.title")}>
        {locked(dna.pairing) ?? (dna.pairing.status === "found" ? (
          <div className="flex items-center gap-[10px]">
            {dna.pairing.colors.map((c) => <span key={c} className="size-[28px] rounded-[7px]" style={{ background: dna.swatches.find((s) => s.color === c)?.hex ?? "#8a8a8f" }} aria-hidden />)}
            <span className="text-[14px]">{dna.pairing.colors.map((c) => colours(c as never)).join(" + ")}</span>
            <span className="text-[14px] text-muted-foreground">{t(`pairing.${dna.pairing.verdict}` as never)}</span>
          </div>
        ) : <p className="text-[14px] text-muted-foreground">{t("pairing.none")}</p>)}
      </Section>

      {dna.fabric ? (
        <Section title={t("fabric.title")}>
          <p className="text-[14px]">{t(`fabric.${dna.fabric.level}` as never)}</p>
          <p className="mt-1 text-[12px] text-muted-foreground">{dna.fabric.top.map((m) => materials(m as never)).join(" · ")}</p>
        </Section>
      ) : null}

      {dna.dressy ? (
        <Section title={t("dressy.title")}>
          {locked(dna.dressy) ?? (dna.dressy.status === "found" ? (
            <>
              <p className="text-[14px]">{t(`dressy.${dna.dressy.verdict}` as never)}</p>
              <p className="mt-1 text-[12px] text-muted-foreground">{t("dressy.scale", { owned: dna.dressy.owned, worn: dna.dressy.worn })}</p>
            </>
          ) : null)}
        </Section>
      ) : null}

      <Section title={t("signature.title")}>
        {locked(dna.signature) ?? (signaturePieces.length ? (
          <div className="grid grid-cols-3 gap-[10px]">
            {signaturePieces.map((p) => (
              <Link key={p.id} href={`/closet/${p.id}`} className="block">
                <div className="aspect-square overflow-hidden rounded-[12px] bg-[#201f22]">
                  {p.imageUrl ? <img src={p.imageUrl} alt="" className="size-full object-contain" /> : null}
                </div>
                <div className="mt-[6px] truncate text-[12px]">{p.name}</div>
              </Link>
            ))}
          </div>
        ) : <p className="text-[14px] text-muted-foreground">{t("signature.none")}</p>)}
      </Section>

      <Link href="/stats" className="mt-[22px] flex items-center justify-between rounded-[14px] p-4 shadow-[inset_0_0_0_1px_rgba(237,230,216,0.08)]">
        <span>
          <span className="block font-serif text-[18px]">{t("teaser.title")}</span>
          <span className="block text-[13px] text-muted-foreground">{t("teaser.body")}</span>
        </span>
        {isPro ? null : <span className="rounded-full px-2 py-[2px] text-[11px] uppercase tracking-[0.16em] shadow-[inset_0_0_0_1px_rgba(237,230,216,0.2)]">{t("teaser.pro")}</span>}
      </Link>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-[26px]">
      <h2 className="mb-[10px] text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}
