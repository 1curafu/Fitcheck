import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MobileNav } from "@/components/shell/mobile-nav";
import { Stylist } from "@/components/generate/stylist";

export default async function GeneratePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  return (
    <div className="flex min-h-dvh flex-1 flex-col pb-[76px]">
      <Stylist />
      <MobileNav />
    </div>
  );
}
