import Modal from "../../components/Modal/Modal";
import TicketsSection from "./TicketsSection";

export default function TicketsModal({ event, onClose }) {
  return (
    <Modal open title={`تذاكر ومقاعد — ${event.title_ar}`} onClose={onClose} width={720}>
      <TicketsSection event={event} />
    </Modal>
  );
}
