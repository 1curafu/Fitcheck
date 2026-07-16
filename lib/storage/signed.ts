import { createClient } from "@/lib/supabase/server";

export async function signItemImages(paths: string[], expiresIn = 3600) {
  const map = new Map<string, string>();
  if (paths.length === 0) return map;
  const supabase = await createClient();
  const { data } = await supabase.storage
    .from("wardrobe")
    .createSignedUrls(paths, expiresIn);
  data?.forEach((d) => {
    if (d.path && d.signedUrl) map.set(d.path, d.signedUrl);
  });
  return map;
}

export function displayPath(item: { cutout_url: string | null; image_url: string }) {
  return item.cutout_url ?? item.image_url;
}
