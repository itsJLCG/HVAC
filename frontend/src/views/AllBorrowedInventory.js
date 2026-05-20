import React from "react";
// react-bootstrap components
import { Card, Container, Row, Col, Table } from "react-bootstrap";

function AllBorrowedInventory() {
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
                    <tr>
                      <td>Projector</td>
                      <td>John Doe</td>
                      <td>2026-05-10</td>
                      <td>2026-05-20</td>
                    </tr>
                    <tr>
                      <td>Microphone</td>
                      <td>Jane Smith</td>
                      <td>2026-05-12</td>
                      <td>2026-05-18</td>
                    </tr>
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
}

export default AllBorrowedInventory;
