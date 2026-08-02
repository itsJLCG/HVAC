// frontend > src > views > ManageInventory.js
import React, { useState, useEffect, useRef } from "react";
import QRCode from "react-qr-code";
import { Card, Container, Row, Col, Button, Table, Alert } from "react-bootstrap";
import NotificationModal from "components/NotificationModal/NotificationModal";

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

  return (
    <>
      <Container fluid>
        {alert.show && (
          <Row>
            <Col md="12">
              <Alert variant={alert.variant}>{alert.message}</Alert>
            </Col>
          </Row>
        )}
        <Row>
          <Col md="12">
            <Card className="strpied-tabled-with-hover">
              <Card.Header className="d-flex align-items-center justify-content-between">
                <div>
                  <Card.Title as="h4">Manage Inventory</Card.Title>
                  <p className="card-category">Add, edit, delete, and print QR codes for inventory items</p>
                </div>
                <div>
                  <Button variant="primary" className="btn-fill" onClick={handleShowAdd}>
                    + Add Inventory
                  </Button>
                </div>
              </Card.Header>
              <Card.Body className="table-full-width table-responsive px-0">
                <Table className="table-hover table-striped">
                  <thead>
                    <tr>
                      <th className="border-0">Image</th>
                      <th className="border-0">QR</th>
                      <th className="border-0">Item</th>
                      <th className="border-0">Quantity</th>
                      <th className="border-0">Description</th>
                      <th className="border-0">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center">
                          No inventory items yet. Click "+ Add Inventory" to create one.
                        </td>
                      </tr>
                    ) : (
                      items.map((it, idx) => (
                        <tr key={it.id ?? idx}>
                          <td style={{ width: 80 }}>
                            {it.image_url ? (
                              <img src={it.image_url} alt={it.name} style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 4 }} />
                            ) : (
                              "—"
                            )}
                          </td>
                          <td style={{ width: 80 }}>
                            {it.name || it.qr_value ? (
                              typeof QRCode !== "undefined" && QRCode ? (
                                <div ref={(el) => (qrRefs.current[it.id] = el)} style={{ width: 64, height: 64 }}>
                                  <QRCode value={it.name || it.qr_value} size={64} />
                                </div>
                              ) : (
                                <span>QR unavailable</span>
                              )
                            ) : (
                              "—"
                            )}
                          </td>
                          <td>{it.name}</td>
                          <td>{it.quantity}</td>
                          <td>{it.description}</td>
                          <td style={{ minWidth: 220 }}>
                            <Button size="sm" variant="info" onClick={() => startEdit(it)}>
                              Edit
                            </Button>{" "}
                            <Button size="sm" variant="danger" onClick={() => handleDelete(it)}>
                              Delete
                            </Button>{" "}
                            <Button size="sm" variant="secondary" onClick={() => handlePrint(it)}>
                              Print QR
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      <NotificationModal
        show={notification.show}
        onClose={() => setNotification((n) => ({ ...n, show: false }))}
        title={"Notification"}
        message={notification.message}
      />

      {/* Add modal */}
      {showAdd && (
        <>
          <div className="modal-backdrop show" />
          <div className="modal d-block" tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content">
                <form onSubmit={handleAdd}>
                  <div className="modal-header">
                    <h5 className="modal-title">Add Inventory Item</h5>
                    <button type="button" className="btn-close" aria-label="Close" onClick={handleCloseAdd} />
                  </div>
                  <div className="modal-body">
                    <div className="form-group mb-2">
                      <label>Item Name</label>
                      <input className="form-control" name="name" value={addForm.name} onChange={handleAddChange} required />
                    </div>
                    <div className="form-group mb-2">
                      <label>Quantity</label>
                      <input className="form-control" name="quantity" value={addForm.quantity} onChange={handleAddChange} type="number" />
                    </div>
                    <div className="form-group mb-2">
                      <label>Description</label>
                      <textarea className="form-control" rows={3} name="description" value={addForm.description} onChange={handleAddChange} />
                    </div>
                    <div className="form-group mb-2">
                      <label>Image</label>
                      <input type="file" accept="image/*" className="form-control" onChange={handleAddFileChange} />
                      {addPreviewUrl && <img src={addPreviewUrl} alt="preview" style={{ marginTop: 8, width: 120, height: 80, objectFit: "cover" }} />}
                    </div>
                    {/* QR preview removed — QR uses the item name and shows in the table after add */}
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={handleCloseAdd}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={uploading}>
                      {uploading ? "Uploading..." : "Add Inventory"}
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
                    <h5 className="modal-title">Edit Inventory Item</h5>
                    <button type="button" className="btn-close" aria-label="Close" onClick={cancelEdit} />
                  </div>
                  <div className="modal-body">
                    <div className="form-group mb-2">
                      <label>Item Name</label>
                      <input className="form-control" name="name" value={editForm.name} onChange={handleEditChange} required />
                    </div>
                    <div className="form-group mb-2">
                      <label>Quantity</label>
                      <input className="form-control" name="quantity" value={editForm.quantity} onChange={handleEditChange} type="number" />
                    </div>
                    <div className="form-group mb-2">
                      <label>Description</label>
                      <textarea className="form-control" rows={3} name="description" value={editForm.description} onChange={handleEditChange} />
                    </div>
                    <div className="form-group mb-2">
                      <label>Image</label>
                      <input type="file" accept="image/*" className="form-control" onChange={handleEditFileChange} />
                      {editPreviewUrl && <img src={editPreviewUrl} alt="preview" style={{ marginTop: 8, width: 120, height: 80, objectFit: "cover" }} />}
                    </div>
                    <div className="form-group mb-2">
                      <label>QR Code</label>
                      <div style={{ padding: 8, background: "#fff", display: "inline-block" }}>
                        {typeof QRCode !== "undefined" && QRCode ? (
                          <QRCode value={editForm.name || qrValue || `inventory:${editing}`} size={128} />
                        ) : (
                          <span>QR unavailable</span>
                        )}
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <Button size="sm" variant="secondary" onClick={regenerateQr}>
                          Regenerate QR
                        </Button>
                      </div>
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

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <>
          <div className="modal-backdrop show" />
          <div className="modal d-block" tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Confirm Delete</h5>
                  <button type="button" className="btn-close" aria-label="Close" onClick={() => setConfirmDelete(null)} />
                </div>
                <div className="modal-body">
                  Are you sure you want to delete <b>{confirmDelete.name}</b>?
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
    </>
  );
}

export default ManageInventory;