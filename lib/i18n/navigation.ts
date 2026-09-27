import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

const navigation = createNavigation(routing);

export const { Link, usePathname, useRouter, getPathname } = navigation;
// next-intl types this as void, but it calls Next's redirect(), which throws.
// Preserve the control-flow narrowing that authenticated Server Components need.
export const redirect: (...args: Parameters<typeof navigation.redirect>) => never =
  navigation.redirect as (...args: Parameters<typeof navigation.redirect>) => never;
