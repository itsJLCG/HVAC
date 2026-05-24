import React, { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import { Card, Container, Row, Col, Table, Button, Alert } from "react-bootstrap";
import NotificationModal from "components/NotificationModal/NotificationModal";

// Leave empty by default so fetch("/api/...") goes to the CRA proxy (package.json `proxy`).
// Set `REACT_APP_API_BASE` to a full URL if you need to override in production.
const API_BASE = process.env.REACT_APP_API_BASE || "";

function UpdateInventory() {
  React.useEffect(() => {
    if (typeof window !== "undefined") console.log("UpdateInventory: typeof QRCode =", typeof QRCode);
  }, []);
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", quantity: 0, description: "" });
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
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

  const startEdit = (item) => {
    setEditing(item.id);
    setForm({ name: item.name || "", quantity: item.quantity || 0, description: item.description || "" });
    setPreviewUrl(item.image_url || null);
    setFile(null);
    setQrValue(item.qr_value || `inventory:${item.id}`);
  };

  const [qrValue, setQrValue] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: name === "quantity" ? Number(value) : value }));
  };

  const handleFileChange = (e) => {
    const f = e.target.files && e.target.files[0];
    setFile(f || null);
    setPreviewUrl(f ? URL.createObjectURL(f) : previewUrl);
  };

  // Local upload: backend accepts multipart form with `image` field

  const saveEdit = (e) => {
    e.preventDefault();
    if (!editing) return;
    (async () => {
      try {
        let res;
        // If user selected a new file, send FormData so backend can store it
        if (file) {
          const fd = new FormData();
          fd.append("image", file);
          fd.append("name", form.name);
          fd.append("quantity", form.quantity);
          fd.append("description", form.description);
          if (qrValue) fd.append('qr_value', qrValue);
          res = await fetch(`${API_BASE}/api/items/${editing}`, {
            method: "PUT",
            body: fd,
          });
        } else {
          // No new file: keep existing previewUrl (may be remote URL)
          const image_url = previewUrl && previewUrl.startsWith('blob:') ? null : previewUrl || null;
          const payload = { ...form };
          if (qrValue) payload.qr_value = qrValue;
          if (image_url) payload.image_url = image_url;
          res = await fetch(`${API_BASE}/api/items/${editing}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        }
        if (!res.ok) throw new Error("Failed to update");
        await res.json();
        setEditing(null);
        setFile(null);
        setPreviewUrl(null);
        loadItems();
        notify("success", `${form.name || "Item"} updated successfully.`);
      } catch (err) {
        notify("danger", `Failed to update ${form.name || "item"}`);
      }
    })();
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm({ name: "", quantity: 0, description: "" });
  };

  const handleDelete = (item) => {
    // open confirmation modal
    setConfirmDelete(item);
  };

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
              <Card.Header>
                <Card.Title as="h4">Update Inventory</Card.Title>
                <p className="card-category">Modify item information and stock levels</p>
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
                        <td colSpan={5} className="text-center">
                          No items found.
                        </td>
                      </tr>
                    ) : (
                      items.map((it) => (
                        <tr key={it.id}>
                          <td style={{ width: 80 }}>
                            {it.image_url ? (
                              <img src={it.image_url} alt={it.name} style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 4 }} />
                            ) : (
                              "—"
                            )}
                          </td>
                          <td style={{ width: 80 }}>
                            {it.qr_value ? (
                              typeof QRCode !== "undefined" && QRCode ? (
                                <div style={{ width: 64, height: 64 }}>
                                  <QRCode value={it.qr_value} size={64} />
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
                          <td>
                            <Button size="sm" variant="info" onClick={() => startEdit(it)}>
                              Edit
                            </Button>{" "}
                            <Button size="sm" variant="danger" onClick={() => handleDelete(it)}>
                              Delete
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
                      <input className="form-control" name="name" value={form.name} onChange={handleChange} required />
                    </div>
                    <div className="form-group mb-2">
                      <label>Quantity</label>
                      <input className="form-control" name="quantity" value={form.quantity} onChange={handleChange} type="number" />
                    </div>
                    <div className="form-group mb-2">
                      <label>Description</label>
                      <textarea className="form-control" rows={3} name="description" value={form.description} onChange={handleChange} />
                    </div>
                    <div className="form-group mb-2">
                      <label>Image</label>
                      <input type="file" accept="image/*" className="form-control" onChange={handleFileChange} />
                      {previewUrl && <img src={previewUrl} alt="preview" style={{ marginTop: 8, width: 120, height: 80, objectFit: "cover" }} />}
                    </div>
                      <div className="form-group mb-2">
                        <label>QR Code</label>
                        <div style={{ padding: 8, background: "#fff", display: "inline-block" }}>
                          {typeof QRCode !== "undefined" && QRCode ? (
                            <QRCode value={qrValue || `inventory:${editing}`} size={128} />
                          ) : (
                            <span>QR unavailable</span>
                          )}
                        </div>
                        <div style={{ marginTop: 8 }}>
                          <Button size="sm" variant="secondary" onClick={async () => {
                            try {
                              const res = await fetch(`${API_BASE}/api/items/${editing}/regenerate-qr`, { method: 'POST' });
                              if (!res.ok) throw new Error('Failed to regenerate QR');
                              const updated = await res.json();
                              setQrValue(updated.qr_value);
                              loadItems();
                              notify('success', 'QR regenerated');
                            } catch (e) {
                              notify('danger', 'Failed to regenerate QR');
                            }
                          }}>Regenerate QR</Button>
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
                  <button type="button" className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
                  <button type="button" className="btn btn-danger" onClick={confirmDeleteNow}>Delete</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default UpdateInventory;
