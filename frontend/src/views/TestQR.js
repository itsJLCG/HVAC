import React, { useEffect, useRef, useState, useCallback } from "react";
import { Card, Container, Row, Col, Button } from "react-bootstrap";
import { Html5Qrcode } from "html5-qrcode";

const API_BASE = process.env.REACT_APP_API_BASE || "";

function TestQR() {
  const [scanned, setScanned] = useState("");
  const [itemName, setItemName] = useState("");
  const [running, setRunning] = useState(false);
  const [scanStatus, setScanStatus] = useState("Camera idle");
  const [lastDetectedAt, setLastDetectedAt] = useState(null);
  const scannerRef = useRef(null);
  const qrcodeRegionId = "html5qr-reader";
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [manualCameraSelection, setManualCameraSelection] = useState(false);

  const pickBestCamera = (cameraList) => {
    if (!cameraList || !cameraList.length) return null;
    const preferred = cameraList.find((camera) => {
      const label = `${camera.label || ""} ${camera.id || ""}`.toLowerCase();
      return label.includes("back") || label.includes("rear") || label.includes("environment");
    });
    return preferred || cameraList[0] || null;
  };

  const getQrBoxSize = () => {
    const el = document.getElementById(qrcodeRegionId);
    const width = el ? (el.clientWidth || el.offsetWidth || 360) : 360;
    return Math.max(280, Math.min(420, Math.floor(width * 0.85)));
  };

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
    setScanned(decodedText);
    setLastDetectedAt(new Date());
    setScanStatus(`QR detected: ${decodedText}`);
    const lookupUrl = decodedText && decodedText.startsWith("inventory:")
      ? `${API_BASE}/api/items/${encodeURIComponent(decodedText.split(":")[1])}`
      : `${API_BASE}/api/items/by-qr/${encodeURIComponent(decodedText)}`;

    if (decodedText) {
      fetch(lookupUrl)
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
    if (running) {
      setScanStatus("Camera active - looking for a QR code");
    }
    console.debug("scan error", errorMessage);
  };

  const startScanner = async () => {
    if (running) return;
    try {
      setScanStatus("Starting camera...");
      let cams = [];
      let cameraIdToUse = null;
      try {
        cams = await Html5Qrcode.getCameras();
        console.log('available cameras:', cams);
        setCameras(cams || []);
        if (cams && cams.length) {
          const preferredCamera = pickBestCamera(cams);
          const preferredCameraId = preferredCamera && (preferredCamera.id || preferredCamera.deviceId || preferredCamera.label) || null;
          cameraIdToUse = manualCameraSelection && selectedCamera ? selectedCamera : preferredCameraId;
          setSelectedCamera(cameraIdToUse);
          setManualCameraSelection(false);
        }
      } catch (e) {
        console.debug('getCameras() failed', e);
      }
      scannerRef.current = new Html5Qrcode(qrcodeRegionId, { verbose: true });

      const cameraArg = cameraIdToUse
        ? { deviceId: { exact: cameraIdToUse } }
        : { facingMode: { ideal: 'environment' } };
      const qrboxSize = getQrBoxSize();

      console.log('starting scanner with cameraArg=', cameraArg);

      await scannerRef.current.start(
        cameraArg,
        { fps: 15, qrbox: { width: qrboxSize, height: qrboxSize }, disableFlip: true },
        onScanSuccess,
        onScanError
      );
      setRunning(true);
      setScanStatus("Camera live - scanning continuously");
      console.log('scanner started');
    } catch (e) {
      console.error("Start scanner failed", e);
      setScanStatus("Camera failed to start");
      alert("Unable to start camera. Ensure the site is served over HTTPS and camera permission is allowed.");
    }
  };

  // If user switches camera while scanner is running, restart with the new device
  useEffect(() => {
    if (!running) return;
    // restart scanner on camera change
    (async () => {
      try {
        setScanStatus("Switching camera...");
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
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
                <span style={{ padding: "6px 10px", borderRadius: 999, background: running ? "#1f7a1f" : "#666", color: "#fff", fontSize: 12, fontWeight: 700 }}>
                  {running ? "Live scanning" : "Camera stopped"}
                </span>
                <span style={{ padding: "6px 10px", borderRadius: 999, background: "#f0f0f0", color: "#222", fontSize: 12 }}>
                  Scans multiple times per second at {15} fps
                </span>
              </div>
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
                {cameras && cameras.length > 1 && (
                  <select style={{ marginLeft: 12 }} value={selectedCamera || ''} onChange={(e) => {
                    setSelectedCamera(e.target.value);
                    setManualCameraSelection(true);
                  }}>
                    {cameras.map((c) => (
                      <option key={c.id || c.deviceId || c.label} value={c.id || c.deviceId || c.label}>
                        {c.label || c.id || c.deviceId}
                      </option>
                    ))}
                  </select>
                )}
                {cameras && cameras.length > 1 && (
                  <Button
                    style={{ marginLeft: 8 }}
                    variant="outline-primary"
                    onClick={() => {
                      const preferred = pickBestCamera(cameras);
                      const preferredId = preferred && (preferred.id || preferred.deviceId || preferred.label) || null;
                      setSelectedCamera(preferredId);
                      setManualCameraSelection(false);
                      if (running) {
                        stopScanner().then(() => startScanner());
                      }
                    }}
                  >
                    Use Back Camera
                  </Button>
                )}
              </div>
              <div style={{ marginTop: 12, padding: 12, background: "#f8f9fa", borderRadius: 8 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Scanner status</div>
                <div>{scanStatus}</div>
                <div style={{ marginTop: 6 }}>
                  <strong>Last detection:</strong> {lastDetectedAt ? lastDetectedAt.toLocaleTimeString() : "none yet"}
                </div>
                <div style={{ marginTop: 6 }}>
                  <strong>Tip:</strong> keep the QR centered and close to the middle of the preview, not just anywhere in the camera frame.
                </div>
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
