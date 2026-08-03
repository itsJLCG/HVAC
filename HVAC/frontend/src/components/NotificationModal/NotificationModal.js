import React from "react";

function NotificationModal({ show, onClose, title, message }) {
  React.useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => {
      onClose && onClose();
    }, 3500);
    return () => clearTimeout(t);
  }, [show, onClose]);

  if (!show) return null;

  return (
    <>
      <div className="modal-backdrop show" />
      <div className="modal d-block" tabIndex="-1" role="dialog">
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            {title && (
              <div className="modal-header">
                <h5 className="modal-title">{title}</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
              </div>
            )}
            <div className="modal-body">
              <div style={{ padding: 8 }}>{message}</div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default NotificationModal;
