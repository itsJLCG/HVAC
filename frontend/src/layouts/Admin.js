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
import React, { Component } from "react";
import { useLocation, Route, Switch } from "react-router-dom";

import AdminNavbar from "components/Navbars/AdminNavbar";
import Footer from "components/Footer/Footer";
import Sidebar from "components/Sidebar/Sidebar";
import ErrorBoundary from "components/ErrorBoundary/ErrorBoundary";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import routes from "routes.js";

import sidebarImage from "assets/img/image.png";

function Admin() {
  // Debug: log component imports to detect undefined exports/imports
  if (typeof window !== "undefined") {
    // these logs go to the browser console
    console.log("Imported layout components:", {
      AdminNavbarType: typeof AdminNavbar,
      FooterType: typeof Footer,
      SidebarType: typeof Sidebar
    });
  }
  React.useEffect(() => {
    const handler = (e) => {
      const { variant = "success", message = "" } = e.detail || {};
      const options = { position: toast.POSITION.TOP_RIGHT, hideProgressBar: true };
      if (variant === "danger" || variant === "error") {
        toast.error(message, options);
      } else if (variant === "info" || variant === "secondary") {
        toast.info(message, options);
      } else if (variant === "warning") {
        toast.warn(message, options);
      } else {
        toast.success(message, options);
      }
    };
    window.addEventListener("app-notify", handler);
    return () => window.removeEventListener("app-notify", handler);
  }, []);
  const [image, setImage] = React.useState(sidebarImage);
  const [color, setColor] = React.useState("black");
  const location = useLocation();
  const mainPanel = React.useRef(null);
  const getRoutes = (routes) => {
    return routes.map((prop, key) => {
      if (prop.layout === "/admin") {
        return (
          <Route
            path={prop.layout + prop.path}
            render={(props) => {
              const Component = prop.component;
              return Component ? <Component {...props} /> : null;
            }}
            key={key}
          />
        );
      } else {
        return null;
      }
    });
  };
  React.useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.scrollingElement.scrollTop = 0;
    mainPanel.current.scrollTop = 0;
    if (
      window.innerWidth < 993 &&
      document.documentElement.className.indexOf("nav-open") !== -1
    ) {
      document.documentElement.classList.toggle("nav-open");
      var element = document.getElementById("bodyClick");
      element.parentNode.removeChild(element);
    }
  }, [location]);
  return (
    <>
      <div className="wrapper">
        <Sidebar color={color} image={image} routes={routes} />
        <div className="main-panel" ref={mainPanel}>
          <AdminNavbar />
          <div className="content">
            <ErrorBoundary>
              <Switch>{getRoutes(routes)}</Switch>
            </ErrorBoundary>
          </div>
          <Footer />
        </div>
      </div>
      {/* FixedPlugin removed - sidebar image is fixed to assets/img/image.png */}
      <ToastContainer position="top-right" />
    </>
  );
}

export default Admin;
