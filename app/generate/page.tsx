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
    // No bottom padding: the sticky nav occupies its own space in flow at the
    // end of the page, so nothing sits under it. The old pb-[76px] was both
    // unnecessary and 31px short of the nav's actual height.
    <div className="flex min-h-dvh flex-1 flex-col">
      <Stylist />
      <MobileNav />
    </div>
  );
}
