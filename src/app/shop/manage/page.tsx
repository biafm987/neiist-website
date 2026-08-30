import ShopManagement from "@/components/shop/ShopManagement";
import { getLocale, getDictionary } from "@/lib/i18n";
import { ShopManagementDict } from "@/types/i18n";
import { getAllProductsAdmin, getAllCategories } from "@/utils/db/shopQueries";

export default async function ShopManagePage() {
  const [products, categories] = await Promise.all([getAllProductsAdmin(), getAllCategories(true)]);
  const locale = await getLocale();
  const dict = await getDictionary(locale);

  return (
    <ShopManagement
      products={products}
      categories={categories}
      dict={dict.shop_management as ShopManagementDict}
    />
  );
}
