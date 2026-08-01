import React, { useEffect, useRef, useState, useCallback } from "react";
import { Card, Container, Row, Col, Button } from "react-bootstrap";

import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

const API_BASE = process.env.REACT_APP_API_BASE || "";

// Barcode formats commonly printed on student/employee ID cards.
// (Deliberately excludes QR_CODE — this scanner is for 1D barcodes.)
const BARCODE_FORMATS = [
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.ITF,
];

function ScanStudentBarcode() {
  const [scanned, setScanned] = useState("");
  const [student, setStudent] = useState(null);
  const [lookupError, setLookupError] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [running, setRunning] = useState(false);
  const [scanStatus, setScanStatus] = useState("Camera idle");
  const [lastDetectedAt, setLastDetectedAt] = useState(null);
  const scannerRef = useRef(null);
  const barcodeRegionId = "html5-barcode-reader";
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [manualCameraSelection, setManualCameraSelection] = useState(false);
  const restartingCameraRef = useRef(false);
  // Avoid spamming the API with the exact same barcode repeatedly while it's
  // still in frame — html5-qrcode fires onScanSuccess many times per second.
  const lastLookupRef = useRef({ value: "", at: 0 });

  const pickBestCamera = (cameraList) => {
    if (!cameraList || !cameraList.length) return null;
    const label = (c) => `${c.label || ""} ${c.id || c.deviceId || ""}`.toLowerCase();
    const lbl = (c) => label(c);
    const isBuiltIn = (c) => {
      const l = lbl(c);
      return l.includes("internal") || l.includes("built") || l.includes("integrated") || l.includes("face time");
    };
    // Prefer external USB cameras/scanners over built-in front cameras
    const external = cameraList.find((c) => !isBuiltIn(c) && (lbl(c).includes("usb") || lbl(c).includes("external") || lbl(c).includes("hd")));
    if (external) return external;
    // Then prefer back/environment cameras (mobile)
    const back = cameraList.find((c) => lbl(c).includes("back") || lbl(c).includes("rear") || lbl(c).includes("environment"));
    if (back) return back;
    // Prefer any non-built-in over first
    const nonBuiltIn = cameraList.find((c) => !isBuiltIn(c));
    if (nonBuiltIn) return nonBuiltIn;
    return cameraList[0] || null;
  };

  const normalizeCameraId = (camera) => camera && (camera.id || camera.deviceId || null);

  const normalizeCameras = (cameraList) => (cameraList || [])
    .map((camera) => ({
      ...camera,
      id: normalizeCameraId(camera),
    }))
    .filter((camera) => camera.id);

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const getCameraStartMessage = (error) => {
    const rawMessage = `${error?.name || ""} ${error?.message || error || ""}`.toLowerCase();
    const errorName = `${error?.name || ""}`.toLowerCase();

    if (!window.isSecureContext && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      return "Camera access requires HTTPS or localhost.";
    }

    if (rawMessage.includes("notallowed") || rawMessage.includes("permission")) {
      return "Camera permission was denied. Allow camera access in the browser and try again.";
    }

    if (rawMessage.includes("notfound") || rawMessage.includes("overconstrained") || rawMessage.includes("device")) {
      return "The selected camera is unavailable. Try a different camera or reconnect the webcam.";
    }

    if (errorName.includes("notreadable")) {
      return "The camera is already in use or Windows/browser cannot open it. Close other apps using the webcam, then try again.";
    }

    return "Unable to start camera. Check browser permissions and camera availability.";
  };

  const startScannerWithCameraArg = async (cameraArg) => {
    await scannerRef.current.start(
      cameraArg,
      {
        fps: 10,
        // Barcodes are wide and short, not square — a wide box makes them much
        // easier to line up than the square box used for QR scanning.
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const boxWidth = Math.floor(Math.min(viewfinderWidth * 0.9, 500));
          const boxHeight = Math.floor(Math.min(viewfinderHeight * 0.35, 160));
          return { width: boxWidth, height: boxHeight };
        },
        formatsToSupport: BARCODE_FORMATS,
      },
      onScanSuccess,
      onScanError
    );
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

  // Look up a scanned TUPT ID against the students table (matches the
  // `tupt_id` column, case-insensitive on the backend via COLLATE NOCASE).
  const lookupStudent = (tuptId) => {
    if (!tuptId) return;
    setLookingUp(true);
    setLookupError("");
    fetch(`${API_BASE}/api/students/by-tupt/${encodeURIComponent(tuptId)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`not found (${r.status})`);
        return r.json();
      })
      .then((data) => {
        setStudent(data);
      })
      .catch((err) => {
        console.debug("student lookup error", err);
        setStudent(null);
        setLookupError("No student found for this TUPT ID.");
      })
      .finally(() => setLookingUp(false));
  };

  const onScanSuccess = (decodedText, decodedResult) => {
    const tuptId = String(decodedText || "").trim();
    if (!tuptId) return;

    // Debounce: skip if this exact value was just looked up within 2s
    // (the same physical barcode stays in frame across many scan callbacks).
    const now = Date.now();
    if (lastLookupRef.current.value === tuptId && now - lastLookupRef.current.at < 2000) {
      return;
    }
    lastLookupRef.current = { value: tuptId, at: now };

    console.log("Barcode scan success:", tuptId, decodedResult);
    setScanned(tuptId);
    setLastDetectedAt(new Date());
    setScanStatus(`Barcode detected: ${tuptId}`);
    lookupStudent(tuptId);
  };

  const onScanError = (errorMessage) => {
    // Avoid setting state or logging here as it fires many times per second
    // and can severely degrade performance.
  };

  const startScanner = async () => {
    if (running) return;
    try {
      setScanStatus("Starting camera...");
      let cams = [];
      let cameraIdToUse = null;
      try {
        cams = await Html5Qrcode.getCameras();
        console.log("available cameras:", cams);
        const normalizedCams = normalizeCameras(cams);
        setCameras(normalizedCams);
        if (normalizedCams.length) {
          const preferredCamera = pickBestCamera(normalizedCams);
          const preferredCameraId = normalizeCameraId(preferredCamera);
          cameraIdToUse = manualCameraSelection && selectedCamera ? selectedCamera : preferredCameraId;
          setSelectedCamera(cameraIdToUse);
          setManualCameraSelection(false);
        }
      } catch (e) {
        console.debug("getCameras() failed", e);
      }

      scannerRef.current = new Html5Qrcode(barcodeRegionId, { verbose: false });

      const preferredCameraArg = cameraIdToUse
        ? { deviceId: { exact: cameraIdToUse } }
        : { facingMode: { ideal: "environment" } };

      console.log("starting scanner with cameraArg=", preferredCameraArg);

      let lastStartError = null;
      const attemptArgs = [preferredCameraArg];
      if (!manualCameraSelection) {
        attemptArgs.push({ facingMode: { ideal: "user" } });
      }

      for (const cameraArg of attemptArgs) {
        try {
          if (!scannerRef.current) {
            scannerRef.current = new Html5Qrcode(barcodeRegionId, { verbose: false });
          }
          console.log("starting scanner with cameraArg=", cameraArg);
          await startScannerWithCameraArg(cameraArg);
          lastStartError = null;
          break;
        } catch (attemptError) {
          lastStartError = attemptError;
          console.debug("camera start attempt failed", cameraArg, attemptError);
          scannerRef.current = null;

          const isNotReadable = `${attemptError?.name || ""}`.toLowerCase().includes("notreadable");
          if (isNotReadable && cameraArg === preferredCameraArg) {
            setScanStatus("Camera is busy. Retrying...");
            await sleep(750);

            scannerRef.current = new Html5Qrcode(barcodeRegionId, { verbose: false });
            try {
              await startScannerWithCameraArg(cameraArg);
              lastStartError = null;
              break;
            } catch (retryError) {
              lastStartError = retryError;
              console.debug("camera retry failed", cameraArg, retryError);
              scannerRef.current = null;
            }
          }
        }
      }

      if (lastStartError) {
        throw lastStartError;
      }

      setRunning(true);
      setScanStatus("Camera live - scanning continuously");
      console.log("scanner started");
    } catch (e) {
      console.error("Start scanner failed", e);
      setScanStatus("Camera failed to start");
      alert(getCameraStartMessage(e));
    }
  };

  // If user switches camera while scanner is running, restart with the new device
  useEffect(() => {
    if (!running || restartingCameraRef.current) return;
    (async () => {
      try {
        restartingCameraRef.current = true;
        setScanStatus("Switching camera...");
        await stopScanner();
        await startScanner();
      } catch (err) {
        console.debug("restart scanner on camera change failed", err);
      } finally {
        restartingCameraRef.current = false;
      }
    })();
  }, [selectedCamera]);

  return (
    <Container fluid>
      <Row>
        <Col md={8}>
          <Card>
            <Card.Header>
              <Card.Title as="h4">Student ID Barcode Scanner</Card.Title>
              <p className="card-category">Scan a student's TUPT ID barcode to look them up</p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
                <span style={{ padding: "6px 10px", borderRadius: 999, background: running ? "#1f7a1f" : "#666", color: "#fff", fontSize: 12, fontWeight: 700 }}>
                  {running ? "Live scanning" : "Camera stopped"}
                </span>
                <span style={{ padding: "6px 10px", borderRadius: 999, background: "#f0f0f0", color: "#222", fontSize: 12 }}>
                  Scans at 10 fps
                </span>
              </div>
            </Card.Header>
            <Card.Body>
              <div id={barcodeRegionId} style={{ width: "100%", minHeight: 360, background: "#000" }} />
              <div style={{ marginTop: 12 }}>
                <Button variant={running ? "danger" : "primary"} onClick={() => (running ? stopScanner() : startScanner())}>
                  {running ? "Stop Camera" : "Start Camera"}
                </Button>
                <Button
                  style={{ marginLeft: 8 }}
                  onClick={() => {
                    setScanned("");
                    setStudent(null);
                    setLookupError("");
                    lastLookupRef.current = { value: "", at: 0 };
                  }}
                >
                  Clear
                </Button>
                {cameras && cameras.length > 0 && (
                  <select
                    style={{ marginLeft: 12, maxWidth: 240 }}
                    value={selectedCamera || ""}
                    onChange={(e) => {
                      setSelectedCamera(e.target.value);
                      setManualCameraSelection(true);
                    }}
                  >
                    {cameras.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label || `Camera ${c.id.slice(0, 8)}`}
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
                      const preferredId = normalizeCameraId(preferred);
                      setSelectedCamera(preferredId);
                      setManualCameraSelection(false);
                    }}
                  >
                    Auto Select
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
                  <strong>Tip:</strong> hold the ID steady so the barcode fills the wide box, not just anywhere in the frame.
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card>
            <Card.Header>
              <Card.Title as="h4">Student Lookup</Card.Title>
            </Card.Header>
            <Card.Body>
              <div><strong>Raw barcode:</strong></div>
              <div style={{ wordBreak: "break-all", marginBottom: 12 }}>{scanned || "(no scan yet)"}</div>

              {lookingUp && (
                <div style={{ color: "#666", marginBottom: 12 }}>Looking up student...</div>
              )}

              {!lookingUp && lookupError && (
                <div
                  style={{
                    color: "#b00020",
                    background: "#fdecea",
                    border: "1px solid #f5c2c0",
                    borderRadius: 6,
                    padding: "10px 12px",
                    marginBottom: 12,
                  }}
                >
                  {lookupError}
                </div>
              )}

              {!lookingUp && student ? (
                <div
                  style={{
                    background: "#eaf7ec",
                    border: "1px solid #bfe3c4",
                    borderRadius: 8,
                    padding: "14px 16px",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1f7a1f", marginBottom: 4 }}>
                    MATCH FOUND
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{student.full_name}</div>
                  <div style={{ marginTop: 6 }}>
                    <strong>TUPT ID:</strong> {student.tupt_id}
                  </div>
                </div>
              ) : (
                !lookingUp && !lookupError && <div>(no student scanned yet)</div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default ScanStudentBarcode;