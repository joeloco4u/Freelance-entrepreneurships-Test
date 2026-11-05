import bannerValleFrio from "../../../assets/Banner Emprendimiento.png";
import bannerGranoDeOro from "../../../assets/Banner Emprendimiento 2.png";
import { LOCATIONS, type LocationCode } from "../../../config/locations";

interface Props {
  sede: LocationCode;
}

const BANNERS: Record<LocationCode, string> = {
  VF: bannerValleFrio,
  GO: bannerGranoDeOro,
};

export default function CatalogHero({ sede }: Props) {
  return (
    <div className="relative h-96 md:h-80 overflow-hidden">
      <img
        src={BANNERS[sede]}
        alt={LOCATIONS[sede].bannerAlt}
        className="w-full h-full object-cover"
      />

      {/* Overlay */}
      <div className={`absolute inset-0 ${LOCATIONS[sede].overlayClass}`} />

      {/* Text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 pt-24 md:pt-0">
        <p className="text-white/70 text-lg md:text-xl font-medium mb-1 uppercase tracking-wider">
          Emprendimientos internos
        </p>
        <h1 className="font-display text-4xl md:text-6xl font-bold text-white mb-2">
          Catálogo de productos
        </h1>
        <p className="text-white/80 text-base md:text-lg font-semibold mb-2">
          {LOCATIONS[sede].name}
        </p>
        <p className="text-white/60 md:text-xl text-lg">
          Apoya a tus compañeros comprando sus productos
        </p>
      </div>

      {/* Badge de sede activa */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none absolute top-4 right-4 w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center bg-white/50 backdrop-blur-xl text-slate-900 font-extrabold text-4xl md:text-5xl shadow-2xl border border-white/60 ring-1 ring-inset ring-white/30 [text-shadow:0_1px_0_rgba(255,255,255,0.65)]"
      >
        {sede}
      </div>
    </div>
  );
}
