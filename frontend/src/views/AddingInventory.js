import React, { useState } from "react";
import { Card, Container, Row, Col, Button, Table, Alert } from "react-bootstrap";

function AddingInventory() {
  const [show, setShow] = useState(false);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: "", sku: "", quantity: "", description: "" });

  const handleShow = () => setShow(true);
  const handleClose = () => {
    setShow(false);
    setForm({ name: "", sku: "", quantity: "", description: "" });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const handleAdd = (e) => {
    e.preventDefault();
    // send to backend
    fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, quantity: Number(form.quantity || 0) }),
    })
      .then((r) => r.json())
      .then(() => {
        loadItems();
        handleClose();
        notify("success", "Inventory item added");
      })
      .catch(() => notify("danger", "Failed to add item"));
  };

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [alert, setAlert] = useState({ show: false, variant: "success", message: "" });
  const notify = (variant, message) => {
    setAlert({ show: true, variant, message });
    setTimeout(() => setAlert((a) => ({ ...a, show: false })), 4000);
  };

  const handleDelete = (index) => {
    const item = items[index];
    if (!item) return;
    setConfirmDelete(item);
  };

  const confirmDeleteNow = () => {
    if (!confirmDelete) return;
    fetch(`/api/items/${confirmDelete.id}`, { method: "DELETE" })
      .then(() => {
        notify("success", `Deleted ${confirmDelete.name}`);
        setConfirmDelete(null);
        loadItems();
      })
      .catch(() => notify("danger", `Failed to delete ${confirmDelete.name}`));
  };

  const loadItems = () => {
    fetch("/api/items")
      .then((r) => r.json())
      .then((data) => setItems(data));
  };

  React.useEffect(() => {
    loadItems();
  }, []);

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
                      <th className="border-0">Item</th>
                      <th className="border-0">SKU</th>
                      <th className="border-0">Quantity</th>
                      <th className="border-0">Description</th>
                      <th className="border-0">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center">
                          No inventory items yet. Click "+ Add Inventory" to create one.
                        </td>
                      </tr>
                    ) : (
                      items.map((it, idx) => (
                        <tr key={idx}>
                          <td>{it.name}</td>
                          <td>{it.sku}</td>
                          <td>{it.quantity}</td>
                          <td>{it.description}</td>
                          <td>
                            <Button size="sm" variant="danger" onClick={() => handleDelete(idx)}>
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
                      <label>SKU</label>
                      <input className="form-control" name="sku" value={form.sku} onChange={handleChange} />
                    </div>
                    <div className="form-group mb-2">
                      <label>Quantity</label>
                      <input className="form-control" name="quantity" value={form.quantity} onChange={handleChange} type="number" />
                    </div>
                    <div className="form-group mb-2">
                      <label>Description</label>
                      <textarea className="form-control" rows={3} name="description" value={form.description} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={handleClose}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Add Inventory
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

export default AddingInventory;
