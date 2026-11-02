import { Modal } from "antd";
import { Store } from "lucide-react";
import {
  LOCATION_CODES,
  LOCATIONS,
  type LocationCode,
} from "../../../config/locations";

interface Props {
  open: boolean;
  onSelect: (code: LocationCode) => void;
}

const CARD_CLASS =
  "rounded-2xl border border-gray-200 bg-white p-6 text-left hover:border-primary hover:bg-primary/5 transition-all active:scale-[0.99] cursor-pointer";

export default function LocationPromptModal({ open, onSelect }: Props) {
  return (
    <Modal
      open={open}
      centered
      closable={false}
      keyboard={false}
      mask={{ closable: false, blur: true }}
      footer={null}
      width={760}
      title="¿En qué sede te encuentras hoy?"
      styles={{ container: { borderRadius: 24, padding: 32 } }}
    >
      <p className="text-sm text-gray-500 mb-6">
        Selecciona la sede desde la que estás comprando. Esta elección se
        guardará en este equipo.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {LOCATION_CODES.map((code, index) => (
          <button
            key={code}
            type="button"
            autoFocus={index === 0}
            onClick={() => onSelect(code)}
            className={CARD_CLASS}
          >
            <Store size={28} className="text-primary mb-4" />
            <span className="block font-display text-lg font-bold text-gray-900">
              {LOCATIONS[code].name}
            </span>
            <span className="block mt-1 text-xs text-gray-400">
              Seleccionar esta sede
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
