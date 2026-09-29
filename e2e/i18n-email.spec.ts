import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { admin } from "./helpers";
import enUS from "../messages/en-US.json";
import uk from "../messages/uk.json";
import ru from "../messages/ru.json";

test.use({ storageState: { cookies: [], origins: [] }, trace: "off", screenshot: "off" });
const cases = [
 {name:"new Ukrainian account",newUser:true,request:"uk",metadata:"uk",saved:undefined,emailLang:"uk",destination:"/uk/onboarding"},
 {name:"new Russian account",newUser:true,request:"ru",metadata:"ru",saved:undefined,emailLang:"ru",destination:"/ru/onboarding"},
 {name:"saved Ukrainian beats British browsing",request:"en-gb",metadata:"uk",saved:"uk",emailLang:"uk",destination:"/uk/onboarding"},
 {name:"saved American English",request:"uk",metadata:"en-US",saved:"en-US",emailLang:"en-US",destination:"/onboarding"},
 {name:"saved British English",request:"uk",metadata:"en-GB",saved:"en-GB",emailLang:"en-GB",destination:"/en-gb/onboarding"},
 {name:"absent metadata falls back to English",request:"uk",metadata:undefined,saved:undefined,emailLang:"en-US",destination:"/uk/onboarding"},
 {name:"unknown metadata falls back to English",request:"uk",metadata:"unknown",saved:"en-GB",emailLang:"en-US",destination:"/en-gb/onboarding"},
];
for (const scenario of cases) test(`local sign-in email: ${scenario.name}`, async ({page}) => {
 const auth = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
 const mail = new URL(process.env.E2E_MAILPIT_URL ?? "http://127.0.0.1:54324");
 const app = new URL(process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000");
 for (const url of [auth,mail,app]) if (!['127.0.0.1','localhost'].includes(url.hostname)) throw new Error("Email tests require local Auth, Mailpit and app");
 const db = admin(), address = `i18n-${randomUUID()}@example.com`;
 let userId: string | undefined, messageId: string | undefined;
 try {
  if (!scenario.newUser) {
   const created = await db.auth.admin.createUser({email:address,email_confirm:true,user_metadata:scenario.metadata ? {locale:scenario.metadata}: {}});
   if (created.error || !created.data.user) throw new Error("Local email fixture creation failed");
   userId = created.data.user.id;
   const saved = await db.from("profiles").update({preferences:scenario.saved?{locale:scenario.saved}:{}}).eq("id",userId);
   if (saved.error) throw new Error("Local email fixture preference failed");
  }
  await page.goto(`/${scenario.request}/sign-in`);
  const copy = scenario.request === "uk" ? uk.auth : scenario.request === "ru" ? ru.auth : enUS.auth;
  await page.getByPlaceholder(copy.emailPlaceholder).fill(address);
  const delivery = page.waitForResponse(r => new URL(r.url()).pathname === "/auth/v1/otp" && r.request().method() === "POST");
  await page.getByRole("button",{name:copy.emailLink,exact:true}).click();
  const delivered = await delivery;
  if (!delivered.ok()) {
   const body = await delivered.json() as {error_code?: string; msg?: string; message?: string};
   const code = /^[a-z_]+$/.test(body.error_code ?? "") ? body.error_code : "unknown";
   const detail = (body.msg ?? body.message ?? "").replace(/https?:\/\/\S+|[\w.+-]+@[\w.-]+|[a-f0-9]{16,}|[A-Za-z0-9_-]{32,}/g, "[redacted]");
   throw new Error(`Local OTP failed with status ${delivered.status()} (${code}): ${detail}`);
  }
  await expect(page.getByText(copy.checkInbox,{exact:true})).toBeVisible();
  await expect.poll(async()=>{
   const response = await fetch(new URL('/api/v1/messages',mail));
   if (!response.ok) return false;
   const body = await response.json() as {messages:Array<{ID:string;To:Array<{Address:string}>}>};
   messageId = body.messages.find(m=>m.To.some(to=>to.Address===address))?.ID;
   return Boolean(messageId);
  },{timeout:15_000,message:"Localized email arrived in local Mailpit"}).toBe(true);
  const response = await fetch(new URL(`/api/v1/message/${messageId}`,mail));
  if (!response.ok) throw new Error("Local email retrieval failed");
  const message = await response.json() as {Subject:string;HTML:string};
  expect(message.Subject).toBe("Fitcheck");
  expect(message.HTML.includes(`<html lang="${scenario.emailLang}">`)).toBe(true);
  const phrases = scenario.emailLang === "uk"
   ? ["Твоє посилання для входу", "Відкрити Fitcheck", "Твій стиліст", "Якщо потрібна допомога", "Гардероб, що думає."]
   : scenario.emailLang === "ru"
   ? ["Твоя ссылка для входа", "Открыть Fitcheck", "Твой ИИ-стилист", "Нужна помощь?", "Гардероб, который думает."]
   : ["Your sign-in link", "Open Fitcheck", "Your AI Stylist", "Need help?", scenario.emailLang === "en-GB" ? "A wardrobe that thinks." : "A closet that thinks."];
  for (const phrase of phrases) expect(message.HTML.includes(phrase)).toBe(true);
  const links = [...message.HTML.matchAll(/href="([^"]+)"/g)].map(m=>m[1].replaceAll("&amp;","&"));
  const link = links.find(href=>href.startsWith(auth.origin+"/auth/v1/verify?"));
  if (!link) throw new Error("Local email is missing its Auth confirmation link");
  try { await page.goto(link); } catch { throw new Error("Local magic-link navigation failed"); }
  await expect.poll(()=>new URL(page.url()).pathname).toBe(scenario.destination);
  const users = await db.auth.admin.listUsers({perPage:1000});
  userId ??= users.data.users.find(u=>u.email===address)?.id;
  if (!userId) throw new Error("Local email account is missing");
  const user = await db.auth.admin.getUserById(userId);
  const resolved = scenario.destination.startsWith('/uk') ? 'uk' : scenario.destination.startsWith('/ru') ? 'ru' : scenario.destination.startsWith('/en-gb') ? 'en-GB' : 'en-US';
  expect(user.data.user?.user_metadata.locale).toBe(resolved);
 } finally {
  if (!userId) {
   const users = await db.auth.admin.listUsers({perPage:1000});
   userId = users.data.users.find(u=>u.email===address)?.id;
  }
  if (userId) await db.auth.admin.deleteUser(userId);
  if (messageId) await fetch(new URL('/api/v1/messages',mail),{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({IDs:[messageId]})});
 }
});
