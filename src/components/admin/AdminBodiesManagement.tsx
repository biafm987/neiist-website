import AdminBodiesSearchFilter from "@/components/admin/AdminBodiesSearchFilter";
import AddDepartmentModal from "@/components/admin/AddDepartmentModal";
import styles from "@/styles/components/admin/AdminBodiesManagement.module.css";
import { getLocale, getDictionary } from "@/lib/i18n";
import { getLocale, getDictionary } from "@/lib/i18n";
import { getAllAdminBodies } from "@/utils/db/userQueries";

export default async function AdminBodiesManagement() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const adminBodies = await getAllAdminBodies();

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{dict.admin.bodies_management.title}</h2>
      <div className={styles.card}>
        <AdminBodiesSearchFilter initialAdminBodies={adminBodies} dict={dict.admin.bodies_management} />
      </div>
      <AddDepartmentModal departmentType="admin_body" dict={dict.admin.add_department_modal}/>
    </div>
  );
}
