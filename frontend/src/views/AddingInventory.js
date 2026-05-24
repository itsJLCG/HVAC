import React, { useState } from "react";
import QRCode from "react-qr-code";
import { Card, Container, Row, Col, Button, Table, Alert } from "react-bootstrap";
import NotificationModal from "components/NotificationModal/NotificationModal";

// Leave empty by default so fetch("/api/...") goes to the CRA proxy (package.json `proxy`).
// Set `REACT_APP_API_BASE` to a full URL if you need to override in production.
const API_BASE = process.env.REACT_APP_API_BASE || "";

function AddingInventory() {
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      console.log("AddingInventory: typeof QRCode =", typeof QRCode);
    }
  }, []);
  const [show, setShow] = useState(false);
  const [items, setItems] = useState([]);
  const qrRefs = React.useRef({});
  const [form, setForm] = useState({ name: "", quantity: "", description: "" });
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleShow = () => setShow(true);
  const handleClose = () => {
    setShow(false);
    setForm({ name: "", quantity: "", description: "" });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const handleFileChange = (e) => {
    const f = e.target.files && e.target.files[0];
    setFile(f || null);
    setPreviewUrl(f ? URL.createObjectURL(f) : null);
  };

  

  // Local upload handled by backend: send FormData with `image` field

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      setUploading(true);
      let res;
        if (file) {
        const fd = new FormData();
        fd.append("image", file);
        fd.append("name", form.name);
        fd.append("quantity", Number(form.quantity || 0));
        fd.append("description", form.description);
        res = await fetch(`${API_BASE}/api/items`, {
          method: "POST",
          body: fd,
        });
      } else {
        const payload = { ...form, quantity: Number(form.quantity || 0) };
        res = await fetch(`${API_BASE}/api/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) throw new Error("Failed to add item");
      const data = await res.json();
      loadItems();
      handleClose();
      setFile(null);
      setPreviewUrl(null);
      notify("success", `${data.name} added to the inventory and QR Code Generated Successfully.`);
    } catch (err) {
      notify("danger", err.message || "Failed to add item");
    } finally {
      setUploading(false);
    }
  };

  // Deletion is handled in UpdateInventory page; remove delete logic here
  const [alert, setAlert] = useState({ show: false, variant: "success", message: "" });
  const [notification, setNotification] = useState({ show: false, title: "", message: "" });
  const notify = (variant, message) => {
    // show modal-style notification (container) instead of toast
    setNotification({ show: true, title: "", message });
    // also keep inline alert as fallback
    setAlert({ show: true, variant, message });
    setTimeout(() => setAlert((a) => ({ ...a, show: false })), 4000);
  };

  // no delete functions here

  const loadItems = () => {
    fetch(`${API_BASE}/api/items`)
      .then((r) => r.json())
      .then((data) => setItems(data))
      .catch(() => setItems([]));
  };

  React.useEffect(() => {
    loadItems();
  }, []);

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
                  <Card.Title as="h4">Add Inventory</Card.Title>
                  <p className="card-category">Manage inventory items</p>
                </div>
                <div>
                  <Button variant="primary" className="btn-fill" onClick={handleShow}>
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
                      <th className="border-0">Actions</th>
                      <th className="border-0">Item</th>
                      <th className="border-0">Quantity</th>
                      <th className="border-0">Description</th>
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
                        <tr key={idx}>
                          <td style={{ width: 80 }}>
                            {it.image_url ? (
                              <img src={it.image_url} alt={it.name} style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 4 }} />
                            ) : (
                              "—"
                            )}
                          </td>
                          <td style={{ width: 120 }}>
                            {it.qr_value ? (
                              typeof QRCode !== "undefined" && QRCode ? (
                                <div ref={(el) => (qrRefs.current[it.id] = el)} style={{ width: 64, height: 64 }}>
                                  <QRCode value={it.qr_value} size={64} />
                                </div>
                              ) : (
                                <span>QR unavailable</span>
                              )
                            ) : (
                              "—"
                            )}
                          </td>
                          <td style={{ width: 120 }}>
                            <Button size="sm" variant="secondary" onClick={() => handlePrint(it)}>
                              Print QR
                            </Button>
                          </td>
                          <td>{it.name}</td>
                          <td>{it.quantity}</td>
                          <td>{it.description}</td>
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

      {show && (
        <>
          <div className="modal-backdrop show" />
          <div className="modal d-block" tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content">
                <form onSubmit={handleAdd}>
                  <div className="modal-header">
                    <h5 className="modal-title">Add Inventory Item</h5>
                    <button type="button" className="btn-close" aria-label="Close" onClick={handleClose} />
                  </div>
                  <div className="modal-body">
                    <div className="form-group mb-2">
                      <label>Item Name</label>
                      <input className="form-control" name="name" value={form.name} onChange={handleChange} required />
                    </div>
                    <div className="form-group mb-2">
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
                      {/* QR preview removed — QR is generated server-side and shown in table after add */}
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={handleClose}>
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
      
    </>
  );
}

export default AddingInventory;
