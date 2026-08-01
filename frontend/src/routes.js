/*!

=========================================================
* Light Bootstrap Dashboard React - v2.0.1
=========================================================

* Product Page: https://www.creative-tim.com/product/light-bootstrap-dashboard-react
* Copyright 2022 Creative Tim (https://www.creative-tim.com)
* Licensed under MIT (https://github.com/creativetimofficial/light-bootstrap-dashboard-react/blob/master/LICENSE.md)

* Coded by Creative Tim

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

*/
import Dashboard from "views/Dashboard.js";
import Inventories from "views/Inventories.js";
import AddingInventory from "views/AddingInventory.js";
import UpdateInventory from "views/UpdateInventory.js";
import AllBorrowedInventory from "views/AllBorrowedInventory.js";
import TestQR from "views/TestQR.js";
import ScanStudentBarcode from "views/ScanStudentBarcode.js";
import ManageStudents from "views/ManageStudents.js";
import Borrowed from "views/Borrowed.js";

const dashboardRoutes = [
  {
    path: "/dashboard",
    name: "Dashboard",
    icon: "nc-icon nc-chart-pie-35",
    component: Dashboard,
    layout: "/admin"
  },
  {
    path: "/inventories",
    name: "Inventories",
    icon: "nc-icon nc-layers-3",
    component: Inventories,
    layout: "/admin"
  },
  {
    path: "/add-inventory",
    name: "Add Inventory",
    icon: "nc-icon nc-cart-simple",
    component: AddingInventory,
    layout: "/admin"
  },
  {
    path: "/update-inventory",
    name: "Update Inventory",
    icon: "nc-icon nc-refresh-02",
    component: UpdateInventory,
    layout: "/admin"
  },
  {
    path: "/borrowed-inventory",
    name: "Borrowed Inventory",
    icon: "nc-icon nc-paper-2",
    component: AllBorrowedInventory,
    layout: "/admin"
  },
  {
    path: "/manage-students",
    name: "Manage Students",
    icon: "nc-icon nc-badge",
    component: ManageStudents,
    layout: "/admin"
  },
  {
    path: "/test-qr",
    name: "Test QR",
    icon: "nc-icon nc-camera-20",
    component: TestQR,
    layout: "/admin"
  },
  {
    path: "/scan-student-barcode",
    name: "Scan Student ID",
    icon: "nc-icon nc-badge",
    component: ScanStudentBarcode,
    layout: "/admin"
  },
  {
    path: "/borrowed",
    name: "Borrowed",
    icon: "nc-icon nc-delivery-fast",
    component: Borrowed,
    layout: "/admin"
  }
];

export default dashboardRoutes;
