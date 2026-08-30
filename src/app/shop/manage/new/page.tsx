import ProductForm from "@/components/shop/ProductForm";
import { getLocale, getDictionary } from "@/lib/i18n";
import { getAllCategories } from "@/utils/db/shopQueries";

export default async function NewProductPage() {
  const categories = await getAllCategories(true);
  const locale = await getLocale();
  const dict = await getDictionary(locale);

  return (
    <ProductForm
      isEdit={false}
      backHref="/shop/manage"
      categories={categories}
      locale={locale}
      dict={dict.product_form}
    />
  );
}
