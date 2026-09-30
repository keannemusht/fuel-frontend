import {
  Ambulance,
  Truck,
  CarFront,
  Wrench,
  Tractor,
  Zap,
  Gauge,
  Bus,
  LucideIcon,
} from 'lucide-react';

export interface UnitVisualConfig {
  Icon: LucideIcon;
  containerClass: string;
  label: string;
}

// Clean, unified industrial monochrome styling (avoids rainbow/candy "AI slop" colors)
const UNIFIED_CONTAINER =
  'bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/[0.08]';

/**
 * Returns contextual icon for a fleet unit.
 * Mining fleet classifications:
 * - AM / ERT -> Ambulance (Ambulance)
 * - LV -> Light Vehicle 4x4 (CarFront)
 * - ST / COMPRESOR ST -> Storing Truck (Truck)
 * - CT / COMPRESSOR CT -> Crane Truck (Truck)
 * - WT -> Water Truck (Truck)
 * - FT -> Fuel Truck (Truck)
 * - PM / ARCO / BPU / BTB / TRUCK / BM -> Dump Truck (Truck)
 * - KOMPRESSOR KAESAR / COMPRESSOR -> Compressor Unit (Gauge)
 * - GS / GEN -> Generator (Zap)
 * - EXCA / EX / HEAVY / DOZER -> Excavator & Heavy Equipment (Tractor)
 * - SERVICE -> Service Mechanics (Wrench)
 * - MV / MTV -> Man Hauler (Bus)
 */
export function getUnitVisualConfig(unitCode: string = '', category: string = ''): UnitVisualConfig {
  const code = unitCode.toUpperCase().trim();
  const cat = category.toUpperCase().trim();

  // 1. Ambulance / Emergency (AM, ERT)
  if (code.startsWith('AM') || code.startsWith('ERT') || cat.includes('AMBULANCE')) {
    return {
      Icon: Ambulance,
      containerClass: UNIFIED_CONTAINER,
      label: 'Ambulance',
    };
  }

  // 2. Light Vehicle 4x4 (LV)
  if (code.startsWith('LV') || cat === 'LIGHT_VEHICLE' || cat.includes('LIGHT') || cat.includes('PATROL')) {
    return {
      Icon: CarFront,
      containerClass: UNIFIED_CONTAINER,
      label: 'Light Vehicle',
    };
  }

  // 3. Storing Truck (ST, COMPRESOR ST) & Crane Truck (CT, COMPRESSOR CT)
  if (
    code.includes(' ST') ||
    code.startsWith('ST') ||
    code.includes(' CT') ||
    code.startsWith('CT')
  ) {
    const isST = code.includes(' ST') || code.startsWith('ST');
    return {
      Icon: Truck,
      containerClass: UNIFIED_CONTAINER,
      label: isST ? 'Storing Truck' : 'Crane Truck',
    };
  }

  // 4. Other Trucks (WT = Water Truck, FT = Fuel Truck, PM / ARCO / BPU / BTB / TRUCK / BM = Dump Truck)
  if (
    code.startsWith('WT') ||
    code.startsWith('FT') ||
    code.startsWith('PM') ||
    code.startsWith('ARCO') ||
    code.startsWith('BPU') ||
    code.startsWith('BTB') ||
    code.startsWith('TRUCK') ||
    code.startsWith('BM') ||
    code.startsWith('TH') ||
    cat.includes('TRUCK')
  ) {
    let label = 'Truck';
    if (code.startsWith('WT')) label = 'Water Truck';
    else if (code.startsWith('FT')) label = 'Fuel Truck';
    else if (code.startsWith('PM')) label = 'Double Trailer';
    else if (cat.includes('DUMP')) label = 'Dump Truck';

    return {
      Icon: Truck,
      containerClass: UNIFIED_CONTAINER,
      label,
    };
  }

  // 5. Stationary Compressors (KOMPRESSOR KAESAR, etc.)
  if (code.includes('COMPRESS') || code.includes('KOMPRESS')) {
    return {
      Icon: Gauge,
      containerClass: UNIFIED_CONTAINER,
      label: 'Compressor',
    };
  }

  // 6. Genset & Power Generation (GS, GEN)
  if (code.startsWith('GS') || cat === 'GENERATOR' || cat.includes('GEN')) {
    return {
      Icon: Zap,
      containerClass: UNIFIED_CONTAINER,
      label: 'Generator',
    };
  }

  // 7. Excavator & Heavy Earth Moving Equipment (EXCA, EX, DOZER, DIG)
  if (
    code.startsWith('EXCA') ||
    code.startsWith('EX') ||
    cat === 'HEAVY_EQUIPMENT' ||
    cat.includes('EXCA') ||
    cat.includes('DOZER')
  ) {
    return {
      Icon: Tractor,
      containerClass: UNIFIED_CONTAINER,
      label: 'Heavy Equipment',
    };
  }

  // 8. Service Maintenance (SERVICE)
  if (code.startsWith('SERVICE') || cat.includes('MAINTENANCE')) {
    return {
      Icon: Wrench,
      containerClass: UNIFIED_CONTAINER,
      label: 'Service Maintenance',
    };
  }

  // 9. Man Hauler / Passenger Bus (MV, MTV)
  if (code.startsWith('MV') || code.startsWith('MTV') || cat.includes('BUS')) {
    return {
      Icon: Bus,
      containerClass: UNIFIED_CONTAINER,
      label: 'Man Hauler',
    };
  }

  // 10. Default Fleet Equipment
  return {
    Icon: Truck,
    containerClass: UNIFIED_CONTAINER,
    label: 'Fleet Equipment',
  };
}
