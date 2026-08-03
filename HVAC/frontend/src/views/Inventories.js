import React, { useState, useEffect } from "react";
import { Card, Container, Row, Col, Badge, Spinner, Alert } from "react-bootstrap";

const API_BASE = process.env.REACT_APP_API_BASE || "";

function Inventories() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/items`)
      .then((r) => r.json())
      .then((data) => setItems(data))
      .catch((err) => setError("Failed to load inventories"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Container fluid>
        <h3 className="mb-4">Inventories</h3>
        {loading && (
          <div className="text-center py-5">
            <Spinner animation="border" variant="info" />
          </div>
        )}
        {error && <Alert variant="danger">{error}</Alert>}
        {!loading && !error && (
          <Row>
            {items.map((item) => (
              <Col lg="3" md="4" sm="6" xs="12" key={item.id} className="mb-4">
                <Card className="h-100">
                  <Card.Img
                    variant="top"
                    src={item.image_url || "/images/default-avatar.png"}
                    alt={item.name}
                    style={{ height: "200px", objectFit: "contain", background: "#f5f5f5", padding: "10px" }}
                    onError={(e) => {
                      e.currentTarget.src = "/images/default-avatar.png";
                    }}
                  />
                  <Card.Body className="d-flex flex-column">
                    <Card.Title className="font-weight-bold text-dark text-truncate" style={{ fontSize: "1.35rem" }}>
                      {item.name}
                    </Card.Title>
                    <Card.Text className="flex-grow-1 text-muted mb-2">
                      {item.description || "No description"}
                    </Card.Text>
                    <div className="mt-auto">
                      <Badge
                        pill
                        className={`px-3 py-2 font-weight-bold ${
                          item.quantity > 0
                            ? "badge-info text-white"
                            : "badge-danger"
                        }`}
                        style={{ fontSize: "1.05rem" }}
                      >
                        {item.quantity > 0 ? `Quantity: ${item.quantity}` : "Out of Stock"}
                      </Badge>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        )}
        {!loading && !error && items.length === 0 && (
          <Alert variant="info">No inventory items yet.</Alert>
        )}
      </Container>
    </>
  );
}

export default Inventories;
