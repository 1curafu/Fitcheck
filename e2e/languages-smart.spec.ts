import { test,expect } from "@playwright/test";
import { admin,testUserId } from "./helpers";

test.use({storageState:"e2e/.auth/state.json"});
test("historical look translates on visit while its saved original stays intact",async({page})=>{
 const url=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
 expect(["localhost","127.0.0.1"]).toContain(url.hostname);
 const db=admin(),userId=await testUserId();
 const profile=await db.from("profiles").select("preferences").eq("id",userId).single();
 const user=await db.auth.admin.getUserById(userId);
 try {
 const columns="id,look_name,ai_reasoning,text_locale,layout,is_favorite,generated_on,weather_snapshot";
 const before=await db.from("outfits").select(columns).eq("user_id",userId).eq("look_name","E2E Seeded Look").single();
 expect(before.error).toBeNull();expect(before.data).toBeTruthy();
 const usage=await db.from("generation_events").select("id",{count:"exact",head:true}).eq("user_id",userId);
 await page.goto(`/uk/outfits/${before.data!.id}`);
 await expect(page.getByRole("heading",{name:"Тихий ранок",exact:true})).toBeVisible({timeout:15_000});
 const after=await db.from("outfits").select(columns).eq("id",before.data!.id).single();
 expect(after.error).toBeNull();expect(after.data).toEqual(before.data);
 const nextUsage=await db.from("generation_events").select("id",{count:"exact",head:true}).eq("user_id",userId);
 expect(nextUsage.count).toBe(usage.count);
 await page.goto("/uk/settings");
 await page.getByRole("button",{name:"Українська",exact:true}).click();
 await page.getByRole("button",{name:"English (US)",exact:true}).click();
 await expect(page).toHaveURL(/\/settings$/,{timeout:15_000});
 await expect(page.locator("html")).toHaveAttribute("lang","en-US");
 await page.goto(`/outfits/${before.data!.id}`);
 await expect(page.getByRole("heading",{name:"E2E Seeded Look",exact:true})).toBeVisible();
 } finally {
  await db.from("profiles").update({preferences:profile.data?.preferences??{}}).eq("id",userId);
  await db.auth.admin.updateUserById(userId,{user_metadata:{...user.data.user?.user_metadata,locale:user.data.user?.user_metadata.locale??null}});
  await page.context().clearCookies({name:"NEXT_LOCALE"});
 }
});
