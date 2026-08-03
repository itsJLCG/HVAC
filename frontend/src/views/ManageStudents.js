import React, { useState, useEffect } from "react";
import {
  Card,
  Container,
  Row,
  Col,
  Table,
  Button,
  Alert,
  OverlayTrigger,
  Tooltip
} from "react-bootstrap";

import NotificationModal from "components/NotificationModal/NotificationModal";
import "../assets/css/ManageInventory.css";

const API_BASE = process.env.REACT_APP_API_BASE || "";

function ManageStudents() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  // { key: "tupt_id" | "full_name", direction: "asc" | "desc" }
  const [sortConfig, setSortConfig] = useState({ key: "full_name", direction: "asc" });

  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ tupt_id: "", full_name: "" });
  const [adding, setAdding] = useState(false);

  // Import modal
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Edit modal
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ tupt_id: "", full_name: "" });

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState(null);

  const [alert, setAlert] = useState({ show: false, variant: "success", message: "" });
  const [notification, setNotification] = useState({ show: false, title: "", message: "" });
  const notify = (variant, message) => {
    setNotification({ show: true, title: "", message });
    setAlert({ show: true, variant, message });
    setTimeout(() => setAlert((a) => ({ ...a, show: false })), 4000);
  };

  const loadStudents = () => {
    fetch(`${API_BASE}/api/students`)
      .then((r) => r.json())
      .then((data) => setStudents(Array.isArray(data) ? data : []))
      .catch(() => setStudents([]));
  };

  useEffect(() => {
    loadStudents();
  }, []);

  // ----- Manual add -----
  const openAdd = () => {
    setAddForm({ tupt_id: "", full_name: "" });
    setShowAdd(true);
  };
  const closeAdd = () => setShowAdd(false);

  const handleAddChange = (e) => {
    const { name, value } = e.target;
    setAddForm((s) => ({ ...s, [name]: value }));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      setAdding(true);
      const res = await fetch(`${API_BASE}/api/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add student");
      loadStudents();
      closeAdd();
      notify("success", `${data.full_name} added successfully.`);
    } catch (err) {
      notify("danger", err.message || "Failed to add student");
    } finally {
      setAdding(false);
    }
  };

  // ----- CSV / XLSX import -----
  const openImport = () => {
    setImportFile(null);
    setImportResult(null);
    setShowImport(true);
  };
  const closeImport = () => setShowImport(false);

  const handleImportFileChange = (e) => {
    const f = e.target.files && e.target.files[0];
    setImportFile(f || null);
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) {
      notify("danger", "Please choose a .csv, .xlsx, or .xls file first.");
      return;
    }
    try {
      setImporting(true);
      setImportResult(null);
      const fd = new FormData();
      fd.append("file", importFile);
      const res = await fetch(`${API_BASE}/api/students/import`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setImportResult(data);
      loadStudents();
      notify(
        "success",
        `Import complete: ${data.imported_or_updated} of ${data.total_rows} rows imported/updated.`
      );
    } catch (err) {
      notify("danger", err.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  // ----- Edit -----
  const startEdit = (student) => {
    setEditing(student.id);
    setEditForm({ tupt_id: student.tupt_id || "", full_name: student.full_name || "" });
  };
  const cancelEdit = () => setEditing(null);

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((s) => ({ ...s, [name]: value }));
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editing) return;
    try {
      const res = await fetch(`${API_BASE}/api/students/${editing}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      loadStudents();
      setEditing(null);
      notify("success", `${data.full_name} updated successfully.`);
    } catch (err) {
      notify("danger", err.message || "Failed to update student");
    }
  };

  // ----- Delete -----
  const handleDelete = (student) => setConfirmDelete(student);

  const confirmDeleteNow = () => {
    if (!confirmDelete) return;
    fetch(`${API_BASE}/api/students/${confirmDelete.id}`, { method: "DELETE" })
      .then(() => {
        notify("success", `${confirmDelete.full_name} deleted successfully.`);
        setConfirmDelete(null);
        loadStudents();
      })
      .catch(() => {
        notify("danger", `Failed to delete ${confirmDelete.full_name}`);
      });
  };

  const filteredStudents = students.filter((s) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      (s.tupt_id || "").toLowerCase().includes(q) ||
      (s.full_name || "").toLowerCase().includes(q)
    );
  });

  // Sort a copy (never mutate state directly) by whichever column/direction
  // is currently active. localeCompare with numeric:true handles the
  // "TUPT-23-2" vs "TUPT-23-10" case sensibly for the student number too.
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    const { key, direction } = sortConfig;
    const aVal = (a[key] || "").toString();
    const bVal = (b[key] || "").toString();
    const cmp = aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: "base" });
    return direction === "asc" ? cmp : -cmp;
  });

  // Clicking a sortable header toggles asc/desc if it's already the active
  // column, or switches to that column (starting at asc) otherwise.
  const toggleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  // Renders a small ▲▼ pair for every sortable header, always visible.
  // The arrow matching the currently active column/direction is bolded and
  // full-opacity; the other one is dimmed — so both headers always show
  // they're sortable, not just the one last clicked.
  const SortIndicator = ({ columnKey }) => {
    const isActive = sortConfig.key === columnKey;
    const activeDirection = isActive ? sortConfig.direction : null;

    const arrowStyle = (direction) => ({
      opacity: activeDirection === direction ? 1 : 0.3,
      fontWeight: activeDirection === direction ? 700 : 400,
    });

    return (
      <span style={{ marginLeft: 6, fontSize: 11, display: "inline-flex", flexDirection: "column", lineHeight: "9px", verticalAlign: "middle" }}>
        <span style={arrowStyle("asc")}>▲</span>
        <span style={arrowStyle("desc")}>▼</span>
      </span>
    );
  };

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
              Manage Students
            </h2>

            <p className="manage-subtitle">
              Add, import, edit, and manage student records.
            </p>
          </div>

          <div className="d-flex" style={{ gap: 10 }}>
            <Button
              className="btn-add-inventory"
              onClick={openImport}
            >
              <i className="nc-icon nc-cloud-upload-94"></i>
              Import
            </Button>

            <Button
              className="btn-add-inventory"
              onClick={openAdd}
            >
              <i className="nc-icon nc-simple-add"></i>
              Add Student
            </Button>
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
                  <i className="nc-icon nc-single-02"></i>
                </div>

                <div>
                  <span>Total Students</span>
                  <h3>{students.length}</h3>
                </div>

              </Card.Body>
            </Card>
          </Col>

          <Col lg="4" md="6">
            <Card className="summary-card">
              <Card.Body>

                <div className="summary-icon gold">
                  <i className="nc-icon nc-zoom-split"></i>
                </div>

                <div>
                  <span>Filtered</span>
                  <h3>{filteredStudents.length}</h3>
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
                  <span>Showing</span>
                  <h3>{sortedStudents.length}</h3>
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
                placeholder="Search student..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

            </div>

          </Card.Body>
        </Card>

        {/* ===========================================
            Students Table
        =========================================== */}

        <Card className="inventory-table-card">
          <Card.Header>

            <div>
              <Card.Title as="h4">
                Student Records
              </Card.Title>

              <p className="card-category">
                View, edit, and remove registered students.
              </p>
            </div>

          </Card.Header>

         <Card.Body className="p-0">
          <div className="table-responsive">
            {sortedStudents.length === 0 ? (
              <Table className="inventory-table">
                <tbody>
                  <tr>
                    <td
                      colSpan="3"
                      className="text-center py-5"
                    >
                      No students found.
                    </td>
                  </tr>
                </tbody>
              </Table>
            ) : (
              <Table className="inventory-table">
                <thead>
                  <tr>
                    <th
                      role="button"
                      onClick={() => toggleSort("tupt_id")}
                      style={{ cursor: "pointer" }}
                    >
                      Student No.
                      <SortIndicator columnKey="tupt_id" />
                    </th>

                    <th
                      role="button"
                      onClick={() => toggleSort("full_name")}
                      style={{ cursor: "pointer" }}
                    >
                      Student Name
                      <SortIndicator columnKey="full_name" />
                    </th>

                    <th className="text-center">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {sortedStudents.map(student => (
                    <tr key={student.id}>
                      <td>
                        <strong>{student.tupt_id}</strong>
                      </td>

                      <td>
                        {student.full_name}
                      </td>

                      <td className="text-center">
                        <div className="action-buttons">

                          <OverlayTrigger
                            placement="top"
                            overlay={<Tooltip>Edit Student</Tooltip>}
                          >
                            <Button
                              size="sm"
                              className="action-btn edit"
                              onClick={() => startEdit(student)}
                            >
                              <i className="fas fa-pen"></i>
                            </Button>
                          </OverlayTrigger>

                          <OverlayTrigger
                            placement="top"
                            overlay={<Tooltip>Delete Student</Tooltip>}
                          >
                            <Button
                              size="sm"
                              className="action-btn delete"
                              onClick={() => handleDelete(student)}
                            >
                              <i className="fas fa-trash-alt"></i>
                            </Button>
                          </OverlayTrigger>

                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>
        </Card.Body>
            </Card>
      </Container>
      <NotificationModal
        show={notification.show}
        onClose={() => setNotification((n) => ({ ...n, show: false }))}
        title={"Notification"}
        message={notification.message}
      />

      {/* Add Student modal */}
      {showAdd && (
        <>
          <div className="modal-backdrop show" />
          <div className="modal d-block" tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content">
                <form onSubmit={handleAddSubmit}>
                  <div className="modal-header">
                    <h5 className="modal-title">Add Student</h5>
                    <button type="button" className="btn-close" aria-label="Close" onClick={closeAdd} />
                  </div>
                  <div className="modal-body">
                    <div className="form-group mb-2">
                      <label>TUPT ID (Student No.)</label>
                      <input
                        className="form-control"
                        name="tupt_id"
                        value={addForm.tupt_id}
                        onChange={handleAddChange}
                        placeholder="e.g. TUPT-23-1146"
                        required
                      />
                    </div>
                    <div className="form-group mb-2">
                      <label>Full Name</label>
                      <input
                        className="form-control"
                        name="full_name"
                        value={addForm.full_name}
                        onChange={handleAddChange}
                        placeholder="e.g. ALICANDO, BLESSIE ALICANDO"
                        required
                      />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={closeAdd}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={adding}>
                      {adding ? "Adding..." : "Add Student"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Import modal */}
      {showImport && (
        <>
          <div className="modal-backdrop show" />
          <div className="modal d-block" tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content">
                <form onSubmit={handleImportSubmit}>
                  <div className="modal-header">
                    <h5 className="modal-title">Import Students (CSV / XLSX)</h5>
                    <button type="button" className="btn-close" aria-label="Close" onClick={closeImport} />
                  </div>
                  <div className="modal-body">
                    <p className="mb-2" style={{ fontSize: 13, color: "#666" }}>
                      File must have columns like <b>Student No.</b> and <b>Student Name</b>{" "}
                      (also accepts <code>tupt_id</code> / <code>full_name</code>). Re-importing the
                      same file updates existing records instead of duplicating them.
                    </p>
                    <div className="form-group mb-2">
                      <label>File</label>
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        className="form-control"
                        onChange={handleImportFileChange}
                      />
                    </div>
                    {importResult && (
                      <div className="mt-3" style={{ fontSize: 13 }}>
                        <div>Total rows read: {importResult.total_rows}</div>
                        <div>Imported / updated: {importResult.imported_or_updated}</div>
                        {importResult.skipped && importResult.skipped.length > 0 && (
                          <div style={{ color: "#b00020", marginTop: 4 }}>
                            Skipped {importResult.skipped.length} row(s) (missing Student No. or Name).
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={closeImport}>
                      Close
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={importing}>
                      {importing ? "Importing..." : "Import"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit modal */}
      {editing && (
        <>
          <div className="modal-backdrop show" />
          <div className="modal d-block" tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content">
                <form onSubmit={saveEdit}>
                  <div className="modal-header">
                    <h5 className="modal-title">Edit Student</h5>
                    <button type="button" className="btn-close" aria-label="Close" onClick={cancelEdit} />
                  </div>
                  <div className="modal-body">
                    <div className="form-group mb-2">
                      <label>TUPT ID (Student No.)</label>
                      <input
                        className="form-control"
                        name="tupt_id"
                        value={editForm.tupt_id}
                        onChange={handleEditChange}
                        required
                      />
                    </div>
                    <div className="form-group mb-2">
                      <label>Full Name</label>
                      <input
                        className="form-control"
                        name="full_name"
                        value={editForm.full_name}
                        onChange={handleEditChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <>
          <div className="modal-backdrop show" />
          <div className="modal d-block" tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Confirm Delete</h5>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => setConfirmDelete(null)}
                  />
                </div>
                <div className="modal-body">
                  Are you sure you want to delete <b>{confirmDelete.full_name}</b> (
                  {confirmDelete.tupt_id})?
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-danger" onClick={confirmDeleteNow}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  </>
  );
}

export default ManageStudents;