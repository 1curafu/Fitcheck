import { randomUUID } from "node:crypto";
import { test,expect } from "@playwright/test";
import { admin,testUserId,readOwnedOutfit,reseed } from "./helpers";

test.use({storageState:"e2e/.auth/state.json"});
async function fixture(name:string,opts:{styled?:boolean;locale?:string}={}) {
 const db=admin(),userId=await testUserId(),id=randomUUID();
 const items=await db.from("items").select("id").eq("user_id",userId).limit(3);
 if(items.error||items.data?.length!==3) throw new Error("Look fixture pieces missing");
 const added=await db.from("outfits").insert({id,user_id:userId,look_name:name,ai_reasoning:"Original fixture explanation.",text_locale:opts.locale??"en-US",occasion:"work",generated_on:opts.styled?new Date().toISOString().slice(0,10):null,styled_item_id:opts.styled?items.data[0].id:null,styled_index:opts.styled?99:null,layout:{anchorIndex:0,pieces:items.data.map(item=>({itemId:item.id,slot:"piece"}))}});
 if(added.error) throw new Error("Look fixture insert failed");
 const links=await db.from("outfit_items").insert(items.data.map(item=>({outfit_id:id,item_id:item.id,slot:"piece"})));
 if(links.error) throw new Error("Look fixture links failed");
 return {id,db,userId};
}

test("two tabs translate one historical source once while the original screen is immediately usable",async({page})=>{
 const {id,db,userId}=await fixture("E2E Two Tabs Original");
 const other=await page.context().newPage();
 try {
  const before=await readOwnedOutfit(id);
  const budget=await db.from("outfit_translation_days").select("reserved").eq("user_id",userId).eq("day",new Date().toISOString().slice(0,10)).maybeSingle();
  await Promise.all([page.goto(`/uk/outfits/${id}`),other.goto(`/uk/outfits/${id}`)]);
  // The saved text remains usable during the local provider delay; buttons are already present.
  await expect(page.getByRole("button",{name:"Поділитися",exact:true})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Тихий ранок",exact:true})).toBeVisible({timeout:15_000});
  await expect(other.getByRole("heading",{name:"Тихий ранок",exact:true})).toBeVisible({timeout:15_000});
  expect(await readOwnedOutfit(id)).toEqual(before);
  const after=await db.from("outfit_translation_days").select("reserved").eq("user_id",userId).eq("day",new Date().toISOString().slice(0,10)).single();
  expect(after.data?.reserved).toBe((budget.data?.reserved??0)+1);
 } finally {await other.close();await db.from("outfits").delete().eq("id",id);}
});

test("today's styled look supports British text and returns to its Ukrainian source",async({page})=>{
 const {id,db}=await fixture("Тестовий образ з річчю",{styled:true,locale:"uk"});
 try {
  const before=await readOwnedOutfit(id);
  await page.goto(`/en-gb/outfits/${id}`);
  await expect(page.getByRole("heading",{name:"Quiet Morning UK",exact:true})).toBeVisible({timeout:15_000});
  await page.goto(`/uk/outfits/${id}`);
  await expect(page.getByRole("heading",{name:"Тестовий образ з річчю",exact:true})).toBeVisible();
  expect(await readOwnedOutfit(id)).toEqual(before);
  expect((await db.from("outfit_text_translations").select("target_locale").eq("outfit_id",id)).data).toEqual([{target_locale:"en-GB"}]);
 } finally {await db.from("outfits").delete().eq("id",id);}
});

test("unavailable translation keeps original text and does not spend another reservation on refresh",async({page})=>{
 const {id,db}=await fixture("E2E Translation Unavailable");
 try {
  const before=await readOwnedOutfit(id);
  await page.goto(`/uk/outfits/${id}`);
  await expect(page.getByRole("heading",{name:before.look_name!,exact:true})).toBeVisible();
  await expect.poll(async()=> (await db.from("outfit_text_translations").select("status").eq("outfit_id",id).eq("target_locale","uk").maybeSingle()).data?.status).toBe("failed");
  const day=new Date().toISOString().slice(0,10);
  const budget=(await db.from("outfit_translation_days").select("reserved").eq("user_id",await testUserId()).eq("day",day).single()).data?.reserved;
  await page.reload();
  await expect(page.getByRole("heading",{name:before.look_name!,exact:true})).toBeVisible();
  expect(await readOwnedOutfit(id)).toEqual(before);
  expect((await db.from("outfit_translation_days").select("reserved").eq("user_id",await testUserId()).eq("day",day).single()).data?.reserved).toBe(budget);
 } finally {await db.from("outfits").delete().eq("id",id);}
});

test("new Ukrainian daily looks retain their source after display language changes",async({page})=>{
 const db=admin(),userId=await testUserId(),lat=0.56,lon=0.78,now=new Date(),day=now.toISOString().slice(0,10);
 try {
  await db.from("outfits").delete().eq("user_id",userId).eq("generated_on",day).eq("occasion","work").is("styled_item_id",null).is("trip_id",null);
  const weather=await db.from("weather_cache").upsert([0,1].map(offset=>({lat,lon,day:new Date(now.getTime()+offset*86400000).toISOString().slice(0,10),fetched_at:now.toISOString(),payload:{timezone:"UTC",timezoneOffset:0,daily:{dt:now.getTime()/1000+offset*86400,max:20,min:12,conditionId:800},hourly:[{dt:now.getTime()/1000+offset*86400,temp:20,feelsLike:20,conditionId:800}]}})),{onConflict:"lat,lon,day"});
  expect(weather.error).toBeNull();
  const profile=await db.from("profiles").select("preferences").eq("id",userId).single();
  const updated=await db.from("profiles").update({location_lat:lat,location_lon:lon,location_timezone:"UTC",preferences:{...profile.data?.preferences,wearAskedOn:day}}).eq("id",userId);
  expect(updated.error).toBeNull();
  await page.goto("/uk/generate?occasion=work");
  await expect(page.getByText("Тестовий образ 1",{exact:true}).first()).toBeVisible({timeout:30_000});
  const sources=await db.from("outfits").select("id").eq("user_id",userId).eq("generated_on",day).eq("occasion","work").is("styled_item_id",null).is("trip_id",null).order("look_index");
  expect(sources.data).toHaveLength(3);
  const before=await Promise.all(sources.data!.map(row=>readOwnedOutfit(row.id)));
  for(const row of before) {expect(row.text_locale).toBe("uk");expect(row.weather_snapshot).toMatchObject({conditionId:800,condition:"Ясно"});}
  await page.goto("/en-gb/generate?occasion=work");
  await expect(page.getByText("Quiet Morning UK",{exact:true}).first()).toBeVisible({timeout:15_000});
  await page.goto("/uk/generate?occasion=work");
  await expect(page.getByText("Тестовий образ 1",{exact:true}).first()).toBeVisible();
  expect(await Promise.all(sources.data!.map(row=>readOwnedOutfit(row.id)))).toEqual(before);
 } finally {await db.from("weather_cache").delete().eq("lat",lat).eq("lon",lon);await reseed();}
});
