import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CaptureFlow } from "@/components/capture/capture-flow";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function UploadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  return <CaptureFlow />;
}
