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
OverlayTrigger,
Tooltip
} from "react-bootstrap";

import "../assets/css/ManageInventory.css";

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
  const [search, setSearch] = useState("");
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

    const filtered = records.filter(record => {
    const keyword = search.toLowerCase();

    return (
    record.student_name?.toLowerCase().includes(keyword) ||
    record.student_tupt_id?.toLowerCase().includes(keyword) ||
    record.item_name?.toLowerCase().includes(keyword)
    );
    });

    const sorted=[...filtered].sort(
    (a,b)=>(Number(b.id)||0)-(Number(a.id)||0)
    );
    
  return (
  <>
    <div className="tupt-dashboard manage-inventory-page">
      <div className="tupt-ribbon"></div>

      <Container fluid>
        {alert.show && (
          <Alert
            className={`manage-alert ${
              alert.variant === "danger"
                ? "alert-danger"
                : "alert-success"
            }`}
          >
            {alert.message}
          </Alert>
        )}

        {/* ===========================================
            Header
        =========================================== */}

        <div className="manage-header">
          <div>
            <h2 className="manage-title">
              Borrowed Inventory
            </h2>

            <p className="manage-subtitle">
              Monitor borrowed equipment, due dates, and return transactions.
            </p>
          </div>
        </div>

        {/* ===========================================
            Summary Cards
        =========================================== */}

        <Row className="mb-4">
          <Col lg="4" md="6">
            <Card className="summary-card">
              <Card.Body>
                <div className="summary-icon maroon">
                  <i className="nc-icon nc-box"></i>
                </div>

                <div>
                  <span>Total Records</span>
                  <h3>{records.length}</h3>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg="4" md="6">
            <Card className="summary-card">
              <Card.Body>
                <div className="summary-icon gold">
                  <i className="nc-icon nc-time-alarm"></i>
                </div>

                <div>
                  <span>Borrowed</span>
                  <h3>
                    {records.filter(
                      (r) => r.status !== "Returned"
                    ).length}
                  </h3>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg="4" md="6">
            <Card className="summary-card">
              <Card.Body>
                <div className="summary-icon navy">
                  <i className="nc-icon nc-check-2"></i>
                </div>

                <div>
                  <span>Returned</span>
                  <h3>
                    {records.filter(
                      (r) => r.status === "Returned"
                    ).length}
                  </h3>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* ===========================================
            Search
        =========================================== */}

        <Card className="search-card mb-4">
          <Card.Body>
            <div className="search-wrapper">
              <i className="nc-icon nc-zoom-split"></i>

              <input
                type="text"
                className="search-input"
                placeholder="Search borrower or item..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </Card.Body>
        </Card>

        {/* ===========================================
            Borrow Records Table
        =========================================== */}

        <Card className="inventory-table-card">
          <Card.Header>
            <div>
              <Card.Title as="h4">
                Borrow Records
              </Card.Title>

              <p className="card-category">
                Latest borrow transactions
              </p>
            </div>
          </Card.Header>
          <Card.Body className="p-0">
            <div className="table-responsive">
                          {loading && (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="info" />
                </div>
              )}

              {!loading && error && (
                <Alert variant="danger" className="m-3">
                  {error}
                </Alert>
              )}

              {!loading && !error && (
                <Table className="inventory-table">
                  <thead>
                    <tr>
                      <th>Borrower</th>
                      <th>Student ID</th>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>Borrowed</th>
                      <th>Due</th>
                      <th>Status</th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {sorted.length === 0 ? (
                      <tr>
                        <td
                          colSpan="8"
                          className="text-center py-5"
                        >
                          No borrowed inventory found.
                        </td>
                      </tr>
                    ) : (
                      sorted.map((rec) => {
                        const overdue = isOverdue(rec);
                        const returned = rec.status === "Returned";

                        return (
                          <tr key={rec.id}>
                            <td>
                              <strong>{rec.student_name}</strong>
                            </td>

                            <td>
                              {rec.student_tupt_id || "-"}
                            </td>

                            <td>
                              {rec.item_name}
                            </td>

                            <td>
                              {rec.quantity}
                            </td>

                            <td>
                              {rec.borrowed_date}
                            </td>

                            <td>
                              {rec.due_date || "-"}
                            </td>

                            <td>
                              <span
                                className={
                                  returned
                                    ? "status-badge available"
                                    : overdue
                                    ? "status-badge unavailable"
                                    : "status-badge pending"
                                }
                              >
                                {returned
                                  ? "Returned"
                                  : overdue
                                  ? "Overdue"
                                  : "Borrowed"}
                              </span>
                            </td>

                            <td className="text-center">
                              <div className="action-buttons">
                                <OverlayTrigger
                                  placement="top"
                                  overlay={
                                    <Tooltip>
                                      {returned
                                        ? "Already Returned"
                                        : "Mark as Returned"}
                                    </Tooltip>
                                  }
                                >
                                  <span>
                                    <Button
                                      size="sm"
                                      className="action-btn edit"
                                      disabled={returned}
                                      onClick={() =>
                                        setConfirmReturn(rec)
                                      }
                                    >
                                      <i className="fas fa-undo-alt"></i>
                                    </Button>
                                  </span>
                                </OverlayTrigger>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </Table>
              )}
            </div>
          </Card.Body>
        </Card>
      </Container>
    </div>
        {/* ===========================================
            Return Confirmation Modal
        =========================================== */}

        {confirmReturn && (
          <>
            <div className="modal-backdrop show" />

            <div
              className="modal d-block manage-modal"
              tabIndex="-1"
              role="dialog"
            >
              <div
                className="modal-dialog modal-dialog-centered"
                role="document"
              >
                <div className="modal-content">

                  <div className="modal-header">
                    <h4 className="modal-title">
                      Return Inventory Item
                    </h4>

                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setConfirmReturn(null)}
                    />
                  </div>

                  <div className="modal-body text-center">
                    <div className="delete-icon success">
                      <i className="fas fa-undo-alt"></i>
                    </div>

                    <h5 className="mt-3">
                      Confirm Return
                    </h5>

                    <p className="delete-message">
                      Are you sure you want to mark
                      <strong> {confirmReturn.item_name} </strong>
                      borrowed by
                      <strong> {confirmReturn.student_name} </strong>
                      as returned?
                    </p>

                    <small className="text-muted">
                      The borrowed quantity will automatically be restored to the inventory stock.
                    </small>
                  </div>

                  <div className="modal-footer justify-content-center">
                    <Button
                      variant="light"
                      className="btn-cancel"
                      onClick={() => setConfirmReturn(null)}
                    >
                      Cancel
                    </Button>

                    <Button
                      className="btn-save"
                      onClick={confirmReturnNow}
                      disabled={returning}
                    >
                      {returning
                        ? "Processing..."
                        : "Confirm Return"}
                    </Button>
                  </div>

                </div>
              </div>
            </div>
          </>
        )}
  </>);
}

export default AllBorrowedInventory;
