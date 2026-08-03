import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Spinner,
  Alert,
} from "react-bootstrap";

import "../assets/css/Inventories.css";

const API_BASE = process.env.REACT_APP_API_BASE || "";

function Inventories() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/api/items`)
      .then((res) => res.json())
      .then((data) => setItems(data))
      .catch(() => setError("Failed to load inventories."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="tupt-dashboard tupt-inventory">
      <div className="tupt-ribbon"></div>
      <Container fluid>
        <div className="inventory-header">
          <div>
            <h2 className="inventory-heading">
              Inventory
            </h2>
            <p className="inventory-subheading">
              View and monitor all available equipment,
              devices, and borrowing resources.
            </p>
          </div>
          <div className="inventory-count">
            <span>Total Assets</span>
            <h3>{items.length}</h3>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="inventory-loading">
            <Spinner animation="border" />
          </div>
        )}
        {/* Error */}
        {!loading && error && (
          <Alert className="inventory-alert">

            {error}

          </Alert>
        )}
        {/* Cards */}
        {!loading && !error && (
          <Row>
            {items.map((item) => (
              <Col
                xl={3}
                lg={4}
                md={6}
                sm={6}
                xs={12}
                key={item.id}
              >
                <Card className="inventory-card">
                  {/* Image */}
                  <div className="inventory-image">
                    <img
                      src={
                        item.image_url ||
                        "/images/default-avatar.png"
                      }
                      alt={item.name}
                      onError={(e) => {
                        e.target.src =
                          "/images/default-avatar.png";
                      }}
                    />
                  </div>
                  {/* Body */}
                  <Card.Body>
                    <h5 className="inventory-title">
                      {item.name}
                    </h5>
                    <p className="inventory-description">
                      {item.description ||
                        "No description available."}
                    </p>
                    <div className="inventory-divider"></div>
                    <div className="inventory-bottom">
                      <div>
                        <span className="inventory-label">
                          Quantity
                        </span>
                        <div className="inventory-value">
                          {item.quantity}
                        </div>
                      </div>
                      <div>
                        {item.quantity > 0 ? (
                          <span className="status-pill available">
                            ● Available
                          </span>
                        ) : (
                          <span className="status-pill unavailable">
                            ● Out of Stock
                          </span>
                        )}
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        )}

        {!loading &&
          !error &&
          items.length === 0 && (

            <Alert className="inventory-alert">

              No inventory items found.

            </Alert>

          )}

      </Container>

    </div>
  );
}

export default Inventories;