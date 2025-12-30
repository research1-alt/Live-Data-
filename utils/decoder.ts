
import { DBCSignal } from '../types.ts';

/**
 * Normalizes any CAN ID format into a standard uppercase hex string.
 * Handles: 
 * - Decimal strings: "338624400" -> "142EFF90"
 * - Hex strings with 0x: "0x142EFF90" -> "142EFF90"
 * - Raw numbers: 291 -> "123"
 */
export function normalizeId(id: string | number | undefined): string {
  if (id === undefined || id === null) return "";
  
  // Handle numeric types (usually from code-generated IDs)
  if (typeof id === 'number') {
    return id.toString(16).toUpperCase();
  }

  let str = id.trim();
  
  // Case 1: Hex format (starts with 0x)
  if (str.toUpperCase().startsWith('0X')) {
    return str.substring(2).replace(/^0+/, '').toUpperCase() || "0";
  }

  // Case 2: Pure Decimal format (only digits) - standard for DBC keys
  if (/^\d+$/.test(str)) {
    try {
      // Use BigInt for 29-bit extended IDs which can exceed 32-bit integer limits
      return BigInt(str).toString(16).toUpperCase();
    } catch (e) {
      return str.toUpperCase();
    }
  }

  // Case 3: Raw Hex string (no prefix, often found in TRC parsing)
  return str.replace(/^0+/, '').toUpperCase() || "0";
}

/**
 * Decodes a specific signal from raw CAN data bytes.
 */
export function decodeSignal(data: string[], signal: DBCSignal): string {
  try {
    const bytes = data.map(hex => parseInt(hex, 16));
    let rawValue = 0n;

    if (signal.isLittleEndian) {
      const buffer = new Uint8Array(8);
      bytes.forEach((b, i) => buffer[i] = b);
      const dataView = new DataView(buffer.buffer);
      const fullValue = dataView.getBigUint64(0, true);
      
      const mask = (1n << BigInt(signal.length)) - 1n;
      rawValue = (fullValue >> BigInt(signal.startBit)) & mask;
    } else {
      const buffer = new Uint8Array(8);
      bytes.forEach((b, i) => buffer[i] = b);
      const dataView = new DataView(buffer.buffer);
      const fullValue = dataView.getBigUint64(0, false);
      
      const totalBits = 64;
      const shift = BigInt(totalBits - (signal.startBit + signal.length));
      const mask = (1n << BigInt(signal.length)) - 1n;
      rawValue = (fullValue >> shift) & mask;
    }

    let value = Number(rawValue);

    if (signal.isSigned) {
      const maxVal = Math.pow(2, signal.length);
      if (value >= maxVal / 2) {
        value -= maxVal;
      }
    }

    const physicalValue = (value * signal.scale) + signal.offset;
    return `${physicalValue.toFixed(2)}${signal.unit ? ' ' + signal.unit : ''}`;
  } catch (e) {
    return "ERR";
  }
}

/**
 * Helper to convert decimal ID to Hex string for display
 */
export function decToHex(decId: string | number): string {
  if (typeof decId === 'string' && decId.toUpperCase().startsWith('0X')) return decId.toUpperCase();
  const hex = normalizeId(decId);
  return `0x${hex}`;
}
