import React, { useState, useEffect } from "react";
import { Card, Container, Row, Col, Table, Spinner, Alert } from "react-bootstrap";

const API_BASE = process.env.REACT_APP_API_BASE || "";

function AllBorrowedInventory() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadRecords = () => {
    setLoading(true);
    fetch(`${API_BASE}/api/borrows`)
      .then((r) => r.json())
      .then((data) => setRecords(data))
      .catch(() => setError("Failed to load borrowed inventory"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRecords();
  }, []);

  return (
    <>
      <Container fluid>
        <Row>
          <Col md="12">
            <Card className="strpied-tabled-with-hover">
              <Card.Header>
                <Card.Title as="h4">All Borrowed Inventory</Card.Title>
                <p className="card-category">List of currently borrowed items</p>
              </Card.Header>
              <Card.Body className="table-full-width table-responsive px-0">
                {loading && (
                  <div className="text-center py-4">
                    <Spinner animation="border" variant="info" />
                  </div>
                )}
                {!loading && error && <Alert variant="danger">{error}</Alert>}
                {!loading && !error && (
                  <Table className="table-hover table-striped">
                    <thead>
                      <tr>
                        <th className="border-0">Item</th>
                        <th className="border-0">Borrower</th>
                        <th className="border-0">Borrowed Date</th>
                        <th className="border-0">Due Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((rec) => (
                        <tr key={rec.id}>
                          <td>{rec.item_name}</td>
                          <td>{rec.student_name}</td>
                          <td>{rec.borrowed_date}</td>
                          <td>{rec.due_date || "—"}</td>
                        </tr>
                      ))}
                      {records.length === 0 && (
                        <tr>
                          <td colSpan="4" className="text-center text-muted">
                            No borrowed items yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
}

export default AllBorrowedInventory;
