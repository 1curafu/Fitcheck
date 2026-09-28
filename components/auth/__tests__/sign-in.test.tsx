import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderInLocale } from "@/lib/i18n/__tests__/render";
import uk from "@/messages/uk.json";
import { EmailSignIn } from "../email-sign-in";
import { OAuthButtons } from "../oauth-buttons";
import { renderToString } from "react-dom/server";
const { otp, oauth } = vi.hoisted(() => ({ otp: vi.fn(), oauth: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { signInWithOtp: otp, signInWithOAuth: oauth } }) }));
test("the streamed sign-in form waits for hydration before accepting an email", () => {
 const html=renderToString(<EmailSignIn />);
 const form=new DOMParser().parseFromString(html,"text/html");
 expect(form.querySelector("input")?.hasAttribute("disabled")).toBe(true);
 expect(form.querySelector("button")?.hasAttribute("disabled")).toBe(true);
});
for (const thrown of [false, true]) {
  test(`email errors are translated and allow retry (throw=${thrown})`, async () => {
    otp.mockReset();
    if (thrown) otp.mockRejectedValue(new Error("provider internals"));
    else otp.mockResolvedValue({ error: { message: "provider internals" } });
    await renderInLocale(<EmailSignIn />, "uk");
    await userEvent.type(screen.getByPlaceholderText(uk.auth.emailPlaceholder), "test@example.com");
    await userEvent.click(screen.getByRole("button", { name: uk.auth.emailLink }));
    expect(await screen.findByText(uk.auth.failed)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: uk.auth.emailLink })).toBeEnabled();
    expect(screen.queryByText("provider internals")).not.toBeInTheDocument();
    expect(otp).toHaveBeenCalledWith(expect.objectContaining({ options: expect.objectContaining({
      emailRedirectTo: expect.stringContaining("&locale=uk"),
      data: { locale: "uk" },
      shouldCreateUser: true,
    }) }));
  });
  test(`OAuth errors are translated (throw=${thrown})`, async () => {
    oauth.mockReset();
    if (thrown) oauth.mockRejectedValue(new Error("provider internals"));
    else oauth.mockResolvedValue({ error: { message: "provider internals" } });
    await renderInLocale(<OAuthButtons />, "uk");
    await userEvent.click(screen.getByRole("button", { name: uk.auth.google }));
    expect(await screen.findByText(uk.auth.failed)).toBeInTheDocument();
    expect(screen.queryByText("provider internals")).not.toBeInTheDocument();
    expect(oauth).toHaveBeenCalledWith(expect.objectContaining({ options: expect.objectContaining({
      redirectTo: expect.stringContaining("&locale=uk"),
    }) }));
  });
}
