import React from "react";
import { useLocation, NavLink } from "react-router-dom";

import "../../assets/css/Sidebar.css";

function Sidebar({ routes }) {
  const location = useLocation();

  const isActive = (route) => {
    return location.pathname.indexOf(route) > -1;
  };

  return (
    <aside className="tupt-sidebar">
      {/* Logo */}
      <div className="tupt-logo">
        <a href="/admin/dashboard" className="tupt-logo-img">
          <img
            src="/images/HVAC_LOGO.png"
            alt="HVAC Borrowing System Logo"
          />
        </a>

        <a href="/admin/dashboard" className="tupt-logo-text">
          Borrowing
          <br />
          System
        </a>
      </div>

      {/* Navigation */}
      <div className="tupt-sidebar-content">
        <ul className="tupt-nav">
          {routes.map((route, key) => {
            if (route.redirect) return null;

            return (
              <li key={key} className="tupt-nav-item">
                <NavLink
                  to={route.layout + route.path}
                  className={`tupt-nav-link ${
                    isActive(route.layout + route.path)
                      ? "tupt-active"
                      : ""
                  }`}
                >
                  <i className={route.icon}></i>
                  <p>{route.name}</p>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}

export default Sidebar;