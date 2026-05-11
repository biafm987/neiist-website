import Link from "next/link";
import Image from "next/image";
import { getAllProducts, getAllOrders } from "@/utils/dbUtils";
import { isJantarDeCursoCategory } from "@/utils/shop/orderKindUtils";
import { serverCheckRoles } from "@/utils/permissionUtils";
import InfoListItem from "@/components/dinner/InfoListItem";
import Countdown from "@/components/dinner/Countdown";
import { FaMapMarkerAlt, FaCalendarAlt, FaClock } from "react-icons/fa";
import penguinImg from "@/assets/events/DinnerPenguin.png";
import localFont from "next/font/local";
import styles from "@/styles/pages/DinnerPage.module.css";
import { getLocale, getDictionary } from "@/lib/i18n";

const handelsonTwo = localFont({
  src: "../../assets/fonts/handelson-two.otf",
  display: "swap",
});

export default async function DinnerPage() {
  const locale = await getLocale();
  const dictionary = await getDictionary(locale);
  const userRoles = await serverCheckRoles([]);
  const products = await getAllProducts(true);
  const productById = new Map(products.map((product) => [product.id, product]));

  const unlockDate = new Date("2026-05-21T20:00:00+01:00");
  const now = new Date();
  const isUnlocked = now >= unlockDate;

  const jantarProduct = Array.from(products.values()).find(
    (product) =>
      isJantarDeCursoCategory(product.category) &&
      (!product.order_deadline || new Date(product.order_deadline) > now)
  );

  if (!jantarProduct) {
    return (
      <div className={styles.container}>
        <p>{dictionary.dinner.not_found}</p>
      </div>
    );
  }

  if (userRoles.isAuthorized && userRoles.user) {
    const allOrders = await getAllOrders();
    const userOrders = allOrders.filter((order) => order.user_istid === userRoles.user?.istid);
    const hasJantarOrder = userOrders.some(
      (order) =>
        order.status === "paid" &&
        order.items.some((item) =>
          isJantarDeCursoCategory(productById.get(item.product_id)?.category)
        )
    );
    if (hasJantarOrder) {
      return (
        <div className={styles.container}>
          <div className={styles.contentWrapper}>
            <div className={styles.leftColumn}>
              <h1 className={`${styles.mainTitle} ${handelsonTwo.className}`}>
                <span className={styles.jantar}>JANTAR</span>
                <span className={styles.de}>de</span>
                <span className={styles.curso}>CURSO</span>
              </h1>

              <p className={`${styles.signedUpMessage} ${handelsonTwo.className}`}>
              {dictionary.dinner.signed_up_message}
              </p>

              <ul className={`${styles.infoList} ${handelsonTwo.className}`}>
                <InfoListItem
                  icon={<FaMapMarkerAlt />}
                  label={dictionary.dinner.location_label}
                  value={dictionary.dinner.location_value}
                  url={dictionary.dinner.location_url}
                />
                <InfoListItem icon={<FaCalendarAlt />} label={dictionary.dinner.date_label} value={dictionary.dinner.date_value} />
                <InfoListItem icon={<FaClock />} label={dictionary.dinner.time_label} value={dictionary.dinner.time_value} />
              </ul>

              {!isUnlocked ? (
                <div className={styles.lockedSection}>
                  <p className={`${styles.unlockTimeMessage} ${handelsonTwo.className}`}>
                    {dictionary.dinner.unlock_time_message}{" "}
                    <span className={styles.highlight}>{dictionary.dinner.unlock_highlight}</span>
                  </p>
                  <Countdown />
                </div>
              ) : (
                <div className={styles.unlockedSection}>
                  <p className={`${styles.unlockMessage} ${handelsonTwo.className}`}>
                    {dictionary.dinner.unlocked_message}
                  </p>
                </div>
              )}
            </div>

            <div className={styles.rightColumn}>
              <Image
                src={penguinImg}
                alt={dictionary.dinner.poster_alt}
                className={styles.image}
                priority
              />
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.contentWrapper}>
        <div className={styles.leftColumn}>
          <h1 className={`${styles.mainTitle} ${handelsonTwo.className}`}>
            <span className={styles.jantar}>JANTAR</span>
            <span className={styles.de}>de</span>
            <span className={styles.curso}>CURSO</span>
          </h1>

          <ul className={`${styles.infoList} ${handelsonTwo.className}`}>
            <InfoListItem
              icon={<FaMapMarkerAlt />}
              label={dictionary.dinner.location_label}
              value={dictionary.dinner.location_value}
              url={dictionary.dinner.location_url}
            />
            <InfoListItem icon={<FaCalendarAlt />} label={dictionary.dinner.date_label} value={dictionary.dinner.date_value} />
            <InfoListItem icon={<FaClock />} label={dictionary.dinner.time_label} value={dictionary.dinner.time_value} />
          </ul>

          <p className={`${styles.description} ${handelsonTwo.className}`}>
            {dictionary.dinner.description}
          </p>

          <Link
            href={`/shop/${jantarProduct.id}`}
            className={`${styles.button} ${handelsonTwo.className}`}>
            {dictionary.dinner.buy_button}
          </Link>
        </div>

        <div className={styles.rightColumn}>
          <Image
            src={penguinImg}
            alt={dictionary.dinner.poster_alt}
            className={styles.image}
            priority
          />
        </div>
      </div>
    </div>
  );
}
