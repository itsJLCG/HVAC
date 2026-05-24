import React, { useEffect, useRef, useState, useCallback } from "react";
import { Card, Container, Row, Col, Button } from "react-bootstrap";
import { Html5Qrcode } from "html5-qrcode";

const API_BASE = process.env.REACT_APP_API_BASE || "";

function TestQR() {
  const [scanned, setScanned] = useState("");
  const [itemName, setItemName] = useState("");
  const [running, setRunning] = useState(false);
  const scannerRef = useRef(null);
  const qrcodeRegionId = "html5qr-reader";
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);

  const stopScanner = useCallback(async () => {
    if (!scannerRef.current) return;
    try {
      await scannerRef.current.stop();
      scannerRef.current.clear();
    } catch (e) {
      // ignore
    }
    scannerRef.current = null;
    setRunning(false);
  }, []);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  const onScanSuccess = (decodedText, decodedResult) => {
    console.log('QR scan success:', decodedText, decodedResult);
    // decodedText is the string inside the QR
    setScanned(decodedText);
    // parse inventory:id pattern
    let id = decodedText;
    if (decodedText && decodedText.startsWith("inventory:")) {
      id = decodedText.split(":")[1];
    }
    if (id) {
      fetch(`${API_BASE}/api/items/${id}`)
        .then((r) => {
          console.log('fetch response status', r.status);
          if (!r.ok) throw new Error(`not found (${r.status})`);
          return r.json();
        })
        .then((data) => {
          console.log('fetched item data', data);
          setItemName(data.name || "(no name)");
        })
        .catch((err) => {
          console.debug('item fetch error', err);
          setItemName("(item not found)");
        });
    }
  };

  const onScanError = (errorMessage) => {
    console.debug("scan error", errorMessage);
  };

  const startScanner = async () => {
    if (running) return;
    try {
      // list cameras for debugging and selection
      let cams = [];
      try {
        cams = await Html5Qrcode.getCameras();
        console.log('available cameras:', cams);
        setCameras(cams || []);
        if (!selectedCamera && cams && cams.length) {
          // choose first camera by id if none selected
          setSelectedCamera(cams[0].id || cams[0].deviceId || cams[0].label);
        }
      } catch (e) {
        console.debug('getCameras() failed', e);
      }
      scannerRef.current = new Html5Qrcode(qrcodeRegionId, { verbose: true });

      // compute a qrbox size relative to the container so small QR on phone screens are easier to detect
      let qrboxSize = 250;
      try {
        const el = document.getElementById(qrcodeRegionId);
        if (el) {
          const w = el.clientWidth || el.offsetWidth || 640;
          qrboxSize = Math.max(200, Math.min(800, Math.floor(w * 0.8)));
        }
      } catch (err) {
        console.debug('qrbox size compute failed', err);
      }

      const cameraArg = selectedCamera
        ? { deviceId: { exact: selectedCamera } }
        : { facingMode: 'environment' };

      console.log('starting scanner with cameraArg=', cameraArg, 'qrbox=', qrboxSize);

      await scannerRef.current.start(
        cameraArg,
        { fps: 10, qrbox: qrboxSize },
        onScanSuccess,
        onScanError
      );
      setRunning(true);
      console.log('scanner started');
    } catch (e) {
      console.error("Start scanner failed", e);
      alert("Unable to start camera. Ensure the site is served over HTTPS and camera permission is allowed.");
    }
  };

  // If user switches camera while scanner is running, restart with the new device
  useEffect(() => {
    if (!running) return;
    // restart scanner on camera change
    (async () => {
      try {
        await stopScanner();
        await startScanner();
      } catch (err) {
        console.debug('restart scanner on camera change failed', err);
      }
    })();
  }, [selectedCamera]);

  
  return (
    <Container fluid>
      <Row>
        <Col md={8}>
          <Card>
            <Card.Header>
              <Card.Title as="h4">Test QR Scanner</Card.Title>
              <p className="card-category">Camera scanner for testing QR -> item lookup</p>
            </Card.Header>
            <Card.Body>
              <div id={qrcodeRegionId} style={{ width: "100%", minHeight: 360, background: "#000" }} />
              <div style={{ marginTop: 12 }}>
                <Button variant={running ? "danger" : "primary"} onClick={() => (running ? stopScanner() : startScanner())}>
                  {running ? "Stop Camera" : "Start Camera"}
                </Button>
                <Button style={{ marginLeft: 8 }} onClick={() => { setScanned(""); setItemName(""); }}>
                  Clear
                </Button>
                {cameras && cameras.length > 0 && (
                  <select style={{ marginLeft: 12 }} value={selectedCamera || ''} onChange={(e) => setSelectedCamera(e.target.value)}>
                    {cameras.map((c) => (
                      <option key={c.id || c.deviceId || c.label} value={c.id || c.deviceId || c.label}>
                        {c.label || c.id || c.deviceId}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card>
            <Card.Header>
              <Card.Title as="h4">Scan Result</Card.Title>
            </Card.Header>
            <Card.Body>
              <div><strong>Raw:</strong></div>
              <div style={{ wordBreak: "break-all", marginBottom: 12 }}>{scanned || "(no scan yet)"}</div>
              <div><strong>Item name:</strong></div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{itemName || "(unknown)"}</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default TestQR;
