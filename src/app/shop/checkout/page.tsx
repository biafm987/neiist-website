import CheckoutForm from "@/components/shop/CheckoutForm";
import { getUserFromJWT } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDictionary, getLocale } from "@/lib/i18n";
import { getUser } from "@/utils/db/userQueries";

export default async function CheckoutPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;
  const jwtUser = getUserFromJWT(sessionToken)!;
  const locale = await getLocale();
  const dict = await getDictionary(locale);

  const user = await getUser(jwtUser.istid).catch(() => null);
  if (!user) {
    redirect("/login?redirect=/shop/checkout");
  }

  return <CheckoutForm user={user} dict={dict.checkout_form}/>;
}
