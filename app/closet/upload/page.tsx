import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CaptureFlow } from "@/components/capture/capture-flow";

export default async function UploadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  return <CaptureFlow />;
}
