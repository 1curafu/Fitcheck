import { Suspense } from "react";
import { redirect } from "@/lib/i18n/navigation";
import { getLocale } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { CaptureFlow } from "@/components/capture/capture-flow";

export default function UploadPage() {
  // The session read is what blocks a shell, so it moves behind a boundary
  // and the route's chrome prerenders and prefetches without it.
  return (
    <Suspense fallback={null}>
      <UploadBody />
    </Suspense>
  );
}

async function UploadBody() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect({ href: "/sign-in", locale: await getLocale() });
  return <CaptureFlow />;
}
