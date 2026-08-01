import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Card,
  Container,
  Row,
  Col,
  Form,
  Button,
  Table,
  Modal,
  ModalDialog,
} from "react-bootstrap";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType, NotFoundException } from "@zxing/library";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

const API_BASE = process.env.REACT_APP_API_BASE || "";

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

const ScanIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
    <path d="M7 12h10" />
  </svg>
);
const UploadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M17 8l-5-5-5 5" />
    <path d="M12 3v12" />
  </svg>
);

const itemQrRegionId = "borrowed-item-qr-reader";

const todayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

function Borrowed() {
  const [form, setForm] = useState({
    studentName: "",
    studentId: "",
    borrowedDate: todayStr(),
    returnedDate: "",
  });
  const [borrowedItems, setBorrowedItems] = useState([]);
  const [manualInput, setManualInput] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [saving, setSaving] = useState(false);

  // ----- student scanner state (zxing) -----
  const [mode, setMode] = useState("scan"); // "scan" | "upload"
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [running, setRunning] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [decodeError, setDecodeError] = useState("");

  // ----- item scanner state (html5-qrcode, like Test QR) -----
  const [showItemScanner, setShowItemScanner] = useState(false);
  const [itemScannerRunning, setItemScannerRunning] = useState(false);
  const [itemScanStatus, setItemScanStatus] = useState("Camera idle");
  const [itemCameras, setItemCameras] = useState([]);
  const [itemSelectedCamera, setItemSelectedCamera] = useState(null);
  const [scannedItem, setScannedItem] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const readerRef = useRef(null);
  const itemScannerRef = useRef(null);
  const itemScannerStartingRef = useRef(false);
  const itemCameraRef = useRef(null);
  const lastItemLookupRef = useRef("");
  const addedItemIdsRef = useRef(new Set());

  const getReader = () => {
    if (!readerRef.current) {
      readerRef.current = new BrowserMultiFormatReader(hints);
    }
    return readerRef.current;
  };

  // ----- student scanner lifecycle -----
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

  useEffect(() => {
    if (!showScanner) return;
    stopCamera();
    startCamera();
    return () => stopCamera();
  }, [showScanner, selectedCamera, startCamera, stopCamera]);

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

  const handleStudentFound = (student) => {
    setForm((s) => ({
      ...s,
      studentName: student.full_name,
      studentId: student.tupt_id,
    }));
    setShowScanner(false);
    setManualInput(false);
  };

  const lookupStudent = (tuptId) => {
    if (!tuptId) return;
    setLookingUp(true);
    setLookupError("");
    fetch(`${API_BASE}/api/students/by-tupt/${encodeURIComponent(tuptId)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`not found (${r.status})`);
        return r.json();
      })
      .then((data) => handleStudentFound(data))
      .catch(() => {
        setLookupError("No student found for this TUPT ID.");
      })
      .finally(() => setLookingUp(false));
  };

  const handleDecodedValue = (rawValue) => {
    const value = String(rawValue || "").trim();
    if (!value) return;
    lookupStudent(value);
  };

  const captureAndScan = async () => {
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

      const reader = getReader();
      const result = reader.decodeFromCanvas(canvas);
      handleDecodedValue(result.getText());
    } catch (err) {
      if (err instanceof NotFoundException) {
        setDecodeError(
          "No barcode detected in the captured frame. Get closer, improve lighting, and hold it steady, then press Capture again."
        );
      } else {
        console.error("capture decode error", err);
        setDecodeError("Something went wrong decoding that frame. Please try again.");
      }
    } finally {
      setCapturing(false);
    }
  };

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
      handleDecodedValue(result.getText());
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

  // ----- borrowed items -----
  const addBorrowedItem = useCallback((item) => {
    const stock = Number(item.quantity) || 0;
    if (stock <= 0) return false;
    if (addedItemIdsRef.current.has(item.id)) return false;
    addedItemIdsRef.current.add(item.id);
    setBorrowedItems((prev) => [
      ...prev,
      { itemId: item.id, name: item.name, stock, qty: 1 },
    ]);
    return true;
  }, []);

  const updateQty = (itemId, value) => {
    setBorrowedItems((prev) =>
      prev.map((i) => {
        if (i.itemId !== itemId) return i;
        const parsed = Number(value);
        const qty = isNaN(parsed) ? 0 : Math.max(0, Math.min(parsed, i.stock));
        return { ...i, qty };
      })
    );
  };

  const removeBorrowedItem = (itemId) => {
    addedItemIdsRef.current.delete(itemId);
    setBorrowedItems((prev) => prev.filter((i) => i.itemId !== itemId));
  };

  // ----- item scanner (html5-qrcode, continuous scan like Test QR) -----
  const onItemScanSuccess = useCallback((decodedText) => {
    const value = String(decodedText || "").trim();
    if (!value) return;
    if (lastItemLookupRef.current === value) return;
    lastItemLookupRef.current = value;
    setScannedItem(null);
    setItemScanStatus("Looking up item...");
    const lookupUrl = value.startsWith("inventory:")
      ? `${API_BASE}/api/items/${encodeURIComponent(value.split(":")[1])}`
      : `${API_BASE}/api/items/by-qr/${encodeURIComponent(value)}`;
    fetch(lookupUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`not found (${r.status})`);
        return r.json();
      })
      .then((data) => {
        setScannedItem(data);
        setItemScanStatus(`QR detected: ${data.name}`);
      })
      .catch(() => setItemScanStatus("Item not found for this QR."));
  }, []);

  const addScannedItem = () => {
    if (!scannedItem) return;
    const added = addBorrowedItem(scannedItem);
    setItemScanStatus(
      added
        ? `Added: ${scannedItem.name}`
        : `"${scannedItem.name}" was not added (already in list or out of stock).`
    );
  };

  const stopItemScanner = useCallback(async () => {
    if (itemScannerRef.current) {
      try {
        await itemScannerRef.current.stop();
        itemScannerRef.current.clear();
      } catch (e) {
        // ignore
      }
      itemScannerRef.current = null;
    }
    setItemScannerRunning(false);
  }, []);

  const startItemScanner = useCallback(async () => {
    if (itemScannerStartingRef.current) return;
    itemScannerStartingRef.current = true;
    setItemScanStatus("Starting camera...");
    try {
      let cams = [];
      try {
        cams = await Html5Qrcode.getCameras();
      } catch (e) {
        // ignore
      }
      const normalized = (cams || [])
        .map((c) => ({ ...c, id: c.id || c.deviceId }))
        .filter((c) => c.id);
      setItemCameras(normalized);
      let cameraId = itemCameraRef.current;
      if (!cameraId && normalized.length) {
        const back = normalized.find((c) =>
          /back|rear|environment/i.test((c.label || "").toLowerCase())
        );
        cameraId = (back || normalized[0]).id;
        itemCameraRef.current = cameraId;
        setItemSelectedCamera(cameraId);
      }
      if (!itemScannerRef.current) {
        itemScannerRef.current = new Html5Qrcode(itemQrRegionId, { verbose: false });
      }
      await itemScannerRef.current.start(
        cameraId
          ? { deviceId: { exact: cameraId } }
          : { facingMode: { ideal: "environment" } },
        {
          fps: 10,
          qrbox: (vw, vh) => {
            const min = Math.min(vw, vh);
            const size = Math.floor(min * 0.85);
            return { width: size, height: size };
          },
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        },
        onItemScanSuccess,
        () => {}
      );
      setItemScannerRunning(true);
      setItemScanStatus("Camera live - scanning continuously");
    } catch (e) {
      console.error("Item scanner failed", e);
      setItemScanStatus("Camera failed to start");
    } finally {
      itemScannerStartingRef.current = false;
    }
  }, [onItemScanSuccess]);

  const changeItemCamera = (id) => {
    itemCameraRef.current = id;
    setItemSelectedCamera(id);
    if (itemScannerRunning) {
      stopItemScanner().then(() => startItemScanner());
    }
  };

  useEffect(() => {
    if (!showItemScanner) {
      stopItemScanner();
      return;
    }
    startItemScanner();
    return () => stopItemScanner();
  }, [showItemScanner, startItemScanner, stopItemScanner]);

  useEffect(() => {
    return () => {
      stopItemScanner();
    };
  }, [stopItemScanner]);

  const notify = (variant, message) => {
    window.dispatchEvent(new CustomEvent("app-notify", { detail: { variant, message } }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => {
      const next = { ...s, [name]: value };
      if (name === "borrowedDate" && next.returnedDate && next.returnedDate < next.borrowedDate) {
        next.returnedDate = next.borrowedDate;
      }
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (borrowedItems.length === 0) {
      notify("warning", "Scan at least one item to borrow.");
      return;
    }
    if (!form.studentName || !form.studentId) {
      notify("warning", "Scan or enter the student details first.");
      return;
    }
    const payload = {
      studentName: form.studentName,
      studentId: form.studentId,
      borrowedDate: form.borrowedDate,
      dueDate: form.returnedDate || null,
      items: borrowedItems.map((i) => ({
        itemId: i.itemId,
        name: i.name,
        quantity: i.qty,
      })),
    };
    setSaving(true);
    fetch(`${API_BASE}/api/borrows`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.error || "Failed to save borrow");
        notify("success", "Borrow saved successfully.");
        addedItemIdsRef.current = new Set();
        setBorrowedItems([]);
        setForm((s) => ({
          ...s,
          studentName: "",
          studentId: "",
          borrowedDate: todayStr(),
          returnedDate: "",
        }));
      })
      .catch((err) => notify("danger", err.message || "Failed to save borrow"))
      .finally(() => setSaving(false));
  };

  return (
    <>
      <Container fluid>
        <Row className="justify-content-center">
          <Col lg="7" md="9" sm="11" xs="12">
            <Card>
              <Card.Header className="text-center">
                <Card.Title as="h4">Borrow an Item</Card.Title>
                <p className="card-category">Fill out the details below</p>
              </Card.Header>
              <Card.Body>
                <Form onSubmit={handleSubmit}>
                  {/* Group 1: Student */}
                  <div className="mb-5">
                    <h5 className="font-weight-bold text-uppercase text-muted mb-3">
                      Student
                    </h5>
                    <div className="d-flex mb-3">
                      <Button
                        variant="info"
                        className="mr-2"
                        onClick={() => setShowScanner(true)}
                      >
                        <ScanIcon /> Scan Student ID
                      </Button>
                      <Button
                        variant={manualInput ? "secondary" : "outline-secondary"}
                        onClick={() => setManualInput((v) => !v)}
                      >
                        Manual Input
                      </Button>
                    </div>
                    <Row>
                      <Col md="6">
                        <Form.Group>
                          <Form.Label>Name of Student</Form.Label>
                          <Form.Control
                            type="text"
                            name="studentName"
                            placeholder={
                              manualInput ? "Enter student name" : "Scan to auto-fill"
                            }
                            value={form.studentName}
                            onChange={handleChange}
                            disabled={!manualInput}
                            readOnly={!manualInput}
                          />
                        </Form.Group>
                      </Col>
                      <Col md="6">
                        <Form.Group>
                          <Form.Label>Student ID</Form.Label>
                          <Form.Control
                            type="text"
                            name="studentId"
                            placeholder={
                              manualInput ? "Enter student ID" : "Scan to auto-fill"
                            }
                            value={form.studentId}
                            onChange={handleChange}
                            disabled={!manualInput}
                            readOnly={!manualInput}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  </div>

                  <hr />

                  {/* Group 2: Items */}
                  <div className="mb-5 mt-4">
                    <h5 className="font-weight-bold text-uppercase text-muted mb-3">
                      Borrowed Items
                    </h5>
                    <div className="d-flex mb-3">
                      <Button
                        variant="info"
                        className="mr-2"
                        onClick={() => setShowItemScanner(true)}
                      >
                        <ScanIcon /> Scan Item QR
                      </Button>
                    </div>

                    {borrowedItems.length === 0 ? (
                      <Form.Text className="text-muted">
                        Scan an item QR code to add it to the borrow list. You can
                        add as many items as you want.
                      </Form.Text>
                    ) : (
                      <Table size="sm" striped bordered hover>
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th>Stock</th>
                            <th style={{ width: 130 }}>Quantity</th>
                            <th style={{ width: 50 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {borrowedItems.map((i) => (
                            <tr key={i.itemId}>
                              <td>{i.name}</td>
                              <td>{i.stock}</td>
                              <td>
                                <Form.Control
                                  type="number"
                                  min="1"
                                  max={i.stock}
                                  value={i.qty}
                                  onChange={(e) => updateQty(i.itemId, e.target.value)}
                                />
                              </td>
                              <td className="text-center">
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => removeBorrowedItem(i.itemId)}
                                >
                                  ×
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    )}
                  </div>

                  <hr />

                  {/* Group 3: Dates */}
                  <div className="mt-4">
                    <h5 className="font-weight-bold text-uppercase text-muted mb-3">
                      Dates
                    </h5>
                    <Row>
                      <Col md="6">
                        <Form.Group>
                          <Form.Label>Borrowed Date</Form.Label>
                          <Form.Control
                            type="date"
                            name="borrowedDate"
                            value={form.borrowedDate}
                            min={todayStr()}
                            onChange={handleChange}
                            required
                          />
                        </Form.Group>
                      </Col>
                      <Col md="6">
                        <Form.Group>
                          <Form.Label>Returned Date</Form.Label>
                          <Form.Control
                            type="date"
                            name="returnedDate"
                            value={form.returnedDate}
                            min={form.borrowedDate}
                            onChange={handleChange}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  </div>

                  <div className="text-center mt-5">
                    <Button type="submit" variant="primary" size="lg" disabled={saving}>
                      {saving ? "Saving..." : "Submit"}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Student scan modal */}
      <Modal
        show={showScanner}
        onHide={() => setShowScanner(false)}
        size="xl"
        centered
        dialogAs={ModalDialog}
        animation
        backdrop
        keyboard
      >
        <Modal.Header closeButton>
          <Modal.Title>Scan Student ID</Modal.Title>
        </Modal.Header>
        <Modal.Body
          style={{ maxHeight: "calc(100vh - 220px)", overflowY: "auto" }}
        >
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

          <div
            style={{
              border: "2px dashed #cfd4da",
              borderRadius: 12,
              padding: 16,
              position: "relative",
            }}
          >
            {mode === "scan" ? (
              <>
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    minHeight: 260,
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
                      onClick={captureAndScan}
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
                      {capturing ? "Scanning..." : "Capture"}
                    </button>
                  )}
                </div>
                <canvas ref={canvasRef} style={{ display: "none" }} />
              </>
            ) : (
              <div
                style={{
                  minHeight: 260,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  textAlign: "center",
                }}
              >
                <label
                  htmlFor="borrowed-student-upload"
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
                  id="borrowed-student-upload"
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleUploadFileChange}
                />
                {uploadPreview ? (
                  <img
                    src={uploadPreview}
                    alt="upload preview"
                    style={{ maxWidth: "100%", maxHeight: 200, objectFit: "contain", borderRadius: 6 }}
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

          {mode === "scan" && (
            <>
              <div style={{ marginTop: 16, fontWeight: 700, fontSize: 14 }}>Available Camera</div>
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
          )}

          {lookingUp && (
            <div style={{ marginTop: 14, color: "#666" }}>Looking up student...</div>
          )}

          {!lookingUp && lookupError && (
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
              {lookupError}
            </div>
          )}

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
        </Modal.Body>
      </Modal>

      {/* Item QR scan modal (Test QR functionality) */}
      <Modal
        show={showItemScanner}
        onHide={() => setShowItemScanner(false)}
        size="xl"
        centered
        dialogAs={ModalDialog}
        animation
        backdrop
        keyboard
      >
        <Modal.Header closeButton>
          <Modal.Title>Scan Item QR</Modal.Title>
        </Modal.Header>
        <Modal.Body
          style={{ maxHeight: "calc(100vh - 220px)", overflowY: "auto" }}
        >
          <Row>
            <Col md="7">
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                  marginBottom: 12,
                }}
              >
                <span
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    background: itemScannerRunning ? "#1f7a1f" : "#666",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {itemScannerRunning ? "Live scanning" : "Camera stopped"}
                </span>
                <span
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    background: "#f0f0f0",
                    color: "#222",
                    fontSize: 12,
                  }}
                >
                  Scans at 10 fps
                </span>
              </div>

              <div
                id={itemQrRegionId}
                style={{ width: "100%", minHeight: 300, background: "#000" }}
              />

              <div
                style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}
              >
                <Button
                  variant={itemScannerRunning ? "danger" : "primary"}
                  onClick={() =>
                    itemScannerRunning ? stopItemScanner() : startItemScanner()
                  }
                >
                  {itemScannerRunning ? "Stop Camera" : "Start Camera"}
                </Button>
                {itemCameras.length > 0 && (
                  <select
                    style={{ maxWidth: 240 }}
                    className="form-control"
                    value={itemSelectedCamera || ""}
                    onChange={(e) => changeItemCamera(e.target.value)}
                  >
                    {itemCameras.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label || `Camera ${c.id.slice(0, 8)}`}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </Col>

            <Col md="5">
              <Card>
                <Card.Header>
                  <Card.Title as="h6">Scanned Item</Card.Title>
                </Card.Header>
                <Card.Body>
                  {scannedItem ? (
                    <>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>
                        {scannedItem.name}
                      </div>
                      <div style={{ marginTop: 6 }}>
                        <strong>Stock:</strong> {scannedItem.quantity || 0}
                      </div>
                      <div className="mt-3">
                        <Button
                          variant="success"
                          className="w-100"
                          onClick={addScannedItem}
                          disabled={
                            (Number(scannedItem.quantity) || 0) <= 0 ||
                            borrowedItems.some(
                              (i) => i.itemId === scannedItem.id
                            )
                          }
                        >
                          {borrowedItems.some((i) => i.itemId === scannedItem.id)
                            ? "Already Added"
                            : "Add to Borrow List"}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div style={{ color: "#999" }}>No item scanned yet.</div>
                  )}
                </Card.Body>
              </Card>

              <Card className="mt-3">
                <Card.Header>
                  <Card.Title as="h6">Scanner status</Card.Title>
                </Card.Header>
                <Card.Body>
                  <div>{itemScanStatus || "Camera idle"}</div>
                  <div style={{ marginTop: 8 }}>
                    <strong>Tip:</strong> keep the QR centered, then press Add to
                    put the item in the borrow list.
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Modal.Body>
      </Modal>
    </>
  );
}

export default Borrowed;
