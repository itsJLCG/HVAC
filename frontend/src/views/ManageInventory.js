// frontend > src > views > ManageInventory.js
import React, { useState, useEffect, useRef } from "react";
import QRCode from "react-qr-code";
import {
  Card,
  Container,
  Row,
  Col,
  Button,
  Table,
  Alert,
  OverlayTrigger,
  Tooltip
} from "react-bootstrap";import NotificationModal from "components/NotificationModal/NotificationModal";

import "../assets/css/ManageInventory.css";

// Leave empty by default so fetch("/api/...") goes to the CRA proxy (package.json `proxy`).
// Set `REACT_APP_API_BASE` to a full URL if you need to override in production.
const API_BASE = process.env.REACT_APP_API_BASE || "";

function ManageInventory() {
  const [items, setItems] = useState([]);
  const qrRefs = useRef({});

  // --- Add modal state ---
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", quantity: "", description: "" });
  const [addFile, setAddFile] = useState(null);
  const [addPreviewUrl, setAddPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  // --- Edit modal state ---
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", quantity: 0, description: "" });
  const [editFile, setEditFile] = useState(null);
  const [editPreviewUrl, setEditPreviewUrl] = useState(null);
  const [qrValue, setQrValue] = useState(null);

  // --- Delete confirmation state ---
  const [confirmDelete, setConfirmDelete] = useState(null);

  // --- Shared alert/notification state ---
  const [alert, setAlert] = useState({ show: false, variant: "success", message: "" });
  const [notification, setNotification] = useState({ show: false, title: "", message: "" });
  const [searchTerm, setSearchTerm] = useState("");

  const notify = (variant, message) => {
    setNotification({ show: true, title: "", message });
    setAlert({ show: true, variant, message });
    setTimeout(() => setAlert((a) => ({ ...a, show: false })), 4000);
  };

  const loadItems = () => {
    fetch(`${API_BASE}/api/items`)
      .then((r) => r.json())
      .then((data) => setItems(data))
      .catch(() => setItems([]));
  };

  useEffect(() => {
    loadItems();
  }, []);

  // ---------------------------------------------------------------------
  // Add
  // ---------------------------------------------------------------------
  const handleShowAdd = () => setShowAdd(true);
  const handleCloseAdd = () => {
    setShowAdd(false);
    setAddForm({ name: "", quantity: "", description: "" });
    setAddFile(null);
    setAddPreviewUrl(null);
  };

  const handleAddChange = (e) => {
    const { name, value } = e.target;
    setAddForm((s) => ({ ...s, [name]: value }));
  };

  const handleAddFileChange = (e) => {
    const f = e.target.files && e.target.files[0];
    setAddFile(f || null);
    setAddPreviewUrl(f ? URL.createObjectURL(f) : null);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      setUploading(true);
      let res;
      if (addFile) {
        const fd = new FormData();
        fd.append("image", addFile);
        fd.append("name", addForm.name);
        fd.append("quantity", Number(addForm.quantity || 0));
        fd.append("description", addForm.description);
        res = await fetch(`${API_BASE}/api/items`, {
          method: "POST",
          body: fd,
        });
      } else {
        const payload = { ...addForm, quantity: Number(addForm.quantity || 0) };
        res = await fetch(`${API_BASE}/api/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) throw new Error("Failed to add item");
      const data = await res.json();
      loadItems();
      handleCloseAdd();
      notify("success", `${data.name} added to the inventory and QR Code Generated Successfully.`);
    } catch (err) {
      notify("danger", err.message || "Failed to add item");
    } finally {
      setUploading(false);
    }
  };

  // ---------------------------------------------------------------------
  // Edit
  // ---------------------------------------------------------------------
  const startEdit = (item) => {
    setEditing(item.id);
    setEditForm({ name: item.name || "", quantity: item.quantity || 0, description: item.description || "" });
    setEditPreviewUrl(item.image_url || null);
    setEditFile(null);
    setQrValue(item.name || `inventory:${item.id}`);
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditForm({ name: "", quantity: 0, description: "" });
    setEditFile(null);
    setEditPreviewUrl(null);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((s) => ({ ...s, [name]: name === "quantity" ? Number(value) : value }));
    if (name === "name") {
      setQrValue(value);
    }
  };

  const handleEditFileChange = (e) => {
    const f = e.target.files && e.target.files[0];
    setEditFile(f || null);
    setEditPreviewUrl(f ? URL.createObjectURL(f) : editPreviewUrl);
  };

  const saveEdit = (e) => {
    e.preventDefault();
    if (!editing) return;
    (async () => {
      try {
        let res;
        if (editFile) {
          const fd = new FormData();
          fd.append("image", editFile);
          fd.append("name", editForm.name);
          fd.append("quantity", editForm.quantity);
          fd.append("description", editForm.description);
          res = await fetch(`${API_BASE}/api/items/${editing}`, {
            method: "PUT",
            body: fd,
          });
        } else {
          // No new file: keep existing previewUrl (may be remote URL)
          const image_url = editPreviewUrl && editPreviewUrl.startsWith("blob:") ? null : editPreviewUrl || null;
          const payload = { ...editForm };
          if (image_url) payload.image_url = image_url;
          res = await fetch(`${API_BASE}/api/items/${editing}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        }
        if (!res.ok) throw new Error("Failed to update");
        await res.json();
        cancelEdit();
        loadItems();
        notify("success", `${editForm.name || "Item"} updated successfully.`);
      } catch (err) {
        notify("danger", `Failed to update ${editForm.name || "item"}`);
      }
    })();
  };

  const regenerateQr = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/items/${editing}/regenerate-qr`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to regenerate QR");
      const updated = await res.json();
      setQrValue(updated.name || editForm.name);
      loadItems();
      notify("success", "QR regenerated");
    } catch (e) {
      notify("danger", "Failed to regenerate QR");
    }
  };

  // ---------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------
  const handleDelete = (item) => setConfirmDelete(item);

  const confirmDeleteNow = () => {
    if (!confirmDelete) return;
    fetch(`${API_BASE}/api/items/${confirmDelete.id}`, { method: "DELETE" })
      .then(() => {
        notify("success", `${confirmDelete.name} Deleted Successfully.`);
        setConfirmDelete(null);
        loadItems();
      })
      .catch(() => {
        notify("danger", `Failed to delete ${confirmDelete.name}`);
      });
  };

  // ---------------------------------------------------------------------
  // Print QR
  // ---------------------------------------------------------------------
  const handlePrint = (item) => {
    try {
      const container = qrRefs.current[item.id];
      const svgHtml = container ? container.innerHTML : "";
      const name = item.name || "Item";
      const html = `<!doctype html><html><head><title>Print QR</title><meta charset="utf-8" /><style>
        @page { size: A4 portrait; margin: 20mm; }
        body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:0;background:#fff;color:#000}
        .wrap{width:100%;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:10mm 0}
        .card{width:80vw;max-width:700px;display:flex;flex-direction:column;align-items:center;border:1px solid #eee;padding:28px;border-radius:8px;background:#fff;box-shadow:none}
        /* make SVG scale to available card width but stay square */
        .card svg{width:100%;height:auto;max-width:600px;display:block}
        .name{margin-top:20px;font-size:32px;font-weight:800;text-align:center}
        @media print { html,body{height:auto;} .card{border:none;padding:0;width:100%;max-width:100%;} }
      </style></head><body><div class="wrap"><div class="card">${svgHtml}<div class="name">${name}</div></div></div><script>window.onload=function(){setTimeout(()=>{window.print();},200);};</script></body></html>`;
      const w = window.open("", "_blank", "width=400,height=600");
      if (!w) {
        alert("Pop-up blocked. Please allow popups to print the QR code.");
        return;
      }
      w.document.open();
      w.document.write(html);
      w.document.close();
    } catch (e) {
      console.error("print error", e);
      alert("Failed to open print dialog");
    }
  };

    const filteredItems = items.filter(item => {
    const term = searchTerm.toLowerCase();

    return (
      item.name?.toLowerCase().includes(term) ||
      item.description?.toLowerCase().includes(term) ||
      String(item.quantity).includes(term)
    );
  });

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
            <h2 className="manage-title">Manage Inventory</h2>

            <p className="manage-subtitle">
              Manage university equipment, laboratory assets,
              and inventory records.
            </p>
          </div>

          <Button
            className="btn-add-inventory"
            onClick={handleShowAdd}
          >
            <i className="nc-icon nc-simple-add"></i>
            Add Inventory
          </Button>
        </div>

        {/* ===========================================
            Statistics
        =========================================== */}

        <Row className="mb-4">
          <Col lg="4" md="6">
            <Card className="summary-card">
              <Card.Body>
                <div className="summary-icon maroon">
                  <i className="nc-icon nc-box"></i>
                </div>

                <div>
                  <span>Total Items</span>
                  <h3>{items.length}</h3>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg="4" md="6">
            <Card className="summary-card">
              <Card.Body>
                <div className="summary-icon gold">
                  <i className="nc-icon nc-check-2"></i>
                </div>

                <div>
                  <span>Available</span>
                  <h3>
                    {items.filter(item => item.quantity > 0).length}
                  </h3>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg="4" md="6">
            <Card className="summary-card">
              <Card.Body>
                <div className="summary-icon navy">
                  <i className="nc-icon nc-simple-remove"></i>
                </div>

                <div>
                  <span>Out of Stock</span>
                  <h3>
                    {items.filter(item => item.quantity <= 0).length}
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
                placeholder="Search inventory..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </Card.Body>
        </Card>

        {/* ===========================================
            Inventory Table
        =========================================== */}

        <Card className="inventory-table-card">
          <Card.Header>
            <div>
              <Card.Title as="h4">
                Inventory Records
              </Card.Title>

              <p className="card-category">
                View, update, print QR codes, and manage inventory items.
              </p>
            </div>
          </Card.Header>

          <Card.Body className="p-0">
            <div className="table-responsive">
              <Table className="inventory-table">
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>QR Code</th>
                    <th>Item Name</th>
                    <th>Quantity</th>
                    <th>Description</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="text-center py-5"
                      >
                        {searchTerm
                          ? `No inventory found for "${searchTerm}".`
                          : "No inventory items found."}
                      </td>
                    </tr>
                  ) : (
                      filteredItems.map(item => (
                        <tr key={item.id}>
                        <td>
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="table-image"
                            />
                          ) : (
                            <div className="table-image placeholder">
                              <i className="nc-icon nc-image"></i>
                            </div>
                          )}
                        </td>

                        <td>
                          <div
                            ref={el => (qrRefs.current[item.id] = el)}
                          >
                            <QRCode
                              value={item.name || item.qr_value}
                              size={60}
                            />
                          </div>
                        </td>

                        <td>
                          <strong>{item.name}</strong>
                        </td>

                        <td>
                          <span
                            className={
                              item.quantity > 0
                                ? "status-badge available"
                                : "status-badge unavailable"
                            }
                          >
                            {item.quantity}
                          </span>
                        </td>

                        <td>{item.description || "-"}</td>

                        <td className="text-center">
                          <div className="action-buttons">

                            <OverlayTrigger
                              placement="top"
                              overlay={<Tooltip>Edit Inventory</Tooltip>}
                            >
                              <Button
                                size="sm"
                                className="action-btn edit"
                                onClick={() => startEdit(item)}
                              >
                                <i className="fas fa-pen"></i>
                              </Button>
                            </OverlayTrigger>

                            <OverlayTrigger
                              placement="top"
                              overlay={<Tooltip>Print QR Code</Tooltip>}
                            >
                              <Button
                                size="sm"
                                className="action-btn print"
                                onClick={() => handlePrint(item)}
                              >
                                <i className="fas fa-qrcode"></i>
                              </Button>
                            </OverlayTrigger>

                            <OverlayTrigger
                              placement="top"
                              overlay={<Tooltip>Delete Inventory</Tooltip>}
                            >
                              <Button
                                size="sm"
                                className="action-btn delete"
                                onClick={() => handleDelete(item)}
                              >
                                <i className="fas fa-trash-alt"></i>
                              </Button>
                            </OverlayTrigger>

                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>

        <NotificationModal
          show={notification.show}
          onClose={() =>
            setNotification(prev => ({
              ...prev,
              show: false
            }))
          }
          title="Notification"
          message={notification.message}
        />
      </Container>

      {/* ===========================================
          Add Inventory Modal
      =========================================== */}

      {showAdd && (
        <>
          <div className="modal-backdrop show" />

          <div
            className="modal d-block manage-modal"
            tabIndex="-1"
            role="dialog"
          >
            <div
              className="modal-dialog modal-lg modal-dialog-centered"
              role="document"
            >
              <div className="modal-content">
                <form onSubmit={handleAdd}>
                  <div className="modal-header">
                    <div>
                      <h4 className="modal-title">
                        Add Inventory Item
                      </h4>

                      <p className="modal-subtitle">
                        Register a new equipment or laboratory asset.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn-close"
                      onClick={handleCloseAdd}
                    />
                  </div>

                  <div className="modal-body">
                    <Row>
                      {/* Left Column */}

                      <Col lg={8}>
                        <div className="form-group">
                          <label>Item Name</label>

                          <input
                            type="text"
                            className="form-control"
                            name="name"
                            value={addForm.name}
                            onChange={handleAddChange}
                            placeholder="Enter item name"
                            required
                          />
                        </div>

                        <div className="form-group mt-3">
                          <label>Description</label>

                          <textarea
                            rows="5"
                            className="form-control"
                            name="description"
                            value={addForm.description}
                            onChange={handleAddChange}
                            placeholder="Enter item description"
                          />
                        </div>

                        <div className="form-group mt-3">
                          <label>Quantity</label>

                          <input
                            type="number"
                            min="0"
                            className="form-control"
                            name="quantity"
                            value={addForm.quantity}
                            onChange={handleAddChange}
                          />
                        </div>
                      </Col>

                      {/* Right Column */}

                      <Col lg={4}>
                        <div className="image-upload-card">
                          <div className="image-preview">
                            {addPreviewUrl ? (
                              <img
                                src={addPreviewUrl}
                                alt="Preview"
                              />
                            ) : (
                              <div className="upload-placeholder">
                                <i className="nc-icon nc-image"></i>

                                <span>No Image</span>
                              </div>
                            )}
                          </div>

                          <label className="upload-btn">
                            Choose Image

                            <input
                              hidden
                              type="file"
                              accept="image/*"
                              onChange={handleAddFileChange}
                            />
                          </label>

                          <small className="text-muted">
                            JPG, PNG or JPEG
                          </small>
                        </div>
                      </Col>
                    </Row>
                  </div>

                  <div className="modal-footer">
                    <Button
                      variant="light"
                      className="btn-cancel"
                      onClick={handleCloseAdd}
                    >
                      Cancel
                    </Button>

                    <Button
                      type="submit"
                      className="btn-save"
                      disabled={uploading}
                    >
                      {uploading ? "Uploading..." : "Add Inventory"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ===========================================
          Edit Inventory Modal
      =========================================== */}

      {editing && (
        <>
          <div className="modal-backdrop show" />

          <div
            className="modal d-block manage-modal"
            tabIndex="-1"
            role="dialog"
          >
            <div
              className="modal-dialog modal-xl modal-dialog-centered"
              role="document"
            >
              <div className="modal-content">
                <form onSubmit={saveEdit}>
                  <div className="modal-header">
                    <div>
                      <h4 className="modal-title">
                        Edit Inventory Item
                      </h4>

                      <p className="modal-subtitle">
                        Update inventory information, replace its image,
                        or regenerate its QR code.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn-close"
                      onClick={cancelEdit}
                    />
                  </div>

                  <div className="modal-body">
                    <Row>
                      {/* ===========================================
                          Item Information
                      =========================================== */}

                      <Col lg={6}>
                        <div className="form-group">
                          <label>Item Name</label>

                          <input
                            type="text"
                            className="form-control"
                            name="name"
                            value={editForm.name}
                            onChange={handleEditChange}
                            required
                          />
                        </div>

                        <div className="form-group mt-3">
                          <label>Description</label>

                          <textarea
                            rows="5"
                            className="form-control"
                            name="description"
                            value={editForm.description}
                            onChange={handleEditChange}
                          />
                        </div>

                        <div className="form-group mt-3">
                          <label>Quantity</label>

                          <input
                            type="number"
                            className="form-control"
                            name="quantity"
                            value={editForm.quantity}
                            onChange={handleEditChange}
                          />
                        </div>
                      </Col>

                      {/* ===========================================
                          Image Upload
                      =========================================== */}

                      <Col lg={3}>
                        <div className="image-upload-card">
                          <div className="image-preview">
                            {editPreviewUrl ? (
                              <img
                                src={editPreviewUrl}
                                alt="Preview"
                              />
                            ) : (
                              <div className="upload-placeholder">
                                <i className="nc-icon nc-image"></i>

                                <span>No Image</span>
                              </div>
                            )}
                          </div>

                          <label className="upload-btn">
                            Change Image

                            <input
                              hidden
                              type="file"
                              accept="image/*"
                              onChange={handleEditFileChange}
                            />
                          </label>
                        </div>
                      </Col>

                      {/* ===========================================
                          QR Code
                      =========================================== */}

                      <Col lg={3}>
                        <div className="qr-card">
                          <h6 className="qr-title">
                            QR Code
                          </h6>

                          <div className="qr-box">
                            <QRCode
                              value={
                                editForm.name ||
                                qrValue ||
                                `inventory:${editing}`
                              }
                              size={160}
                            />
                          </div>

                          <Button
                            className="btn-regenerate"
                            onClick={regenerateQr}
                          >
                            Regenerate QR
                          </Button>
                        </div>
                      </Col>
                    </Row>
                  </div>
                              <div className="modal-footer">
              <Button
                variant="light"
                className="btn-cancel"
                onClick={cancelEdit}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                className="btn-save"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </>
      )}

      {/* ===========================================
          Delete Confirmation Modal
      =========================================== */}

      {confirmDelete && (
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
                    Delete Inventory Item
                  </h4>

                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setConfirmDelete(null)}
                  />
                </div>

                <div className="modal-body text-center">
                  <div className="delete-icon">
                    <i className="nc-icon nc-simple-remove"></i>
                  </div>

                  <h5 className="mt-3">
                    Are you sure?
                  </h5>

                  <p className="delete-message">
                    You are about to permanently delete
                    <strong> {confirmDelete.name} </strong>
                    from the inventory.
                  </p>

                  <small className="text-muted">
                    This action cannot be undone.
                  </small>
                </div>

                <div className="modal-footer justify-content-center">
                  <Button
                    variant="light"
                    className="btn-cancel"
                    onClick={() => setConfirmDelete(null)}
                  >
                    Cancel
                  </Button>

                  <Button
                    className="btn-delete-confirm"
                    onClick={confirmDeleteNow}
                  >
                    Delete Item
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <NotificationModal
        show={notification.show}
        onClose={() =>
          setNotification((n) => ({
            ...n,
            show: false
          }))
        }
        title="Notification"
        message={notification.message}
      />
    </div>
</>
)};

export default ManageInventory;