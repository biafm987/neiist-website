"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef, type CSSProperties } from "react";
import styles from "@/styles/components/shop/OrderDetailsOverlay.module.css";
import { Order } from "@/types/shop/order";
import { OrderStatus } from "@/types/shop/orderStatus";
import type { OrderProgressStep } from "@/types/shop/orderKind";
import {
  getAllowedOrderStatusTransitions,
  getOrderProgressSteps,
  getOrderKindFromItems,
  getOrderStatusLabelForKind,
  canTransitionOrderStatus,
  getOrderStatusLabelValue,
} from "@/utils/shop/orderKindUtils";
import { getPaymentLabel } from "@/types/shop/payment";
import { getStatusLabel, getStatusCssClass } from "@/utils/shop/orderStatusUtils";
import { Product } from "@/types/shop/product";
import { MdClose } from "react-icons/md";
import { FaCheck, FaExclamationTriangle } from "react-icons/fa";
import { toast } from "sonner";
import { FiChevronDown, FiChevronUp, FiEdit2 } from "react-icons/fi";
import ConfirmDialog from "@/components/layout/ConfirmDialog";
import { getColorFromOptions, isColorKey, formatVariantSimple } from "@/utils/shop/shopUtils";
import { FaArrowRightLong } from "react-icons/fa6";
import NewOrderModal from "./NewOrderModal";
import PosPaymentOverlay, { type PosPaymentDict } from "@/components/shop/PosPaymentOverlay";
import { PENDING_PAYMENT_METHODS } from "@/types/shop/payment";

function formatVariant(options?: Record<string, string>, label?: string) {
  const { text } = formatVariantSimple(options ?? undefined, label ?? undefined);
  return text || "-";
}

function getPaymentDisplay(order: Order) {
  if (!order.payment_method) return "";

  if (order.payment_method === "mbway")
    return `${getPaymentLabel(order.payment_method)} - ${order.mbway_number}`;

  return getPaymentLabel(order.payment_method);
}

function hasPaymentReference(order: Order): boolean {
  const paymentReference = order.payment_reference?.trim();
  return (
    (order.payment_method === "sumup" ||
      order.payment_method === "sumup-tpa" ||
      order.payment_method === "other" ||
      order.payment_method === "apple-pay") &&
    Boolean(paymentReference)
  );
}

function getPaymentButtonLabel(paymentMethod?: Order["payment_method"]): string {
  return paymentMethod && PENDING_PAYMENT_METHODS.has(paymentMethod)
    ? "Registar Pagamento"
    : "Finalizar Encomenda";
}

interface OrderDetailOverlayProps {
  orderId: number;
  orders: Order[];
  canManage?: boolean;
  basePath: string;
  canEditNotes?: boolean;
  canEditItems?: boolean;
  products?: Product[];
  dict: {
    order_details: {
      close_label: string;
      order_title: string;
      not_found: string;
      col_name: string;
      col_ist_id: string;
      col_campus: string;
      col_email: string;
      col_phone: string;
      items_title: string;
      edit_items_label: string;
      col_product: string;
      col_variant: string;
      col_qty: string;
      col_price: string;
      col_total: string;
      add_notes: string;
      total_label: string;
      notes_title: string;
      status_title: string;
      pay_btn: string;
      mark_ready: string;
      mark_delivered: string;
      cancel_order: string;
      created_by: string;
      payment_verified_by: string;
      pickup_deadline: string;
      delivered_by: string;
      step_pending: string;
      step_paid: string;
      step_ready: string;
      step_delivered: string;
      confirm_cancel: string;
      confirm_status: string;
      confirm_save_notes: string;
      error_update_status: string;
      error_cancel: string;
      error_save_notes: string;
      pickup_toast: string;
    };
    confirm_dialog: { confirm: string; cancel: string };
    new_order_modal: Record<string, unknown>;
    create_user_modal: Record<string, unknown>;
    pos_payment: PosPaymentDict;
  };
}

export default function OrderDetailOverlay({
  orderId,
  orders,
  canManage = false,
  basePath,
  canEditNotes = false,
  canEditItems = false,
  products = [],
  dict,
}: OrderDetailOverlayProps) {
  const router = useRouter();
  const d = dict.order_details;
  const [order, setOrder] = useState<Order | null>(null);
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showUserCancelConfirm, setShowUserCancelConfirm] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  const [notesEditing, setNotesEditing] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showEditOrderModal, setShowEditOrderModal] = useState(false);
  const [showPaymentOverlay, setShowPaymentOverlay] = useState(false);

  const paymentButtonLabel = getPaymentButtonLabel(order?.payment_method);

  useEffect(() => {
    setOrder(orders.find((o) => o.id === orderId) || null);
  }, [orderId, orders]);

  useEffect(() => {
    setNotesDraft(order?.notes ?? "");
    if (order?.notes && String(order.notes).trim() !== "") {
      setNotesOpen(true);
    } else {
      setNotesOpen(false);
    }
  }, [order?.notes]);

  const deadlineToastShownRef = useRef(false);
  const isDeadlineNear = (() => {
    if (!order?.pickup_deadline) return false;
    try {
      const dl = new Date(order.pickup_deadline);
      const now = new Date();
      const diffDays = (dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays <= 28 && diffDays >= 0;
    } catch {
      return false;
    }
  })();

  const showDeadlineToast = useCallback(() => {
    if (!order?.pickup_deadline) return;
    if (deadlineToastShownRef.current) return;
    const formatted = new Date(order.pickup_deadline).toLocaleDateString();
    const toastId = `pickup-deadline-${order.id}`;
    toast.warning(d.pickup_toast.replace("{date}", formatted), {
      id: toastId,
      duration: Infinity,
      closeButton: true,
      dismissible: true,
      style: {
        color: "red",
        border: "2px solid var(--danger-colour, red)",
      },
    });
    deadlineToastShownRef.current = true;
  }, [order, d.pickup_toast]);

  useEffect(() => {
    deadlineToastShownRef.current = false;
  }, [order?.id]);

  useEffect(() => {
    if (!order) return;
    if (!canManage && isDeadlineNear) showDeadlineToast();
  }, [order, canManage, isDeadlineNear, showDeadlineToast]);

  const handleCloseImmediate = useCallback(() => {
    router.push(basePath);
  }, [router, basePath]);

  const attemptClose = useCallback(() => {
    if (!order) {
      handleCloseImmediate();
      return;
    }
    const currentNotes = order.notes ?? "";
    if ((notesDraft ?? "") !== currentNotes && notesEditing) {
      setShowSaveConfirm(true);
      return;
    }
    handleCloseImmediate();
  }, [order, notesEditing, notesDraft, handleCloseImmediate]);

  const handleStatusChange = async (status: OrderStatus) => {
    if (!order) return;
    setError(null);
    const res = await fetch(`/api/shop/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setOrder(updated);
      router.refresh();
      // TODO: (SUCCESS)
    } else {
      // TODO: (ERROR)
      setError(d.error_update_status);
    }
  };

  const handleUserCancel = async () => {
    if (!order) return;
    setError(null);
    const res = await fetch(`/api/shop/orders/${order.id}`, { method: "DELETE" });
    if (res.ok) {
      const updated = await res.json();
      setOrder(updated);
      router.refresh();
      // TODO: (SUCCESS)
    } else {
      // TODO: (ERROR)
      setError(d.error_cancel);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) attemptClose();
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !showEditOrderModal && !showPaymentOverlay) {
        if (notesEditing) {
          setShowSaveConfirm(true);
          return;
        }
        handleCloseImmediate();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [handleCloseImmediate, notesEditing, showEditOrderModal, showPaymentOverlay]);

  if (!order) {
    return (
      <div className={styles.backdrop}>
        <div className={styles.modal}>
          <div style={{ textAlign: "center", padding: "2rem" }}>{d.not_found}</div>
        </div>
      </div>
    );
  }

  const { orderKind } = getOrderKindFromItems(order.items);
  const progressSteps = getOrderProgressSteps(orderKind);
  const getStepLabel = (step: OrderProgressStep) => getOrderStatusLabelValue(step.label, order);
  const activeStepIndex = progressSteps.findLastIndex((step) =>
    step.activeStatuses.includes(order.status)
  );
  const progressWidth =
    progressSteps.length > 0 && activeStepIndex >= 0
      ? `${((activeStepIndex + 1) / progressSteps.length) * 100}%`
      : "0%";
  const progressBarStyle: CSSProperties = {
    "--progress-width": progressWidth,
  } as CSSProperties;

  const allowedStatusTransitions = canManage
    ? getAllowedOrderStatusTransitions(orderKind, order.status)
    : [];
  const canSetPaid = canManage && canTransitionOrderStatus(orderKind, order.status, "paid");
  const canSetReady = canManage && canTransitionOrderStatus(orderKind, order.status, "ready");
  const canSetDelivered =
    canManage && canTransitionOrderStatus(orderKind, order.status, "delivered");
  const canCancel = canManage && canTransitionOrderStatus(orderKind, order.status, "cancelled");
  const canShowManageStatusActions = allowedStatusTransitions.length > 0;
  const userCanCancel = !canManage && order.status === "pending";

  const saveNotes = async (): Promise<boolean> => {
    if (!order) return false;
    if ((order.notes ?? "") === (notesDraft ?? "")) {
      setNotesEditing(false);
      return true;
    }
    setError(null);
    try {
      const res = await fetch(`/api/shop/orders/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesDraft }),
      });
      if (res.ok) {
        const updated = await res.json();
        setOrder(updated);
        setNotesEditing(false);
        router.refresh();
        // TODO: (SUCCESS) show success toast after the order notes are saved.
        return true;
      } else {
        const err = await res.json().catch(() => null);
        // TODO: (ERROR)
        setError(err?.error ?? d.error_save_notes);
        return false;
      }
    } catch (err) {
      // TODO: (ERROR)
      setError(d.error_save_notes);
      console.error(err);
      return false;
    }
  };

  return (
    <>
      {!showEditOrderModal && (
        <div className={styles.backdrop} onClick={handleBackdropClick}>
          <div className={styles.modal}>
            <button
              className={styles.closeButton}
              onClick={() => {
                attemptClose();
              }}
              aria-label={d.close_label}>
              <MdClose size={20} />
            </button>

            <div className={styles.header}>
              <h2>{d.order_title}</h2>
              <span className={`${styles.statusBadge} ${styles[getStatusCssClass(order.status)]}`}>
                {getOrderStatusLabelForKind(orderKind, order.status, order)}
              </span>
            </div>

            <div className={styles.orderNumber}>
              {order.order_number}
              <FaArrowRightLong />
              {getPaymentDisplay(order)}
            </div>

            <div className={styles.infoGrid}>
              <div className={styles.infoColumn}>
                <div className={styles.infoItem}>
                  <label>{d.col_name}</label>
                  <p>{order.customer_name}</p>
                </div>
              </div>
              <div className={styles.infoColumn}>
                <div className={styles.infoItem}>
                  <label>{d.col_ist_id}</label>
                  <p>{order.user_istid}</p>
                </div>
              </div>
              <div className={styles.infoColumn}>
                <div className={styles.infoItem}>
                  <label>{d.col_campus}</label>
                  <p>
                    {order.campus
                      ? order.campus.charAt(0).toUpperCase() + order.campus.slice(1)
                      : "-"}
                  </p>
                </div>
              </div>

              <div className={styles.infoColumnWide}>
                <div className={styles.infoItem}>
                  <label>{d.col_email}</label>
                  <p>{order.customer_email}</p>
                </div>
              </div>
              <div className={styles.infoColumn}>
                <div className={styles.infoItem}>
                  <label>{d.col_phone}</label>
                  <p>{order.customer_phone || "-"}</p>
                </div>
              </div>
              {hasPaymentReference(order) && (
                <div className={styles.infoColumn}>
                  <div className={styles.infoItemInline}>
                    <label>Referência de Pagamento:</label>
                    <p>{order.payment_reference?.trim()}</p>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3>{d.items_title}</h3>
                {canEditItems && (
                  <button
                    type="button"
                    className={styles.editItemsButton}
                    onClick={() => setShowEditOrderModal(true)}
                    title={d.edit_items_label}
                    aria-label={d.edit_items_label}>
                    <FiEdit2 size={16} />
                  </button>
                )}
              </div>
              <div className={styles.table}>
                <div className={styles.tableHeader}>
                  <span>{d.col_product}</span>
                  <span>{d.col_variant}</span>
                  <span>{d.col_qty}</span>
                  <span>{d.col_price}</span>
                  <span>{d.col_total}</span>
                </div>
                {order.items.map((item, idx) => {
                  const colorInfo = getColorFromOptions(
                    item.variant_options ?? undefined,
                    item.variant_label ?? undefined
                  );

                  const nonColorParts: string[] = (() => {
                    if (item.variant_options && Object.keys(item.variant_options).length > 0) {
                      return Object.entries(item.variant_options)
                        .filter(([k]) => !isColorKey(k))
                        .map(([k, v]) => `${k.trim()}: ${v}`);
                    }
                    if (item.variant_label) {
                      const parts = item.variant_label
                        .split(/\||,/)
                        .map((p) => p.trim())
                        .filter(Boolean);
                      return parts.filter((part) => {
                        const [k] = part.split(":");
                        return !isColorKey(k);
                      });
                    }
                    return [];
                  })();
                  const variantTextFallback =
                    nonColorParts.length > 0
                      ? nonColorParts.join(", ")
                      : formatVariant(
                          item.variant_options ?? undefined,
                          item.variant_label ?? undefined
                        );
                  return (
                    <div key={idx} className={styles.tableRow}>
                      <span>{item.product_name}</span>
                      <span>
                        {colorInfo.hex ? (
                          <>
                            <span
                              style={{
                                display: "inline-block",
                                width: 14,
                                height: 14,
                                borderRadius: 14,
                                backgroundColor: colorInfo.hex,
                                marginRight: 8,
                                verticalAlign: "middle",
                              }}
                              title={colorInfo.name || colorInfo.hex}
                            />
                            {variantTextFallback}
                          </>
                        ) : (
                          variantTextFallback
                        )}
                      </span>
                      <span>{item.quantity}</span>
                      <span>{item.unit_price.toFixed(2)}€</span>
                      <span>{(item.unit_price * item.quantity).toFixed(2)}€</span>
                    </div>
                  );
                })}
              </div>
              <div className={styles.totalRow}>{d.total_label.replace("{amount}", order.total_amount.toFixed(2))}</div>
            </div>

            <div className={styles.section}>
              <details
                className={styles.notesDetails}
                onToggle={(e) => setNotesOpen((e.currentTarget as HTMLDetailsElement).open)}
                open={notesOpen}>
                <summary className={styles.notesSummary}>
                  <span>{d.notes_title}</span>
                  <span className={styles.notesChevron}>
                    {notesOpen ? <FiChevronUp /> : <FiChevronDown />}
                  </span>
                </summary>

                <div className={styles.notesText}>
                  {canEditNotes ? (
                    notesEditing ? (
                      <textarea
                        autoFocus
                        className={styles.notesInput}
                        value={notesDraft}
                        onChange={(e) => setNotesDraft(e.target.value)}
                        onBlur={() => {
                          const currentNotes = order.notes ?? "";
                          if ((notesDraft ?? "") !== currentNotes) setShowSaveConfirm(true);
                          else setNotesEditing(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            e.preventDefault();
                            e.stopPropagation();
                            const currentNotes = order.notes ?? "";
                            if ((notesDraft ?? "") !== currentNotes) setShowSaveConfirm(true);
                            else setNotesEditing(false);
                          }
                        }}
                      />
                    ) : (
                      <div
                        onClick={() => setNotesEditing(true)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setNotesEditing(true);
                          }
                        }}>
                        {order.notes ? order.notes : d.add_notes}
                      </div>
                    )
                  ) : (
                    <div>{order.notes ? order.notes : d.add_notes}</div>
                  )}
                </div>
              </details>
            </div>

            {canManage ? (
              <div className={styles.section}>
                {canShowManageStatusActions && (
                  <>
                    <h3>{d.status_title}</h3>
                    <div className={styles.actionButtons}>
                      {canSetPaid && (
                        <button
                          className={styles.buttonOutline}
                          onClick={() => setShowPaymentOverlay(true)}>
                          {paymentButtonLabel}
                        </button>
                      )}

                      {canSetReady && (
                        <button
                          className={styles.buttonPrimary}
                          onClick={() => setPendingStatus("ready")}>
                          {d.mark_ready}
                        </button>
                      )}

                      {canSetDelivered && (
                        <button
                          className={styles.buttonPrimary}
                          onClick={() => setPendingStatus("delivered")}>
                          {d.mark_delivered}
                        </button>
                      )}

                      {canCancel && (
                        <button
                          className={styles.buttonOutline}
                          onClick={() => setPendingStatus("cancelled")}>
                          {d.cancel_order}
                        </button>
                      )}
                    </div>
                  </>
                )}
                <p className={styles.timestamp}>
                  {d.created_by
                    .replace("{by}", order.created_by || "-")
                    .replace("{date}", new Date(order.created_at).toLocaleString())}
                </p>
                {order.paid_at && (
                  <p className={styles.timestamp}>
                    {d.payment_verified_by
                      .replace("{by}", order.payment_checked_by ?? "")
                      .replace("{date}", new Date(order.paid_at).toLocaleString())}
                  </p>
                )}
                {order.pickup_deadline && (
                  <p className={styles.timestamp}>
                    {d.pickup_deadline.replace("{date}", new Date(order.pickup_deadline).toLocaleString())}
                  </p>
                )}
                {order.delivered_at && (
                  <p className={styles.timestamp}>
                    {d.delivered_by
                      .replace("{by}", order.delivered_by ?? "")
                      .replace("{date}", new Date(order.delivered_at).toLocaleString())}
                  </p>
                )}
              </div>
            ) : (
              <>
                {order.status !== "cancelled" && (
                    <ul className={styles.progressbar} style={progressBarStyle}>
                      {progressSteps.map((step, index) => {
                        const isStepActive = step.activeStatuses.includes(order.status);
                        const isStepAlert = step.key === "ready" && isDeadlineNear && isStepActive;
                        
                        let translatedLabel = getStepLabel(step);
                        if (step.key === "pending") translatedLabel = d.step_pending;
                        if (step.key === "paid") translatedLabel = d.step_paid;
                        if (step.key === "ready") translatedLabel = d.step_ready;
                        if (step.key === "delivered") translatedLabel = d.step_delivered;

                        return (
                          <li
                            key={step.key}
                            className={`${styles.step0} ${isStepActive ? styles.active : ""} ${isStepAlert ? styles.stepAlert : ""}`}
                            id={`step${index + 1}`}>
                            <span className={styles.stepIcon}>
                              {isStepActive &&
                                (isStepAlert ? (
                                  <FaExclamationTriangle size={14} />
                                ) : (
                                  <FaCheck size={14} />
                                ))}
                            </span>
                            {translatedLabel}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                <div className={styles.footer}>
                  {userCanCancel && (
                    <button
                      className={styles.cancelButton}
                      onClick={() => setShowUserCancelConfirm(true)}>
                      {d.cancel_order}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
          {pendingStatus && (
            <ConfirmDialog
              open={!!pendingStatus}
              message={
                pendingStatus === "cancelled"
                  ? d.confirm_cancel
                  : d.confirm_status.replace("{status}", getStatusLabel(pendingStatus))
              }
              onConfirm={async () => {
                await handleStatusChange(pendingStatus);
                setPendingStatus(null);
              }}
              onCancel={() => setPendingStatus(null)}
              dict={dict.confirm_dialog}
            />
          )}
          <ConfirmDialog
            open={showUserCancelConfirm}
            message={d.confirm_cancel}
            onConfirm={async () => {
              setShowUserCancelConfirm(false);
              await handleUserCancel();
            }}
            onCancel={() => setShowUserCancelConfirm(false)}
            dict={dict.confirm_dialog}
          />
          <ConfirmDialog
            open={showSaveConfirm}
            message={d.confirm_save_notes}
            onConfirm={async () => {
              setShowSaveConfirm(false);
              const ok = await saveNotes();
              if (!ok) setNotesEditing(true);
            }}
            onCancel={() => {
              setShowSaveConfirm(false);
              setNotesDraft(order.notes ?? "");
              setNotesEditing(false);
            }}
            dict={dict.confirm_dialog}
          />

          {/* TODO: replace this inline error with a toast and remove this fallback once Sonner is implemented here. */}
          {error && <div className={styles.error}>{error}</div>}
        </div>
      )}

      {showEditOrderModal && canEditItems && (
        <NewOrderModal
          mode="edit"
          orderToEdit={order}
          products={products}
          onClose={() => setShowEditOrderModal(false)}
          onSubmit={(updatedOrder) => {
            if (updatedOrder) setOrder(updatedOrder);
            setShowEditOrderModal(false);
            router.refresh();
          }}
          dict={{
            new_order_modal: dict.new_order_modal,
            create_user_modal: dict.create_user_modal,
            confirm_dialog: dict.confirm_dialog,
          } as Parameters<typeof NewOrderModal>[0]["dict"]}
        />
      )}

      {showPaymentOverlay && (
        <PosPaymentOverlay
          open={showPaymentOverlay}
          order={order}
          initialPaymentMethod={order.payment_method}
          reopenOrderUrl={`${basePath}?orderId=${order.id}`}
          onCloseAction={() => setShowPaymentOverlay(false)}
          onOrderUpdatedAction={(updatedOrder) => {
            setOrder(updatedOrder);
            setShowPaymentOverlay(false);
            router.refresh();
          }}
          dict={{
            pos_payment: dict.pos_payment,
            confirm_dialog: dict.confirm_dialog,
          } as Parameters<typeof PosPaymentOverlay>[0]["dict"]}
        />
      )}
    </>
  );
}
