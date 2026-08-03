import React from "react";
import ChartistGraph from "react-chartist";
// react-bootstrap components
import {
  Button,
  Card,
  Table,
  Container,
  Row,
  Col,
  Form,
  OverlayTrigger,
  Tooltip,
} from "react-bootstrap";
import "../assets/css/Dashboard.css";

const API_BASE = process.env.REACT_APP_API_BASE || "";

function Dashboard() {
  const [stats, setStats] = React.useState({
    items: 0,
    students: 0,
    borrowed: 0,
    returned: 0,
  });
  const [activity, setActivity] = React.useState({
    labels: [],
    series: [[], [], []],
  });

  const loadStats = () => {
    fetch(`${API_BASE}/api/stats`)
      .then((res) => res.json())
      .then((data) =>
        setStats({
          items: data.items || 0,
          students: data.students || 0,
          borrowed: data.borrowed || 0,
          returned: data.returned || 0,
        })
      )
      .catch((err) => console.error("Failed to load stats:", err));
  };

  const buildActivityData = (borrows) => {
    const labels = [];
    const borrowed = [];
    const returned = [];
    const overdue = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const day = new Date(today);
      day.setDate(today.getDate() - i);
      const key = day.toISOString().slice(0, 10);
      labels.push(day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }));
      borrowed.push(0);
      returned.push(0);
      overdue.push(0);
      borrows.forEach((b) => {
        if (String(b.borrowed_date || "").slice(0, 10) !== key) return;
        if (b.status === "Returned") returned[returned.length - 1] += b.quantity || 1;
        else {
          borrowed[borrowed.length - 1] += b.quantity || 1;
          const due = new Date(b.due_date);
          if (b.due_date && !isNaN(due) && due < today) overdue[overdue.length - 1] += b.quantity || 1;
        }
      });
    }
    return { labels, series: [borrowed, returned, overdue] };
  };

  const loadActivity = () => {
    fetch(`${API_BASE}/api/borrows`)
      .then((res) => res.json())
      .then((data) => setActivity(buildActivityData(Array.isArray(data) ? data : [])))
      .catch((err) => console.error("Failed to load borrowing activity:", err));
  };

  React.useEffect(() => {
    loadStats();
    loadActivity();
  }, []);

  return (
    <div className="tupt-dashboard">
      <div className="tupt-ribbon"></div>
      <Container fluid>
        <Row>
          <Col lg="3" sm="6">
            <Card className="card-stats">
              <Card.Body>
                <Row>
                  <Col xs="5">
                    <div className="tupt-medallion m-maroon">
                      <i className="nc-icon nc-chart"></i>
                    </div>
                  </Col>
                  <Col xs="7">
                    <div className="numbers">
                      <p className="card-category">Items in Inventory</p>
                      <Card.Title as="h4">{stats.items}</Card.Title>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
              <Card.Footer>
                <hr></hr>
                <div className="stats">
                  <i className="fas fa-redo mr-1"></i>
                  Update Now
                </div>
              </Card.Footer>
            </Card>
          </Col>
          <Col lg="3" sm="6">
            <Card className="card-stats">
              <Card.Body>
                <Row>
                  <Col xs="5">
                    <div className="tupt-medallion m-navy">
                      <i className="nc-icon nc-light-3"></i>
                    </div>
                  </Col>
                  <Col xs="7">
                    <div className="numbers">
                      <p className="card-category">Students</p>
                      <Card.Title as="h4">{stats.students}</Card.Title>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
              <Card.Footer>
                <hr></hr>
                <div className="stats">
                  <i className="far fa-calendar-alt mr-1"></i>
                  Registered
                </div>
              </Card.Footer>
            </Card>
          </Col>
          <Col lg="3" sm="6">
            <Card className="card-stats">
              <Card.Body>
                <Row>
                  <Col xs="5">
                    <div className="tupt-medallion m-gold">
                      <i className="nc-icon nc-vector"></i>
                    </div>
                  </Col>
                  <Col xs="7">
                    <div className="numbers">
                      <p className="card-category">Borrowed Items</p>
                      <Card.Title as="h4">{stats.borrowed}</Card.Title>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
              <Card.Footer>
                <hr></hr>
                <div className="stats">
                  <i className="far fa-clock-o mr-1"></i>
                  Currently borrowed
                </div>
              </Card.Footer>
            </Card>
          </Col>
          <Col lg="3" sm="6">
            <Card className="card-stats">
              <Card.Body>
                <Row>
                  <Col xs="5">
                    <div className="tupt-medallion m-ink">
                      <i className="nc-icon nc-favourite-28"></i>
                    </div>
                  </Col>
                  <Col xs="7">
                    <div className="numbers">
                      <p className="card-category">Returned Items</p>
                      <Card.Title as="h4">{stats.returned}</Card.Title>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
              <Card.Footer>
                <hr></hr>
                <div className="stats">
                  <i className="fas fa-redo mr-1"></i>
                  Total returned
                </div>
              </Card.Footer>
            </Card>
          </Col>
        </Row>
        <Row>
          <Col md="8">
            <Card>
              <Card.Header>
                <Card.Title as="h4">Borrowing Activity</Card.Title>
                <p className="card-category">Borrowing over the last 7 days</p>
              </Card.Header>
              <Card.Body>
                <div className="ct-chart" id="chartHours">
                  <ChartistGraph
                    data={activity}
                    type="Line"
                    options={{
                      low: 0,
                      showArea: false,
                      height: "245px",
                      axisX: {
                        showGrid: false,
                      },
                      lineSmooth: true,
                      showLine: true,
                      showPoint: true,
                      fullWidth: true,
                      chartPadding: {
                        right: 50,
                      },
                    }}
                    responsiveOptions={[
                      [
                        "screen and (max-width: 640px)",
                        {
                          axisX: {
                            labelInterpolationFnc: function (value) {
                              return value[0];
                            },
                          },
                        },
                      ],
                    ]}
                  />
                </div>
              </Card.Body>
              <Card.Footer>
                <div className="legend">
                  <i className="fas fa-circle tupt-dot d-maroon"></i>
                  Borrowed <i className="fas fa-circle tupt-dot d-gold"></i>
                  Returned <i className="fas fa-circle tupt-dot d-navy"></i>
                  Overdue
                </div>
                <hr></hr>
                <div className="stats">
                  <i className="fas fa-history"></i>
                  Live borrowing data
                </div>
              </Card.Footer>
            </Card>
          </Col>
          <Col md="4">
            <Card>
              <Card.Header>
                <Card.Title as="h4">Inventory Status</Card.Title>
                <p className="card-category">Share of items by status</p>
              </Card.Header>
              <Card.Body>
                <div
                  className="ct-chart ct-perfect-fourth"
                  id="chartPreferences"
                >
                  <ChartistGraph
                    data={{
                      labels: ["40%", "20%", "40%"],
                      series: [40, 20, 40],
                    }}
                    type="Pie"
                  />
                </div>
                <div className="legend">
                  <i className="fas fa-circle tupt-dot d-maroon"></i>
                  Available <i className="fas fa-circle tupt-dot d-gold"></i>
                  Borrowed <i className="fas fa-circle tupt-dot d-navy"></i>
                  Out of Stock
                </div>
                <hr></hr>
                <div className="stats">
                  <i className="far fa-clock"></i>
                  Updated just now
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default Dashboard;