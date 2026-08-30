import ShopProductList from "@/components/shop/ShopProductList";
import styles from "@/styles/pages/Shop.module.css";
import { getLocale, getDictionary } from "@/lib/i18n";
import { getAllProducts } from "@/utils/db/shopQueries";

export default async function ShopPage() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const products = await getAllProducts().catch(() => []);

  return (
    <div className={styles.content}>
      <ShopProductList products={products} dict={dict.shop} />
    </div>
  );
}
