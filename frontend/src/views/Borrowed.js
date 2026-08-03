import React, { useEffect, useRef, useState, useCallback } from "react";
import { Card, Container, Row, Col, Form, Button, Table } from "react-bootstrap";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType, NotFoundException } from "@zxing/library";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import "../assets/css/Borrowing.css";

const API_BASE = process.env.REACT_APP_API_BASE || "";
const itemQrRegionId = "borrowed-item-qr-reader";

const hints = new Map([
  [DecodeHintType.POSSIBLE_FORMATS, [
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
  ]],
  [DecodeHintType.TRY_HARDER, true],
]);

const todayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

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

const notify = (variant, message) => {
  window.dispatchEvent(new CustomEvent("app-notify", { detail: { variant, message } }));
};

const ModalShell = ({ show, onHide, title, children, size = "lg" }) => {
  if (!show) return null;

  const sizeClass = size === "xl" ? "modal-xl" : size === "lg" ? "modal-lg" : "";

  return (
    <>
      <div className="modal-backdrop fade show" onClick={onHide} />
      <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true" onClick={onHide} style={{ overflowY: "auto" }}>
        <div
          className={`modal-dialog modal-dialog-centered modal-dialog-scrollable ${sizeClass}`.trim()}
          role="document"
          onClick={(e) => e.stopPropagation()}
          style={{ maxHeight: "calc(100vh - 2rem)" }}
        >
          <div className="modal-content" style={{ maxHeight: "calc(100vh - 2rem)", overflowY: "auto" }}>
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button type="button" className="close" onClick={onHide} aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">{children}</div>
          </div>
        </div>
      </div>
    </>
  );
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
  const [saving, setSaving] = useState(false);

  const [showScanner, setShowScanner] = useState(false);
  const [mode, setMode] = useState("scan");
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState("");
  const [running, setRunning] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [decodeError, setDecodeError] = useState("");
  const [lookingUp, setLookingUp] = useState(false);

  const [showItemScanner, setShowItemScanner] = useState(false);
  const [itemScannerRunning, setItemScannerRunning] = useState(false);
  const [itemScanStatus, setItemScanStatus] = useState("Camera idle");
  const [itemCameras, setItemCameras] = useState([]);
  const [itemSelectedCamera, setItemSelectedCamera] = useState("");
  const [scannedItem, setScannedItem] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const readerRef = useRef(null);
  const itemScannerRef = useRef(null);
  const itemCameraRef = useRef("");
  const itemStartingRef = useRef(false);
  const lastItemLookupRef = useRef("");
  const addedItemIdsRef = useRef(new Set());

  const getReader = useCallback(() => {
    if (!readerRef.current) {
      readerRef.current = new BrowserMultiFormatReader(hints);
    }
    return readerRef.current;
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setRunning(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setStatusMsg("Starting camera...");
      const stream = await navigator.mediaDevices.getUserMedia(
        selectedCamera
          ? { video: { deviceId: { exact: selectedCamera } } }
          : { video: { facingMode: { ideal: "environment" } } }
      );
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setRunning(true);
      setStatusMsg("");
    } catch {
      setRunning(false);
      setStatusMsg("Unable to access camera.");
    }
  }, [selectedCamera]);

  useEffect(() => {
    BrowserMultiFormatReader.listVideoInputDevices()
      .then((devices) => {
        setCameras(devices || []);
        if (devices?.length) {
          const back = devices.find((device) => /back|rear|environment/i.test(device.label || ""));
          const cameraId = (back || devices[0]).deviceId;
          setSelectedCamera(cameraId);
        }
      })
      .catch(() => {});
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
      BrowserMultiFormatReader.releaseAllStreams?.();
    };
  }, [stopCamera]);

  const handleStudentFound = (student) => {
    setForm((prev) => ({
      ...prev,
      studentName: student.full_name,
      studentId: student.tupt_id,
    }));
    setManualInput(false);
    setShowScanner(false);
  };

  const lookupStudent = async (tuptId) => {
    if (!tuptId) return;
    setLookingUp(true);
    setDecodeError("");
    try {
      const res = await fetch(`${API_BASE}/api/students/by-tupt/${encodeURIComponent(tuptId)}`);
      if (!res.ok) throw new Error();
      handleStudentFound(await res.json());
    } catch {
      setForm((prev) => ({ ...prev, studentId: tuptId }));
      setManualInput(true);
      setShowScanner(false);
      notify("warning", `Student ID ${tuptId} is not in the database. Please enter the student's name manually.`);
    } finally {
      setLookingUp(false);
    }
  };

  const handleDecodedValue = (value) => {
    const clean = String(value || "").trim();
    if (clean) lookupStudent(clean);
  };

  const captureAndScan = async () => {
    if (!videoRef.current || !streamRef.current) return;
    setCapturing(true);
    setDecodeError("");
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const result = getReader().decodeFromCanvas(canvas);
      handleDecodedValue(result.getText());
    } catch (err) {
      if (err instanceof NotFoundException) {
        setDecodeError("No barcode detected.");
      } else {
        setDecodeError("Unable to decode image.");
      }
    } finally {
      setCapturing(false);
    }
  };

  const handleUploadFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setUploadFile(file);
    setUploadPreview(file ? URL.createObjectURL(file) : null);
    setDecodeError("");
  };

  const scanUploadedFile = async () => {
    if (!uploadFile) {
      setDecodeError("Choose an image first.");
      return;
    }
    setCapturing(true);
    const objectUrl = URL.createObjectURL(uploadFile);
    try {
      const result = await getReader().decodeFromImageUrl(objectUrl);
      handleDecodedValue(result.getText());
    } catch (err) {
      setDecodeError(err instanceof NotFoundException ? "No barcode found." : "Unable to decode image.");
    } finally {
      URL.revokeObjectURL(objectUrl);
      setCapturing(false);
    }
  };

  const addBorrowedItem = useCallback((item) => {
    const stock = Number(item.quantity) || 0;
    if (stock <= 0 || addedItemIdsRef.current.has(item.id)) return false;
    addedItemIdsRef.current.add(item.id);
    setBorrowedItems((prev) => [...prev, { itemId: item.id, name: item.name, stock, qty: 1 }]);
    return true;
  }, []);

  const updateQty = (itemId, value) => {
    setBorrowedItems((prev) =>
      prev.map((item) => {
        if (item.itemId !== itemId) return item;
        const parsed = Number(value);
        const qty = isNaN(parsed) ? 0 : Math.max(0, Math.min(parsed, item.stock));
        return { ...item, qty };
      })
    );
  };

  const removeBorrowedItem = (itemId) => {
    addedItemIdsRef.current.delete(itemId);
    setBorrowedItems((prev) => prev.filter((item) => item.itemId !== itemId));
  };

  const onItemScanSuccess = useCallback((decodedText) => {
    const value = String(decodedText || "").trim();
    if (!value || lastItemLookupRef.current === value) return;
    lastItemLookupRef.current = value;
    setScannedItem(null);
    setItemScanStatus("Looking up item...");

    const lookupUrl = value.startsWith("inventory:")
      ? `${API_BASE}/api/items/${encodeURIComponent(value.split(":")[1])}`
      : `${API_BASE}/api/items/by-qr/${encodeURIComponent(value)}`;

    fetch(lookupUrl)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((item) => {
        setScannedItem(item);
        setItemScanStatus(`QR detected: ${item.name}`);
      })
      .catch(() => setItemScanStatus("Item not found."));
  }, []);

  const addScannedItem = () => {
    if (!scannedItem) return;
    const added = addBorrowedItem(scannedItem);
    setItemScanStatus(added ? `Added: ${scannedItem.name}` : "Already added or out of stock.");
  };

  const stopItemScanner = useCallback(async () => {
    if (!itemScannerRef.current) return;
    try {
      await itemScannerRef.current.stop();
      itemScannerRef.current.clear();
    } catch {}
    itemScannerRef.current = null;
    setItemScannerRunning(false);
  }, []);

  const startItemScanner = useCallback(async () => {
    if (itemStartingRef.current) return;
    itemStartingRef.current = true;
    setItemScanStatus("Starting camera...");
    try {
      let cameras = [];
      try {
        cameras = await Html5Qrcode.getCameras();
      } catch {}
      const normalized = (cameras || []).map((camera) => ({ ...camera, id: camera.id || camera.deviceId })).filter((camera) => camera.id);
      setItemCameras(normalized);
      let cameraId = itemCameraRef.current;
      if (!cameraId && normalized.length) {
        const back = normalized.find((camera) => /back|rear|environment/i.test((camera.label || "").toLowerCase()));
        cameraId = (back || normalized[0]).id;
        itemCameraRef.current = cameraId;
        setItemSelectedCamera(cameraId);
      }
      if (!itemScannerRef.current) {
        itemScannerRef.current = new Html5Qrcode(itemQrRegionId, { verbose: false });
      }
      await itemScannerRef.current.start(
        cameraId ? { deviceId: { exact: cameraId } } : { facingMode: { ideal: "environment" } },
        {
          fps: 10,
          qrbox: (viewWidth, viewHeight) => {
            const min = Math.min(viewWidth, viewHeight);
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
    } catch {
      setItemScanStatus("Camera failed to start");
    } finally {
      itemStartingRef.current = false;
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

  const handleChange = ({ target: { name, value } }) => {
    setForm((prev) => {
      const next = { ...prev, [name]: value };
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
      items: borrowedItems.map((item) => ({ itemId: item.itemId, name: item.name, quantity: item.qty })),
    };

    setSaving(true);
    fetch(`${API_BASE}/api/borrows`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || "Failed to save borrow");
        notify("success", "Borrow saved successfully.");
        addedItemIdsRef.current = new Set();
        setBorrowedItems([]);
        setForm((prev) => ({ ...prev, studentName: "", studentId: "", borrowedDate: todayStr(), returnedDate: "" }));
      })
      .catch((err) => notify("danger", err.message || "Failed to save borrow"))
      .finally(() => setSaving(false));
  };

  return (
    <>
      <div className="tupt-dashboard borrow-page">
        <div className="tupt-ribbon" />
        <Container fluid>
          <div className="borrow-header">
            <div>
              <h2 className="borrow-title">Borrow Equipment</h2>
              <p className="borrow-subtitle">
                Scan student IDs, scan inventory QR codes, and create borrowing transactions.
              </p>
            </div>
          </div>

          <Form onSubmit={handleSubmit}>
            <div className="borrow-section">
              <div className="borrow-section-title">Student Information</div>
              <div className="borrow-actions mb-4">
                <Button type="button" className="borrow-submit" onClick={() => setShowScanner(true)}>
                  <ScanIcon /> Scan Student ID
                </Button>
                <Button type="button" className="borrow-outline" onClick={() => setManualInput((value) => !value)}>
                  {manualInput ? "Disable Manual Input" : "Manual Input"}
                </Button>
              </div>

              <Row>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Student Name</Form.Label>
                    <Form.Control name="studentName" value={form.studentName} onChange={handleChange} placeholder="Student Name" readOnly={!manualInput} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Student ID</Form.Label>
                    <Form.Control name="studentId" value={form.studentId} onChange={handleChange} placeholder="Student ID" readOnly={!manualInput} />
                  </Form.Group>
                </Col>
              </Row>
            </div>

            <div className="borrow-section">
              <div className="borrow-section-title">Borrowed Items</div>
              <div className="borrow-actions mb-4">
                <Button type="button" className="borrow-submit" onClick={() => setShowItemScanner(true)}>
                  <ScanIcon /> Scan Item QR
                </Button>
              </div>

              {borrowedItems.length ? (
                <Table bordered hover className="borrow-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Stock</th>
                      <th width="140">Qty</th>
                      <th width="60" />
                    </tr>
                  </thead>
                  <tbody>
                    {borrowedItems.map((item) => (
                      <tr key={item.itemId}>
                        <td>{item.name}</td>
                        <td>{item.stock}</td>
                        <td>
                          <Form.Control type="number" min="1" max={item.stock} value={item.qty} onChange={(e) => updateQty(item.itemId, e.target.value)} />
                        </td>
                        <td>
                          <Button type="button" variant="danger" size="sm" onClick={() => removeBorrowedItem(item.itemId)}>
                            ×
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <p className="text-muted">No items added.</p>
              )}
            </div>

            <div className="borrow-section">
              <div className="borrow-section-title">Borrow Details</div>
              <Row>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Borrow Date</Form.Label>
                    <Form.Control type="date" name="borrowedDate" value={form.borrowedDate} min={todayStr()} onChange={handleChange} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Return Date</Form.Label>
                    <Form.Control type="date" name="returnedDate" value={form.returnedDate} min={form.borrowedDate} onChange={handleChange} />
                  </Form.Group>
                </Col>
              </Row>
            </div>

            <div className="text-center">
              <Button type="submit" className="borrow-submit" disabled={saving}>
                {saving ? "Saving..." : "Submit Borrow"}
              </Button>
            </div>
          </Form>
        </Container>
      </div>

      <ModalShell show={showScanner} onHide={() => setShowScanner(false)} title="Scan Student ID" size="lg">
        <div className="borrow-actions mb-4">
          <Button type="button" className={mode === "scan" ? "borrow-submit" : "borrow-outline"} onClick={() => setMode("scan")}>
            <ScanIcon /> Scan
          </Button>
          <Button type="button" className={mode === "upload" ? "borrow-submit" : "borrow-outline"} onClick={() => setMode("upload")}>
            <UploadIcon /> Upload
          </Button>
        </div>

        {mode === "scan" ? (
          <>
            <div style={{ background: "#000", borderRadius: 12, overflow: "hidden" }}>
              <video ref={videoRef} playsInline muted style={{ width: "100%", display: running ? "block" : "none" }} />
              {!running && <div className="text-center p-5 text-muted">{statusMsg || "Camera Preview"}</div>}
            </div>
            <canvas ref={canvasRef} style={{ display: "none" }} />
            <div className="mt-3">
              <Form.Label>Camera</Form.Label>
              <Form.Control as="select" value={selectedCamera} onChange={(e) => setSelectedCamera(e.target.value)}>
                {cameras.length === 0 && <option value="">No camera found</option>}
                {cameras.map((camera) => (
                  <option key={camera.deviceId} value={camera.deviceId}>
                    {camera.label || "Camera"}
                  </option>
                ))}
              </Form.Control>
            </div>
            <div className="text-center mt-4">
              <Button type="button" className="borrow-submit" disabled={capturing} onClick={captureAndScan}>
                {capturing ? "Scanning..." : "Capture"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <Form.Group>
              <Form.Label>Upload Barcode</Form.Label>
              <Form.Control type="file" accept="image/*" onChange={handleUploadFileChange} />
            </Form.Group>
            {uploadPreview && <img src={uploadPreview} alt="" className="img-fluid rounded mt-3" />}
            <div className="text-center mt-4">
              <Button type="button" className="borrow-submit" disabled={!uploadFile || capturing} onClick={scanUploadedFile}>
                {capturing ? "Scanning..." : "Scan Image"}
              </Button>
            </div>
          </>
        )}

        {lookingUp && <p className="mt-3 text-muted">Looking up student...</p>}
        {decodeError && <div className="alert alert-danger mt-3">{decodeError}</div>}
      </ModalShell>

      <ModalShell show={showItemScanner} onHide={() => setShowItemScanner(false)} title="Scan Item QR" size="xl">
        <Row>
          <Col lg={7}>
            <div className="borrow-section">
              <div className="borrow-actions mb-3">
                <Button type="button" className={itemScannerRunning ? "borrow-outline" : "borrow-submit"} onClick={() => (itemScannerRunning ? stopItemScanner() : startItemScanner())}>
                  {itemScannerRunning ? "Stop Camera" : "Start Camera"}
                </Button>
                {!!itemCameras.length && (
                  <Form.Control as="select" value={itemSelectedCamera} onChange={(e) => changeItemCamera(e.target.value)} style={{ maxWidth: 260 }}>
                    {itemCameras.map((camera) => (
                      <option key={camera.id} value={camera.id}>
                        {camera.label || "Camera"}
                      </option>
                    ))}
                  </Form.Control>
                )}
              </div>
              <div id={itemQrRegionId} style={{ width: "100%", minHeight: 340, borderRadius: 12, overflow: "hidden", background: "#000" }} />
            </div>
          </Col>

          <Col lg={5}>
            <Card className="borrow-summary-card">
              <Card.Body>
                <h6 className="borrow-summary-title">Scanned Item</h6>
                {scannedItem ? (
                  <>
                    <h4 className="borrow-summary-value">{scannedItem.name}</h4>
                    <p className="mb-3">
                      <strong>Available:</strong> {scannedItem.quantity}
                    </p>
                    <Button className="borrow-submit w-100" disabled={borrowedItems.some((item) => item.itemId === scannedItem.id) || Number(scannedItem.quantity) <= 0} onClick={addScannedItem}>
                      {borrowedItems.some((item) => item.itemId === scannedItem.id) ? "Already Added" : "Add Item"}
                    </Button>
                  </>
                ) : (
                  <p className="text-muted mb-0">Scan a QR code to display the item.</p>
                )}
              </Card.Body>
            </Card>

            <Card className="borrow-summary-card mt-3">
              <Card.Body>
                <h6 className="borrow-summary-title">Scanner Status</h6>
                <p className="mb-0">{itemScanStatus}</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </ModalShell>
    </>
  );
}

export default Borrowed;
