import React from "react";
import { useLocation } from "react-router-dom";
import { Navbar, Container, Button } from "react-bootstrap";

import routes from "routes.js";

import "../../assets/css/Navbar.css";

function Header() {
  const location = useLocation();

  const mobileSidebarToggle = (e) => {
    e.preventDefault();

    document.documentElement.classList.toggle("nav-open");

    const node = document.createElement("div");
    node.id = "bodyClick";

    node.onclick = function () {
      this.parentElement.removeChild(this);
      document.documentElement.classList.toggle("nav-open");
    };

    document.body.appendChild(node);
  };

  const getBrandText = () => {
    for (let i = 0; i < routes.length; i++) {
      if (
        location.pathname.indexOf(
          routes[i].layout + routes[i].path
        ) !== -1
      ) {
        return routes[i].name;
      }
    }

    return "Dashboard";
  };

  const logout = () => {
    try {
      localStorage.clear();
    } catch (err) {}

    window.location.href = "/landing/";
  };

  return (
    <Navbar expand="lg" className="tupt-navbar">
      <Container fluid>

        <div className="tupt-navbar-left">

          <Button
            className="tupt-mobile-btn d-lg-none"
            onClick={mobileSidebarToggle}
          >
            <i className="fas fa-bars"></i>
          </Button>

          <Navbar.Brand className="tupt-navbar-title">
            {getBrandText()}
          </Navbar.Brand>

        </div>

        <div className="tupt-navbar-right">

          <button
            className="tupt-logout-btn"
            onClick={logout}
          >
            <i className="fas fa-sign-out-alt"></i>
            <span>Logout</span>
          </button>

        </div>

      </Container>
    </Navbar>
  );
}

export default Header;