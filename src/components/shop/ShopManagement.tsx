"use client";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { FaPlus } from "react-icons/fa";
import { FiPackage, FiArchive } from "react-icons/fi";
import { Product } from "@/types/shop/product";
import { Category } from "@/types/shop/category";
import ConfirmDialog from "@/components/layout/ConfirmDialog";
import { PiContactlessPayment } from "react-icons/pi";
import ProductManagementCard from "./ProductManagementCard";
import Fuse from "fuse.js";
import styles from "@/styles/components/shop/ShopManagement.module.css";
import ColorfulText from "../ColorfulText";

interface ShopManagementProps {
  products: Product[];
  categories: Category[];
  locale: string;
  dict: {
    shop_management: {
      title: string;
      pos_link: string;
      add_product: string;
      search_placeholder: string;
      all_categories: string;
      no_image: string;
      view_image: string;
      limited: string;
      on_demand: string;
      in_stock: string;
      edit: string;
      remove: string;
      confirm_remove: string;
    };
    confirm_dialog: {
      confirm: string;
      cancel: string;
    };
    categories: {
      [key: string]: string;
    };
    shop: {
      product_form: {
        unknown_error: string;
        edit: string;
        add_product: string;
        back_button: string;
        images_label: string;
        no_image: string;
        upload_image_label: string;
        product_name_placeholder: string;
        product_price_placeholder: string;
        product_description_placeholder: string;
        choose_categories: string;
        new_category_placeholder: string;
        add_category_button: string;
        limited_stock: string;
        on_demand_stock: string;
        product_quantity_placeholder: string;
        limit_date_placeholder: string;
        option_types: string;
        option_placeholder: string;
        variants_label: string;
        no_variants: string;
        extra_price: string;
        stock_placeholder: string;
        upload: string;
        saving: string;
        save_changes: string;
        create_product: string;
        error_create_category: string;
        error_create_category2: string;
        error_name_missing: string;
        error_category_missing: string;
        error_variant1: string;
        error_variant2: string;
        error_color1: string;
        error_color2: string;
        error_saving_product: string;
        error: string;
        default_option_color: string;
        default_option_size: string;
      };
    };
  }
}

type ConfirmAction =
  | { type: "archive"; productId: number }
  | { type: "restore"; productId: number }
  | { type: "permanent"; productId: number };

export default function ShopManagement({ products, categories, dict, locale }: ShopManagementProps) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<ConfirmAction | null>(null);

  const activeProducts = useMemo(() => products.filter((p) => p.active !== false), [products]);
  const archivedProducts = useMemo(() => products.filter((p) => p.active === false), [products]);
  const visibleProducts = showArchived ? archivedProducts : activeProducts;

  const fuse = useMemo(
    () =>
      new Fuse(visibleProducts, {
        keys: ["name", "category", "description"],
        threshold: 0.4,
        ignoreLocation: true,
      }),
    [visibleProducts]
  );

  const filteredProducts = useMemo(() => {
    let filtered = visibleProducts;
    if (categoryFilter !== "all") {
      filtered = filtered.filter((p) => p.category === categoryFilter);
    }
    if (search.trim()) {
      return fuse
        .search(search.trim())
        .map((r) => r.item)
        .filter((p) => categoryFilter === "all" || p.category === categoryFilter);
    }
    return filtered;
  }, [visibleProducts, search, categoryFilter, fuse]);

  const handleEdit = (productId: number) => {
    router.push(`/shop/manage/${productId}/edit`);
  };

  const handleArchive = (productId: number) => {
    setPendingAction({ type: "archive", productId });
    setShowConfirm(true);
  };

  const handleRestore = (productId: number) => {
    setPendingAction({ type: "restore", productId });
    setShowConfirm(true);
  };

  const handlePermanentDelete = (productId: number) => {
    setPendingAction({ type: "permanent", productId });
    setShowConfirm(true);
  };

  const confirmMessages: Record<ConfirmAction["type"], string> = {
    archive: "Tem a certeza que deseja arquivar este produto?",
    restore: "Tem a certeza que deseja restaurar este produto?",
    permanent:
      "Tem a certeza que deseja eliminar definitivamente este produto? Esta ação não pode ser desfeita.",
  };

  const confirmAction = async () => {
    if (!pendingAction) return;
    const { type, productId } = pendingAction;

    try {
      let response: Response;

      if (type === "archive") {
        response = await fetch(`/api/shop/products/${productId}`, { method: "DELETE" });
      } else if (type === "restore") {
        response = await fetch(`/api/shop/products/${productId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active: true }),
        });
      } else {
        response = await fetch(`/api/shop/products/${productId}?permanent=true`, {
          method: "DELETE",
        });
      }

      if (response.ok) {
        window.location.reload();
      } else {
        const data = await response.json();
        toast.error(data?.error ?? "Ocorreu um erro. Tenta novamente.");
      }
    } catch {
      toast.error("Ocorreu um erro. Tenta novamente.");
    }

    setShowConfirm(false);
    setPendingAction(null);
  };

  const isFiltering = search.trim() !== "" || categoryFilter !== "all";

  return (
    <>
      {showConfirm && pendingAction && (
        <ConfirmDialog
          open={showConfirm}
          message={confirmMessages[pendingAction.type]}
          onConfirm={confirmAction}
          onCancel={() => {
            setShowConfirm(false);
            setPendingAction(null);
          }}
          dict={dict.confirm_dialog}
        />
      )}
      <div className={styles.container}>
        <div className={styles.header}>
          <ColorfulText className={styles.title} text={dict.shop_management.title} />
          <button className={styles.addBtn} onClick={() => router.push("/shop/manage/new")}>
            <FaPlus /> {dict.shop_management.add_product}
          </button>
        </div>

        <div className={styles.filters}>
          <input
            type="text"
            placeholder={dict.shop_management.search_placeholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="all">{dict.shop_management.all_categories}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name in dict.categories ? dict.categories[cat.name] : cat.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={`${styles.archiveToggle} ${showArchived ? styles.archiveToggleActive : ""}`}
            onClick={() => {
              setShowArchived((v) => !v);
              setCategoryFilter("all");
              setSearch("");
            }}>
            <FiArchive />
            {showArchived
              ? "Ver ativos"
              : `Arquivados${archivedProducts.length > 0 ? ` (${archivedProducts.length})` : ""}`}
          </button>
          <button className={styles.addBtn} onClick={() => router.push("/shop/pos")}>
            <PiContactlessPayment /> {dict.shop_management.pos_link}
          </button>
        </div>

        {filteredProducts.length === 0 ? (
          <div className={styles.emptyState}>
            <FiPackage size={64} />
            {isFiltering ? (
              <>
                <p>Nenhum produto encontrado</p>
                <span>Tenta ajustar os filtros ou a pesquisa</span>
              </>
            ) : showArchived ? (
              <>
                <p>Sem produtos arquivados</p>
                <span>Produtos arquivados aparecerão aqui</span>
              </>
            ) : (
              <>
                <p>Ainda não há produtos</p>
                <span>Clica em "Adicionar Produto" para começar</span>
              </>
            )}
          </div>
        ) : (
          <div className={styles.grid}>
            {filteredProducts.map((product) => (
              <ProductManagementCard
                key={product.id}
                product={product}
                onEdit={handleEdit}
                onArchive={handleArchive}
                onRestore={handleRestore}
                onPermanentDelete={handlePermanentDelete}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}