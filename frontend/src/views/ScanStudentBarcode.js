import React, { useEffect, useRef, useState, useCallback } from "react";
import { Card, Container, Row, Col, Button } from "react-bootstrap";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType, NotFoundException } from "@zxing/library";

const API_BASE = process.env.REACT_APP_API_BASE || "";

// Formats commonly printed on student/employee ID cards, plus QR as a bonus
// since it costs nothing and helps when testing with uploaded images.
const SUPPORTED_FORMATS = [
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_93,
  BarcodeFormat.CODABAR,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.ITF,
  BarcodeFormat.QR_CODE,
];

const hints = new Map();
hints.set(DecodeHintType.POSSIBLE_FORMATS, SUPPORTED_FORMATS);
hints.set(DecodeHintType.TRY_HARDER, true);

const CopyIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </svg>
);
const DocIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M9 13h6M9 17h6" />
  </svg>
);
const UploadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M17 8l-5-5-5 5" />
    <path d="M12 3v12" />
  </svg>
);
const ScanIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
    <path d="M7 12h10" />
  </svg>
);

function ScanStudentBarcode() {
  const [mode, setMode] = useState("scan"); // "scan" | "upload"

  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [running, setRunning] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // camera capture stage: "live" (preview) | "captured" (photo taken, awaiting scan)
  const [stage, setStage] = useState("live");
  const [capturedImage, setCapturedImage] = useState(null);

  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);

  const [scanned, setScanned] = useState("");
  const [studentResults, setStudentResults] = useState([]);
  const [pickedStudent, setPickedStudent] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [decodeError, setDecodeError] = useState("");
  const [history, setHistory] = useState([]);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const readerRef = useRef(null);

  const getReader = () => {
    if (!readerRef.current) {
      readerRef.current = new BrowserMultiFormatReader(hints);
    }
    return readerRef.current;
  };

  // ---------- camera device list ----------
  useEffect(() => {
    BrowserMultiFormatReader.listVideoInputDevices()
      .then((devices) => {
        setCameras(devices || []);
        if (devices && devices.length) {
          const back = devices.find((d) => /back|rear|environment/i.test(d.label || ""));
          setSelectedCamera((back || devices[0]).deviceId);
        }
      })
      .catch((e) => console.debug("listVideoInputDevices failed", e));
  }, []);

  // ---------- camera preview (manual capture, no auto-decode loop) ----------
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setRunning(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setStatusMsg("Starting camera...");
      const constraints = selectedCamera
        ? { video: { deviceId: { exact: selectedCamera } } }
        : { video: { facingMode: { ideal: "environment" } } };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setRunning(true);
      setStatusMsg("");
    } catch (e) {
      console.error("Start camera failed", e);
      setRunning(false);
      setStatusMsg("Camera failed to start. Check permissions and try again.");
    }
  }, [selectedCamera]);

  // Start/stop the preview automatically when switching to the Scan tab,
  // and whenever the chosen camera changes while on that tab.
  useEffect(() => {
    if (mode !== "scan") {
      stopCamera();
      return;
    }
    setCapturedImage(null);
    setStage("live");
    stopCamera();
    startCamera();
  }, [mode, selectedCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
      if (readerRef.current) {
        try {
          BrowserMultiFormatReader.releaseAllStreams?.();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [stopCamera]);

  // ---------- shared: student lookup (by TUPT ID or name) ----------
  const lookupStudent = (value) => {
    if (!value) return;
    setLookingUp(true);
    setLookupError("");
    setStudentResults([]);
    setPickedStudent(null);
    fetch(`${API_BASE}/api/students/search?q=${encodeURIComponent(value)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`not found (${r.status})`);
        return r.json();
      })
      .then((data) => {
        const results = Array.isArray(data) ? data : [];
        setStudentResults(results);
        if (results.length) setPickedStudent(results[0]);
      })
      .catch(() => {
        setStudentResults([]);
        setPickedStudent(null);
        setLookupError("No student found for this TUPT ID or name.");
      })
      .finally(() => setLookingUp(false));
  };

  const addToHistory = (value, source) => {
    setHistory((h) => [
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, value, source, at: new Date() },
      ...h,
    ]);
  };

  const handleDecodedValue = (rawValue, source) => {
    const value = String(rawValue || "").trim();
    if (!value) return;
    setScanned(value);
    addToHistory(value, source);
    lookupStudent(value);
  };

  // ---------- Step 1: capture a photo from the live camera ----------
  const capturePhoto = () => {
    if (!videoRef.current || !streamRef.current) return;
    setDecodeError("");
    setLookupError("");
    setCapturing(true);
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      setCapturedImage(dataUrl);
      setStage("captured");
      stopCamera();
    } catch (err) {
      console.error("capture error", err);
      setDecodeError("Failed to capture the frame. Please try again.");
    } finally {
      setCapturing(false);
    }
  };

  // ---------- Step 2: scan the captured photo ----------
  const scanCaptured = async () => {
    if (!capturedImage) return;
    setDecodeError("");
    setLookupError("");
    setCapturing(true);
    try {
      const reader = getReader();
      const result = await reader.decodeFromImageUrl(capturedImage);
      handleDecodedValue(result.getText(), "camera");
    } catch (err) {
      if (err instanceof NotFoundException) {
        setDecodeError(
          "No barcode detected in the captured photo. Retake it closer and with better lighting."
        );
      } else {
        console.error("captured decode error", err);
        setDecodeError("Something went wrong decoding the captured photo. Please try again.");
      }
    } finally {
      setCapturing(false);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setStage("live");
    startCamera();
  };

  // ---------- Upload an image / file ----------
  const handleUploadFileChange = (e) => {
    const f = e.target.files && e.target.files[0];
    setUploadFile(f || null);
    setUploadPreview(f ? URL.createObjectURL(f) : null);
    setDecodeError("");
  };

  const scanUploadedFile = async () => {
    if (!uploadFile) {
      setDecodeError("Choose an image file first.");
      return;
    }
    setDecodeError("");
    setLookupError("");
    setCapturing(true);
    const objectUrl = URL.createObjectURL(uploadFile);
    try {
      const reader = getReader();
      const result = await reader.decodeFromImageUrl(objectUrl);
      handleDecodedValue(result.getText(), "upload");
    } catch (err) {
      if (err instanceof NotFoundException) {
        setDecodeError("No barcode detected in that image. Try a clearer, higher-resolution photo.");
      } else {
        console.error("upload decode error", err);
        setDecodeError("Something went wrong decoding that file. Please try a different image.");
      }
    } finally {
      URL.revokeObjectURL(objectUrl);
      setCapturing(false);
    }
  };

  // ---------- history actions ----------
  const copyValue = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch (e) {
      // ignore
    }
  };
  const removeHistoryItem = (id) => setHistory((h) => h.filter((item) => item.id !== id));
  const useHistoryItem = (value) => {
    setScanned(value);
    lookupStudent(value);
  };

  return (
    <Container fluid>
      <Row>
        <Col md={7}>
          <Card>
            <Card.Body style={{ padding: 20 }}>
              {/* Tabs: Upload / Scan */}
              <div
                style={{
                  display: "flex",
                  background: "#f1f3f5",
                  borderRadius: 10,
                  padding: 4,
                  marginBottom: 16,
                }}
              >
                <button
                  type="button"
                  onClick={() => setMode("upload")}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "none",
                    fontWeight: 700,
                    cursor: "pointer",
                    background: mode === "upload" ? "#fff" : "transparent",
                    boxShadow: mode === "upload" ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
                    color: "#222",
                  }}
                >
                  <UploadIcon /> Upload
                </button>
                <button
                  type="button"
                  onClick={() => setMode("scan")}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "none",
                    fontWeight: 700,
                    cursor: "pointer",
                    background: mode === "scan" ? "#fff" : "transparent",
                    boxShadow: mode === "scan" ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
                    color: "#222",
                  }}
                >
                  <ScanIcon /> Scan
                </button>
              </div>

              {/* Dashed capture area */}
              <div
                style={{
                  border: "2px dashed #cfd4da",
                  borderRadius: 12,
                  padding: 16,
                  position: "relative",
                }}
              >
                {mode === "scan" ? (
                  stage === "live" ? (
                    <>
                      <div
                        style={{
                          background: "#fff",
                          border: "1px solid #eee",
                          borderRadius: 8,
                          padding: "8px 12px",
                          fontWeight: 700,
                          fontSize: 13,
                          marginBottom: 12,
                          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                        }}
                      >
                        Position the student ID card in the frame, then press Capture ID.
                      </div>
                      <div
                        style={{
                          position: "relative",
                          width: "100%",
                          minHeight: 300,
                          background: "#000",
                          borderRadius: 8,
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <video
                          ref={videoRef}
                          playsInline
                          muted
                          style={{ width: "100%", height: "auto", display: running ? "block" : "none" }}
                        />
                        {!running && (
                          <span style={{ color: "#999", fontSize: 13 }}>
                            {statusMsg || "Camera preview will appear here"}
                          </span>
                        )}
                        {running && (
                          <button
                            type="button"
                            onClick={capturePhoto}
                            disabled={capturing}
                            style={{
                              position: "absolute",
                              bottom: 14,
                              left: "50%",
                              transform: "translateX(-50%)",
                              background: "#fff",
                              border: "none",
                              borderRadius: 8,
                              padding: "10px 22px",
                              fontWeight: 700,
                              boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                              cursor: "pointer",
                            }}
                          >
                            {capturing ? "Capturing..." : "Capture ID"}
                          </button>
                        )}
                      </div>
                      <canvas ref={canvasRef} style={{ display: "none" }} />
                      <div style={{ marginTop: 16, fontWeight: 700, fontSize: 14 }}>
                        Available Camera
                      </div>
                      <select
                        className="form-control"
                        style={{ marginTop: 6 }}
                        value={selectedCamera || ""}
                        onChange={(e) => setSelectedCamera(e.target.value)}
                        disabled={!cameras.length}
                      >
                        {cameras.length === 0 && <option value="">No camera detected</option>}
                        {cameras.map((c) => (
                          <option key={c.deviceId} value={c.deviceId}>
                            {c.label || `Camera ${c.deviceId.slice(0, 8)}`}
                          </option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <>
                      <div
                        style={{
                          background: "#fff",
                          border: "1px solid #eee",
                          borderRadius: 8,
                          padding: "8px 12px",
                          fontWeight: 700,
                          fontSize: 13,
                          marginBottom: 12,
                          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                        }}
                      >
                        Photo captured. Scan it to read the barcode and match the student.
                      </div>
                      <div
                        style={{
                          width: "100%",
                          minHeight: 300,
                          background: "#000",
                          borderRadius: 8,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                        }}
                      >
                        {capturedImage && (
                          <img
                            src={capturedImage}
                            alt="Captured student ID"
                            style={{ maxWidth: "100%", maxHeight: 300, objectFit: "contain" }}
                          />
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                        <Button variant="primary" onClick={scanCaptured} disabled={capturing}>
                          {capturing ? "Scanning..." : "Scan Captured ID"}
                        </Button>
                        <Button variant="secondary" onClick={retakePhoto} disabled={capturing}>
                          Retake Photo
                        </Button>
                      </div>
                    </>
                  )
                ) : (
                  <div
                    style={{
                      minHeight: 300,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 12,
                      textAlign: "center",
                    }}
                  >
                    <label
                      htmlFor="student-barcode-upload"
                      style={{
                        cursor: "pointer",
                        border: "1px solid #ddd",
                        borderRadius: 8,
                        padding: "10px 18px",
                        fontWeight: 700,
                        background: "#fff",
                      }}
                    >
                      Choose Image / File
                    </label>
                    <input
                      id="student-barcode-upload"
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleUploadFileChange}
                    />
                    {uploadPreview ? (
                      <img
                        src={uploadPreview}
                        alt="upload preview"
                        style={{ maxWidth: "100%", maxHeight: 220, objectFit: "contain", borderRadius: 6 }}
                      />
                    ) : (
                      <div style={{ color: "#999", fontSize: 13 }}>
                        Upload a photo or file of a barcode / QR code to test
                      </div>
                    )}
                    <Button variant="primary" onClick={scanUploadedFile} disabled={!uploadFile || capturing}>
                      {capturing ? "Scanning..." : "Scan Uploaded File"}
                    </Button>
                  </div>
                )}
              </div>

              {decodeError && (
                <div
                  style={{
                    marginTop: 14,
                    color: "#b00020",
                    background: "#fdecea",
                    border: "1px solid #f5c2c0",
                    borderRadius: 6,
                    padding: "10px 12px",
                    fontSize: 13,
                  }}
                >
                  {decodeError}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={5}>
          <Card>
            <Card.Header>
              <Card.Title as="h4">Student Lookup</Card.Title>
            </Card.Header>
            <Card.Body>
              <div><strong>Last decoded value:</strong></div>
              <div style={{ wordBreak: "break-all", marginBottom: 12 }}>
                {scanned || "(none yet)"}
              </div>

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

              {!lookingUp && !lookupError && pickedStudent && (
                <div>
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
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{pickedStudent.full_name}</div>
                    <div style={{ marginTop: 6 }}>
                      <strong>TUPT ID:</strong> {pickedStudent.tupt_id}
                    </div>
                  </div>

                  {studentResults.length > 1 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#666", marginBottom: 6 }}>
                        Other possible matches ({studentResults.length - 1})
                      </div>
                      {studentResults
                        .filter((s) => s.id !== pickedStudent.id)
                        .map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setPickedStudent(s)}
                            style={{
                              display: "block",
                              width: "100%",
                              textAlign: "left",
                              background: "#fff",
                              border: "1px solid #ddd",
                              borderRadius: 6,
                              padding: "8px 10px",
                              marginBottom: 6,
                              cursor: "pointer",
                            }}
                          >
                            <span style={{ fontWeight: 700 }}>{s.full_name}</span>
                            <span className="text-muted"> — {s.tupt_id}</span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {!lookingUp && !lookupError && !pickedStudent && (
                <div>(no student scanned yet)</div>
              )}
            </Card.Body>
          </Card>

          <Card className="mt-3">
            <Card.Header>
              <Card.Title as="h4">Scan History</Card.Title>
              <p className="card-category">Every barcode captured or uploaded this session</p>
            </Card.Header>
            <Card.Body style={{ maxHeight: 360, overflowY: "auto" }}>
              {history.length === 0 ? (
                <div style={{ color: "#999" }}>No scans yet.</div>
              ) : (
                history.map((item, idx) => (
                  <div
                    key={item.id}
                    onClick={() => useHistoryItem(item.value)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 4px",
                      borderBottom: idx < history.length - 1 ? "1px solid #eee" : "none",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <span style={{ color: "#3b82f6", flexShrink: 0 }}><DocIcon /></span>
                      <span style={{ fontWeight: 700, color: "#3b82f6", flexShrink: 0 }}>TXT:</span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.value}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0, marginLeft: 8 }}>
                      <span style={{ fontSize: 11, color: "#888", fontWeight: 700 }}>
                        {item.source === "camera" ? "CAM" : "FILE"}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); copyValue(item.value); }}
                        style={{ background: "none", border: "none", color: "#555", cursor: "pointer", padding: 2 }}
                        title="Copy"
                      >
                        <CopyIcon />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeHistoryItem(item.id); }}
                        style={{ background: "none", border: "none", color: "#b00020", cursor: "pointer", padding: 2 }}
                        title="Delete"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default ScanStudentBarcode;
