import { FiX } from "react-icons/fi";
import "./Modal.css";

export default function Modal({ open, title, onClose, children, width = 480 }) {
  if (!open) return null;
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__panel" style={{ maxWidth: width }} onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h3>{title}</h3>
          <button className="modal__close" onClick={onClose} aria-label="إغلاق"><FiX /></button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}
