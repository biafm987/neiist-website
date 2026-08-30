import ProductForm from "@/components/shop/ProductForm";
import { getLocale, getDictionary } from "@/lib/i18n";
import { redirect } from "next/navigation";
import { getAllCategories, getProduct } from "@/utils/db/shopQueries";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const productId = Number(id);

  if (!Number.isInteger(productId) || productId <= 0) {
    redirect("/shop/manage");
  }

  const [product, categories] = await Promise.all([getProduct(productId), getAllCategories(true)]);

  if (!product) {
    redirect("/shop/manage");
  }

  const locale = await getLocale();
  const dict = await getDictionary(locale);

  return (
    <ProductForm
      product={product}
      isEdit={true}
      backHref="/shop/manage"
      categories={categories}
      locale={locale}
      dict={dict.product_form}
    />
  );
}
