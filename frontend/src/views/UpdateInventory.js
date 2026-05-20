import React, { useState, useEffect } from "react";
import { Card, Container, Row, Col, Table, Button, Alert } from "react-bootstrap";

function UpdateInventory() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", sku: "", quantity: 0, description: "" });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [alert, setAlert] = useState({ show: false, variant: "success", message: "" });
  const notify = (variant, message) => {
    setAlert({ show: true, variant, message });
    setTimeout(() => setAlert((a) => ({ ...a, show: false })), 4000);
  };

  const loadItems = () => {
    fetch("/api/items")
      .then((r) => r.json())
      .then((data) => setItems(data));
  };

  useEffect(() => {
    loadItems();
  }, []);

  const startEdit = (item) => {
    setEditing(item.id);
    setForm({ name: item.name || "", sku: item.sku || "", quantity: item.quantity || 0, description: item.description || "" });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: name === "quantity" ? Number(value) : value }));
  };

  const saveEdit = (e) => {
    e.preventDefault();
    if (!editing) return;
    fetch(`/api/items/${editing}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
      .then((r) => r.json())
      .then(() => {
        setEditing(null);
        loadItems();
        notify("success", `Updated ${form.name || "item"}`);
      })
      .catch(() => notify("danger", `Failed to update ${form.name || "item"}`));
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm({ name: "", sku: "", quantity: 0, description: "" });
  };

  const handleDelete = (item) => {
    // open confirmation modal
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
                          No items found.
                        </td>
                      </tr>
                    ) : (
                      items.map((it) => (
                        <tr key={it.id}>
                          <td>{it.name}</td>
                          <td>{it.sku}</td>
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
