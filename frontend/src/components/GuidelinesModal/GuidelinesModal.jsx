import { motion, AnimatePresence } from "framer-motion";
import { FiAlertTriangle } from "react-icons/fi";
import "./GuidelinesModal.css";

export default function GuidelinesModal({ open, title, items = [], onAccept, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="gm__overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="gm__panel"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="gm__title">
              <FiAlertTriangle /> {title || "تعليمات الحضور"}
            </h2>

            <ul className="gm__list">
              {items.map((item, i) => (
                <li key={i} className="gm__item">{item}</li>
              ))}
            </ul>

            <button className="gm__accept" onClick={onAccept}>
              قبول
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
