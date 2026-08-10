import ShopProductList from "@/components/shop/ShopProductList";
import styles from "@/styles/pages/Shop.module.css";
import { getLocale, getDictionary } from "@/lib/i18n";
import { getAllProducts, getAllCategories } from "@/utils/db/shopQueries";

export default async function ShopPage() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const [products, categories] = await Promise.all([getAllProducts(), getAllCategories()]).catch(
    () => [[], []]
  );

  return (
    <div className={styles.content}>
      <ShopProductList products={products} categories={categories} dict={dict.shop} />
    </div>
  );
}
