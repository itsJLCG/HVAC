import React, { useState, useEffect } from "react";
import {
  Card,
  Container,
  Row,
  Col,
  Table,
  Spinner,
  Alert,
  Button,
  Badge,
} from "react-bootstrap";

const API_BASE = process.env.REACT_APP_API_BASE || "";

const todayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const isOverdue = (rec) => {
  if (!rec.due_date || rec.status === "Returned") return false;
  return String(rec.due_date) < todayStr();
};

function AllBorrowedInventory() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alert, setAlert] = useState({ show: false, variant: "success", message: "" });
  const [confirmReturn, setConfirmReturn] = useState(null);
  const [returning, setReturning] = useState(false);

  const notify = (variant, message) => {
    setAlert({ show: true, variant, message });
    setTimeout(() => setAlert((a) => ({ ...a, show: false })), 4000);
  };

  const loadRecords = () => {
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/api/borrows`)
      .then((r) => r.json())
      .then((data) => setRecords(Array.isArray(data) ? data : []))
      .catch(() => setError("Failed to load borrowed inventory"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const confirmReturnNow = () => {
    if (!confirmReturn) return;
    setReturning(true);
    fetch(`${API_BASE}/api/borrows/${confirmReturn.id}/return`, { method: "PUT" })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.error || "Failed to mark as returned");
        notify("success", `${d.restored_item} returned — stock updated to +${d.restored_quantity}.`);
        setConfirmReturn(null);
        loadRecords();
      })
      .catch((err) => notify("danger", err.message || "Failed to mark as returned"))
      .finally(() => setReturning(false));
  };

  const sorted = [...records].sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));

  return (
    <>
      <Container fluid>
        <Row>
          <Col md="12">
            {alert.show && (
              <Alert variant={alert.variant}>{alert.message}</Alert>
            )}
            <Card className="strpied-tabled-with-hover">
              <Card.Header>
                <Card.Title as="h4">All Borrowed Inventory</Card.Title>
                <p className="card-category">
                  Borrowed items — latest borrow first. Mark items as returned to restore stock
                </p>
              </Card.Header>
              <Card.Body className="table-full-width table-responsive px-0">
                {loading && (
                  <div className="text-center py-4">
                    <Spinner animation="border" variant="info" />
                  </div>
                )}
                {!loading && error && <Alert variant="danger">{error}</Alert>}
                {!loading && !error && sorted.length === 0 && (
                  <p className="text-center text-muted py-4">No borrowed items yet.</p>
                )}
                {!loading && !error && sorted.length > 0 && (
                  <Table className="table-hover table-striped align-middle mb-0">
                    <thead>
                      <tr>
                        <th className="border-0">Borrower</th>
                        <th className="border-0">Item</th>
                        <th className="border-0" style={{ width: 60 }}>Qty</th>
                        <th className="border-0" style={{ width: 130 }}>Borrowed</th>
                        <th className="border-0" style={{ width: 130 }}>Due</th>
                        <th className="border-0" style={{ width: 160 }}>Status</th>
                        <th className="border-0" style={{ width: 170, textAlign: "right" }}>
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((rec) => {
                        const overdue = isOverdue(rec);
                        const returned = rec.status === "Returned";
                        return (
                          <tr key={rec.id} className={overdue ? "table-danger" : ""}>
                            <td>
                              <span className="font-weight-bold">{rec.student_name}</span>
                              {rec.student_tupt_id && (
                                <span className="text-muted ml-2 d-block" style={{ fontSize: 12 }}>
                                  {rec.student_tupt_id}
                                </span>
                              )}
                            </td>
                            <td>
                              {rec.item_name}
                              {overdue && (
                                <Badge pill variant="danger" className="ml-2 px-2 py-1 font-weight-bold">
                                  OVERDUE
                                </Badge>
                              )}
                            </td>
                            <td>{rec.quantity}</td>
                            <td>{rec.borrowed_date}</td>
                            <td className={overdue ? "text-danger font-weight-bold" : ""}>
                              {rec.due_date || "—"}
                            </td>
                            <td>
                              {returned ? (
                                <Badge pill variant="success" className="px-2 py-1">
                                  Returned
                                </Badge>
                              ) : (
                                <Badge pill variant="info" className="px-2 py-1">
                                  Borrowed
                                </Badge>
                              )}
                              {returned && rec.returned_date && (
                                <span className="text-muted small ml-1">on {rec.returned_date}</span>
                              )}
                            </td>
                            <td className="text-right">
                              <Button
                                size="sm"
                                variant={returned ? "secondary" : "success"}
                                disabled={returned}
                                onClick={() => setConfirmReturn(rec)}
                              >
                                {returned ? "Returned" : "Mark as Returned"}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Return confirmation modal */}
      {confirmReturn && (
        <>
          <div className="modal-backdrop show" />
          <div className="modal d-block" tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Confirm Return</h5>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => setConfirmReturn(null)}
                  />
                </div>
                <div className="modal-body">
                  Mark <b>{confirmReturn.item_name}</b> (Qty: {confirmReturn.quantity}) borrowed by{" "}
                  <b>{confirmReturn.student_name}</b> as <b>returned</b>? The item quantity will be
                  restored to stock.
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setConfirmReturn(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={confirmReturnNow}
                    disabled={returning}
                  >
                    {returning ? "Processing..." : "Confirm Return"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default AllBorrowedInventory;
