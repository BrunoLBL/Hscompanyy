import { getOdontogram, saveOdontogram } from '../modules/store.js';
import { escapeHTML } from '../utils/helpers.js';
import { toast } from './toast.js';

/**
 * Definição clínica das condições odontológicas
 */
export const ODONTO_CONDITIONS = {
  healthy: {
    key: 'healthy',
    label: 'Saudável',
    color: '#10B981',
    fill: 'url(#enamelGrad)',
    activeFill: '#E8F5E9',
    stroke: '#B8B0A4',
    badgeBg: 'rgba(16, 185, 129, 0.12)',
    badgeText: '#059669',
    desc: 'Esmalte íntegro sem alterações'
  },
  cavity: {
    key: 'cavity',
    label: 'Cárie',
    color: '#E74C3C',
    fill: '#EF4444',
    activeFill: '#EF4444',
    stroke: '#991B1B',
    badgeBg: 'rgba(239, 68, 68, 0.14)',
    badgeText: '#DC2626',
    desc: 'Lesão cariosa ativa ou cavitada'
  },
  filling: {
    key: 'filling',
    label: 'Restauração',
    color: '#1E6FD9',
    fill: '#3B82F6',
    activeFill: '#3B82F6',
    stroke: '#1E40AF',
    badgeBg: 'rgba(59, 130, 246, 0.14)',
    badgeText: '#1D4ED8',
    desc: 'Restauração em resina ou amálgama'
  },
  crown: {
    key: 'crown',
    label: 'Coroa / Prótese',
    color: '#F5A623',
    fill: '#F59E0B',
    activeFill: '#F59E0B',
    stroke: '#92400E',
    badgeBg: 'rgba(245, 158, 11, 0.15)',
    badgeText: '#B45309',
    desc: 'Coroa protética total ou parcial'
  },
  rootCanal: {
    key: 'rootCanal',
    label: 'Canal (Endodontia)',
    color: '#E91E63',
    fill: '#EC4899',
    activeFill: '#EC4899',
    stroke: '#9D174D',
    badgeBg: 'rgba(236, 72, 153, 0.14)',
    badgeText: '#BE185D',
    desc: 'Tratamento endodôntico realizado ou indicado'
  },
  implant: {
    key: 'implant',
    label: 'Implante',
    color: '#9B59B6',
    fill: '#8B5CF6',
    activeFill: '#8B5CF6',
    stroke: '#5B21B6',
    badgeBg: 'rgba(139, 92, 246, 0.14)',
    badgeText: '#6D28D9',
    desc: 'Implante osseointegrado de titânio'
  },
  missing: {
    key: 'missing',
    label: 'Ausente / Extraído',
    color: '#64748B',
    fill: '#CBD5E1',
    activeFill: '#94A3B8',
    stroke: '#475569',
    badgeBg: 'rgba(100, 116, 139, 0.15)',
    badgeText: '#475569',
    desc: 'Elemento dentário ausente ou extraído'
  }
};

/**
 * Catálogo anatômico completo (Notação FDI)
 * Posições polares/parabólicas exatas na arcada de boca aberta (viewBox 0 0 860 920)
 */
const PERMANENT_UPPER_RIGHT = [
  { num: 18, type: 'molar',    scale: 0.92, x: 223, y: 385, angle: -88, roots: 3, name: '3º Molar Superior Direito (Siso)' },
  { num: 17, type: 'molar',    scale: 0.98, x: 229, y: 330, angle: -84, roots: 3, name: '2º Molar Superior Direito' },
  { num: 16, type: 'molar',    scale: 1.04, x: 241, y: 274, angle: -78, roots: 3, name: '1º Molar Superior Direito' },
  { num: 15, type: 'premolar', scale: 0.96, x: 261, y: 223, angle: -68, roots: 1, name: '2º Pré-Molar Superior Direito' },
  { num: 14, type: 'premolar', scale: 0.98, x: 288, y: 181, angle: -54, roots: 2, name: '1º Pré-Molar Superior Direito' },
  { num: 13, type: 'canine',   scale: 1.00, x: 324, y: 148, angle: -36, roots: 1, name: 'Canino Superior Direito' },
  { num: 12, type: 'incisor_lat', scale: 0.94, x: 365, y: 127, angle: -20, roots: 1, name: 'Incisivo Lateral Superior Direito' },
  { num: 11, type: 'incisor_cen', scale: 1.00, x: 407, y: 118, angle: -7,  roots: 1, name: 'Incisivo Central Superior Direito' }
];

const PERMANENT_UPPER_LEFT = [
  { num: 21, type: 'incisor_cen', scale: 1.00, x: 453, y: 118, angle: 7,   roots: 1, name: 'Incisivo Central Superior Esquerdo' },
  { num: 22, type: 'incisor_lat', scale: 0.94, x: 495, y: 127, angle: 20,  roots: 1, name: 'Incisivo Lateral Superior Esquerdo' },
  { num: 23, type: 'canine',   scale: 1.00, x: 536, y: 148, angle: 36,  roots: 1, name: 'Canino Superior Esquerdo' },
  { num: 24, type: 'premolar', scale: 0.98, x: 572, y: 181, angle: 54,  roots: 2, name: '1º Pré-Molar Superior Esquerdo' },
  { num: 25, type: 'premolar', scale: 0.96, x: 599, y: 223, angle: 68,  roots: 1, name: '2º Pré-Molar Superior Esquerdo' },
  { num: 26, type: 'molar',    scale: 1.04, x: 619, y: 274, angle: 78,  roots: 3, name: '1º Molar Superior Esquerdo' },
  { num: 27, type: 'molar',    scale: 0.98, x: 631, y: 330, angle: 84,  roots: 3, name: '2º Molar Superior Esquerdo' },
  { num: 28, type: 'molar',    scale: 0.92, x: 637, y: 385, angle: 88,  roots: 3, name: '3º Molar Superior Esquerdo (Siso)' }
];

const PERMANENT_LOWER_RIGHT = [
  { num: 48, type: 'molar',    scale: 0.92, x: 228, y: 539, angle: 88,  roots: 2, name: '3º Molar Inferior Direito (Siso)' },
  { num: 47, type: 'molar',    scale: 0.98, x: 235, y: 594, angle: 84,  roots: 2, name: '2º Molar Inferior Direito' },
  { num: 46, type: 'molar',    scale: 1.04, x: 249, y: 650, angle: 77,  roots: 2, name: '1º Molar Inferior Direito' },
  { num: 45, type: 'premolar', scale: 0.96, x: 271, y: 701, angle: 67,  roots: 1, name: '2º Pré-Molar Inferior Direito' },
  { num: 44, type: 'premolar', scale: 0.96, x: 299, y: 742, angle: 53,  roots: 1, name: '1º Pré-Molar Inferior Direito' },
  { num: 43, type: 'canine',   scale: 0.96, x: 334, y: 774, angle: 35,  roots: 1, name: 'Canino Inferior Direito' },
  { num: 42, type: 'incisor_lat', scale: 0.88, x: 373, y: 794, angle: 19,  roots: 1, name: 'Incisivo Lateral Inferior Direito' },
  { num: 41, type: 'incisor_lat', scale: 0.85, x: 411, y: 802, angle: 6,   roots: 1, name: 'Incisivo Central Inferior Direito' }
];

const PERMANENT_LOWER_LEFT = [
  { num: 31, type: 'incisor_lat', scale: 0.85, x: 449, y: 802, angle: -6,  roots: 1, name: 'Incisivo Central Inferior Esquerdo' },
  { num: 32, type: 'incisor_lat', scale: 0.88, x: 487, y: 794, angle: -19, roots: 1, name: 'Incisivo Lateral Inferior Esquerdo' },
  { num: 33, type: 'canine',   scale: 0.96, x: 526, y: 774, angle: -35, roots: 1, name: 'Canino Inferior Esquerdo' },
  { num: 34, type: 'premolar', scale: 0.96, x: 561, y: 742, angle: -53, roots: 1, name: '1º Pré-Molar Inferior Esquerdo' },
  { num: 35, type: 'premolar', scale: 0.96, x: 589, y: 701, angle: -67, roots: 1, name: '2º Pré-Molar Inferior Esquerdo' },
  { num: 36, type: 'molar',    scale: 1.04, x: 611, y: 650, angle: -77, roots: 2, name: '1º Molar Inferior Esquerdo' },
  { num: 37, type: 'molar',    scale: 0.98, x: 625, y: 594, angle: -84, roots: 2, name: '2º Molar Inferior Esquerdo' },
  { num: 38, type: 'molar',    scale: 0.92, x: 632, y: 539, angle: -88, roots: 2, name: '3º Molar Inferior Esquerdo (Siso)' }
];

const DECIDUOUS_UPPER_RIGHT = [
  { num: 55, type: 'molar',       scale: 0.95, x: 256, y: 318, angle: -80, roots: 3, name: '2º Molar Decíduo Superior Direito' },
  { num: 54, type: 'molar',       scale: 0.90, x: 274, y: 254, angle: -66, roots: 3, name: '1º Molar Decíduo Superior Direito' },
  { num: 53, type: 'canine',      scale: 0.92, x: 308, y: 196, angle: -44, roots: 1, name: 'Canino Decíduo Superior Direito' },
  { num: 52, type: 'incisor_lat', scale: 0.88, x: 354, y: 156, angle: -24, roots: 1, name: 'Incisivo Lateral Decíduo Superior Direito' },
  { num: 51, type: 'incisor_cen', scale: 0.92, x: 405, y: 138, angle: -8,  roots: 1, name: 'Incisivo Central Decíduo Superior Direito' }
];

const DECIDUOUS_UPPER_LEFT = [
  { num: 61, type: 'incisor_cen', scale: 0.92, x: 455, y: 138, angle: 8,   roots: 1, name: 'Incisivo Central Decíduo Superior Esquerdo' },
  { num: 62, type: 'incisor_lat', scale: 0.88, x: 506, y: 156, angle: 24,  roots: 1, name: 'Incisivo Lateral Decíduo Superior Esquerdo' },
  { num: 63, type: 'canine',      scale: 0.92, x: 552, y: 196, angle: 44,  roots: 1, name: 'Canino Decíduo Superior Esquerdo' },
  { num: 64, type: 'molar',       scale: 0.90, x: 586, y: 254, angle: 66,  roots: 3, name: '1º Molar Decíduo Superior Esquerdo' },
  { num: 65, type: 'molar',       scale: 0.95, x: 604, y: 318, angle: 80,  roots: 3, name: '2º Molar Decíduo Superior Esquerdo' }
];

const DECIDUOUS_LOWER_RIGHT = [
  { num: 85, type: 'molar',       scale: 0.95, x: 260, y: 602, angle: 80,  roots: 2, name: '2º Molar Decíduo Inferior Direito' },
  { num: 84, type: 'molar',       scale: 0.90, x: 278, y: 666, angle: 66,  roots: 2, name: '1º Molar Decíduo Inferior Direito' },
  { num: 83, type: 'canine',      scale: 0.90, x: 312, y: 724, angle: 44,  roots: 1, name: 'Canino Decíduo Inferior Direito' },
  { num: 82, type: 'incisor_lat', scale: 0.84, x: 358, y: 764, angle: 24,  roots: 1, name: 'Incisivo Lateral Decíduo Inferior Direito' },
  { num: 81, type: 'incisor_lat', scale: 0.82, x: 407, y: 782, angle: 8,   roots: 1, name: 'Incisivo Central Decíduo Inferior Direito' }
];

const DECIDUOUS_LOWER_LEFT = [
  { num: 71, type: 'incisor_lat', scale: 0.82, x: 453, y: 782, angle: -8,  roots: 1, name: 'Incisivo Central Decíduo Inferior Esquerdo' },
  { num: 72, type: 'incisor_lat', scale: 0.84, x: 502, y: 764, angle: -24, roots: 1, name: 'Incisivo Lateral Decíduo Inferior Esquerdo' },
  { num: 73, type: 'canine',      scale: 0.90, x: 548, y: 724, angle: -44, roots: 1, name: 'Canino Decíduo Inferior Esquerdo' },
  { num: 74, type: 'molar',       scale: 0.90, x: 582, y: 666, angle: -66, roots: 2, name: '1º Molar Decíduo Inferior Esquerdo' },
  { num: 75, type: 'molar',       scale: 0.95, x: 600, y: 602, angle: -80, roots: 2, name: '2º Molar Decíduo Inferior Esquerdo' }
];

const ALL_TEETH_MAP = new Map();
[
  ...PERMANENT_UPPER_RIGHT, ...PERMANENT_UPPER_LEFT,
  ...PERMANENT_LOWER_RIGHT, ...PERMANENT_LOWER_LEFT,
  ...DECIDUOUS_UPPER_RIGHT, ...DECIDUOUS_UPPER_LEFT,
  ...DECIDUOUS_LOWER_RIGHT, ...DECIDUOUS_LOWER_LEFT
].forEach(t => ALL_TEETH_MAP.set(t.num, t));

/**
 * Geometria vetorial anatômica de cada tipo de dente (5 faces encaixadas sem falhas)
 * Coordenadas locais centradas em (0,0)
 */
const TOOTH_GEOMETRY = {
  molar: {
    outline: 'M -19,-18 C -12,-22 -4,-21 0,-19 C 4,-21 12,-22 19,-18 C 23,-14 24,-6 22,0 C 24,6 23,14 18,18 C 11,22 4,21 0,19 C -4,21 -11,22 -18,18 C -23,14 -24,6 -22,0 C -24,-6 -23,-14 -19,-18 Z',
    faces: {
      top:    'M -19,-18 C -12,-22 -4,-21 0,-19 C 4,-21 12,-22 19,-18 L 9,-8 C 4,-10 -4,-10 -9,-8 Z',
      right:  'M 19,-18 C 23,-14 24,-6 22,0 C 24,6 23,14 18,18 L 9,8 C 12,5 12,-5 9,-8 Z',
      bottom: 'M 18,18 C 11,22 4,21 0,19 C -4,21 -11,22 -18,18 L -9,8 C -4,10 4,10 9,8 Z',
      left:   'M -18,18 C -23,14 -24,6 -22,0 C -24,-6 -23,-14 -19,-18 L -9,-8 C -12,-5 -12,5 -9,8 Z',
      center: 'M -9,-8 C -4,-10 4,-10 9,-8 C 12,-5 12,5 9,8 C 4,10 -4,10 -9,8 C -12,5 -12,-5 -9,-8 Z'
    },
    grooves: 'M -7,0 C -2,1 2,-1 7,0 M 0,-6 L 0,6 M -4,-3 L -7,-5 M 4,-3 L 7,-5 M -4,3 L -7,5 M 4,3 L 7,5'
  },
  premolar: {
    outline: 'M -14,-14 C -7,-20 7,-20 14,-14 C 20,-7 20,7 13,14 C 6,20 -6,20 -13,14 C -20,7 -20,-7 -14,-14 Z',
    faces: {
      top:    'M -14,-14 C -7,-20 7,-20 14,-14 L 7,-6 C 3,-8 -3,-8 -7,-6 Z',
      right:  'M 14,-14 C 20,-7 20,7 13,14 L 7,6 C 9,3 9,-3 7,-6 Z',
      bottom: 'M 13,14 C 6,20 -6,20 -13,14 L -7,6 C -3,8 3,8 7,6 Z',
      left:   'M -13,14 C -20,7 -20,-7 -14,-14 L -7,-6 C -9,-3 -9,3 -7,6 Z',
      center: 'M -7,-6 C -3,-8 3,-8 7,-6 C 9,-3 9,3 7,6 C 3,8 -3,8 -7,6 C -9,3 -9,-3 -7,-6 Z'
    },
    grooves: 'M -5,0 L 5,0 M -4,-2 L -6,0 L -4,2 M 4,-2 L 6,0 L 4,2'
  },
  canine: {
    outline: 'M -14,-11 C -8,-18 -3,-20 0,-21 C 3,-20 8,-18 14,-11 C 19,-4 18,5 12,13 C 6,19 -6,19 -12,13 C -18,5 -19,-4 -14,-11 Z',
    faces: {
      top:    'M -14,-11 C -8,-18 -3,-20 0,-21 C 3,-20 8,-18 14,-11 L 7,-5 C 3,-8 -3,-8 -7,-5 Z',
      right:  'M 14,-11 C 19,-4 18,5 12,13 L 6,6 C 9,2 9,-2 7,-5 Z',
      bottom: 'M 12,13 C 6,19 -6,19 -12,13 L -6,6 C -3,8 3,8 6,6 Z',
      left:   'M -12,13 C -18,5 -19,-4 -14,-11 L -7,-5 C -9,-2 -9,2 -6,6 Z',
      center: 'M -7,-5 C -3,-8 3,-8 7,-5 C 9,-2 9,2 6,6 C 3,8 -3,8 -6,6 C -9,2 -9,-2 -7,-5 Z'
    },
    grooves: 'M 0,-4 L 0,4 M -4,0 L 4,0'
  },
  incisor_cen: {
    outline: 'M -16,-12 C -9,-18 9,-18 16,-12 C 19,-5 17,6 11,14 C 5,19 -5,19 -11,14 C -17,6 -19,-5 -16,-12 Z',
    faces: {
      top:    'M -16,-12 C -9,-18 9,-18 16,-12 L 9,-4 C 4,-6 -4,-6 -9,-4 Z',
      right:  'M 16,-12 C 19,-5 17,6 11,14 L 7,5 C 10,2 10,-1 9,-4 Z',
      bottom: 'M 11,14 C 5,19 -5,19 -11,14 L -7,5 C -3,7 3,7 7,5 Z',
      left:   'M -11,14 C -17,6 -19,-5 -16,-12 L -9,-4 C -10,-1 -10,2 -7,5 Z',
      center: 'M -9,-4 C -4,-6 4,-6 9,-4 C 10,-1 10,2 7,5 C 3,7 -3,7 -7,5 C -10,2 -10,-1 -9,-4 Z'
    },
    grooves: 'M -6,0 L 6,0'
  },
  incisor_lat: {
    outline: 'M -14,-11 C -8,-17 8,-17 14,-11 C 17,-4 15,6 10,13 C 4,18 -4,18 -10,13 C -15,6 -17,-4 -14,-11 Z',
    faces: {
      top:    'M -14,-11 C -8,-17 8,-17 14,-11 L 8,-4 C 3,-6 -3,-6 -8,-4 Z',
      right:  'M 14,-11 C 17,-4 15,6 10,13 L 6,5 C 9,2 9,-1 8,-4 Z',
      bottom: 'M 10,13 C 4,18 -4,18 -10,13 L -6,5 C -3,7 3,7 6,5 Z',
      left:   'M -10,13 C -15,6 -17,-4 -14,-11 L -8,-4 C -9,-1 -9,2 -6,5 Z',
      center: 'M -8,-4 C -3,-6 3,-6 8,-4 C 9,-1 9,2 6,5 C 3,7 -3,7 -6,5 C -9,2 -9,-1 -8,-4 Z'
    },
    grooves: 'M -5,0 L 5,0'
  }
};

const FACES_LIST = ['top', 'right', 'bottom', 'left', 'center'];

/**
 * Retorna o nome anatômico exato de uma face com base no dente (FDI)
 */
export function getAnatomicalFaceName(toothNum, faceKey) {
  const quadrant = Math.floor(toothNum / 10);
  const pos = toothNum % 10;
  const isUpper = quadrant === 1 || quadrant === 2 || quadrant === 5 || quadrant === 6;
  const isRightSide = quadrant === 1 || quadrant === 4 || quadrant === 5 || quadrant === 8;
  const isAnterior = pos <= 3;

  if (faceKey === 'center') return isAnterior ? 'Incisal' : 'Oclusal';
  if (faceKey === 'top') return isUpper ? 'Vestibular' : 'Lingual';
  if (faceKey === 'bottom') return isUpper ? 'Palatina' : 'Vestibular';
  if (faceKey === 'left') return isRightSide ? 'Distal' : 'Mesial';
  if (faceKey === 'right') return isRightSide ? 'Mesial' : 'Distal';
  return faceKey;
}

/**
 * Verifica se o dente inteiro possui uma condição dominante (ex: ausente, implante, coroa, canal)
 */
function getToothDominantState(toothData) {
  if (!toothData) return { isMissing: false, hasImplant: false, hasRootCanal: false, hasCrown: false, hasAny: false };
  const vals = FACES_LIST.map(f => toothData[f] || 'healthy');
  const nonHealthy = vals.filter(v => v !== 'healthy');
  return {
    isMissing: vals.every(v => v === 'missing'),
    hasImplant: vals.includes('implant'),
    hasRootCanal: vals.includes('rootCanal'),
    hasCrown: vals.includes('crown'),
    hasAny: nonHealthy.length > 0 || Boolean(toothData.notes && toothData.notes.trim())
  };
}

/**
 * Renderiza o módulo completo de Odontograma Profissional (Boca Aberta + Carta com Raízes + Inspetor)
 */
export function renderOdontogramModule(container, patientId) {
  const odontoData = getOdontogram(patientId);
  let selectedCondition = 'cavity';
  let applyMode = 'face'; // 'face' | 'tooth'
  let archType = 'permanent'; // 'permanent' (32) | 'deciduous' (20)
  let viewMode = 'mouth'; // 'mouth' (Boca Aberta) | 'chart' (Carta com Raízes)
  let selectedToothNum = 16;

  function applyConditionToTooth(toothNum, faceKey = null) {
    if (!odontoData[toothNum]) odontoData[toothNum] = {};
    const tData = odontoData[toothNum];

    // Condições que naturalmente se aplicam ao dente inteiro quando no modo 'tooth' ou se for 'missing'/'implant'
    if (applyMode === 'tooth' || !faceKey) {
      const allSame = FACES_LIST.every(f => (tData[f] || 'healthy') === selectedCondition);
      const nextVal = allSame ? 'healthy' : selectedCondition;
      FACES_LIST.forEach(f => { tData[f] = nextVal; });
    } else {
      tData[faceKey] = tData[faceKey] === selectedCondition ? 'healthy' : selectedCondition;
    }

    selectedToothNum = toothNum;
    saveOdontogram(patientId, odontoData);
    render();
  }

  /**
   * Gera um dente anatômico no SVG da Boca Aberta
   */
  function renderArchToothSVG(tooth) {
    const geom = TOOTH_GEOMETRY[tooth.type] || TOOTH_GEOMETRY.molar;
    const tData = odontoData[tooth.num] || {};
    const state = getToothDominantState(tData);
    const isSelected = selectedToothNum === tooth.num;
    const quadrant = Math.floor(tooth.num / 10);
    const isUpper = quadrant === 1 || quadrant === 2 || quadrant === 5 || quadrant === 6;

    // Nas arcadas inferiores, a face 'bottom' fica voltada para o lábio (Vestibular) e 'top' para a língua (Lingual),
    // mantendo compatibilidade 100% com a orientação visual na tela.
    const rad = ((tooth.angle + (isUpper ? -90 : 90)) * Math.PI) / 180;
    const badgeDist = 37;
    const bx = Math.cos(rad) * badgeDist;
    const by = Math.sin(rad) * badgeDist;

    const facesSvg = FACES_LIST.map(faceKey => {
      const condKey = tData[faceKey] || 'healthy';
      const cond = ODONTO_CONDITIONS[condKey] || ODONTO_CONDITIONS.healthy;
      const faceName = getAnatomicalFaceName(tooth.num, faceKey);
      const fillVal = condKey === 'healthy' ? 'url(#enamelGrad)' : cond.fill;
      const strokeVal = condKey === 'healthy' ? '#B8B0A0' : cond.stroke;

      return `<path
        class="odonto-face"
        d="${geom.faces[faceKey]}"
        fill="${fillVal}"
        stroke="${strokeVal}"
        stroke-width="1.1"
        data-tooth="${tooth.num}"
        data-face="${faceKey}"
      ><title>Dente ${tooth.num} (${tooth.name}) — Face ${faceName}: ${cond.label}</title></path>`;
    }).join('');

    // Indicadores clínicos especiais sobre o dente
    let overlayDecor = '';
    if (state.isMissing) {
      overlayDecor = `
        <g pointer-events="none" class="odonto-missing-mark">
          <line x1="-15" y1="-15" x2="15" y2="15" stroke="#EF4444" stroke-width="3" stroke-linecap="round"/>
          <line x1="15" y1="-15" x2="-15" y2="15" stroke="#EF4444" stroke-width="3" stroke-linecap="round"/>
        </g>`;
    } else {
      if (state.hasCrown) {
        overlayDecor += `<path d="${geom.outline}" fill="none" stroke="#F59E0B" stroke-width="2.6" stroke-dasharray="3,2" pointer-events="none"/>`;
      }
      if (state.hasImplant) {
        overlayDecor += `<circle cx="0" cy="0" r="4.2" fill="#7C3AED" stroke="#fff" stroke-width="1.2" pointer-events="none"/>`;
      } else if (state.hasRootCanal) {
        overlayDecor += `<circle cx="0" cy="0" r="3.6" fill="#DB2777" stroke="#fff" stroke-width="1.2" pointer-events="none"/>`;
      }
    }

    return `
      <g class="odonto-arch-tooth-group ${isSelected ? 'is-selected' : ''} ${state.isMissing ? 'is-missing' : ''}"
         transform="translate(${tooth.x}, ${tooth.y})"
         data-tooth-group="${tooth.num}">
        <!-- Halo de Seleção -->
        ${isSelected ? `<circle cx="0" cy="0" r="28" fill="rgba(30, 111, 217, 0.18)" stroke="#1E6FD9" stroke-width="2" stroke-dasharray="4,2" pointer-events="none"/>` : ''}

        <!-- Coroa Anatômica Rotacionada na Curva da Arcada -->
        <g class="odonto-tooth-crown" transform="rotate(${tooth.angle}) scale(${tooth.scale})">
          <!-- Sombra Projetada na Gengiva -->
          <path d="${geom.outline}" fill="rgba(45, 15, 22, 0.25)" transform="translate(1.5, 2)" pointer-events="none"/>
          <!-- Contorno Base do Esmalte -->
          <path d="${geom.outline}" fill="url(#enamelGrad)" stroke="#8D8273" stroke-width="1.6" pointer-events="none"/>
          <!-- 5 Faces Anatômicas Selecionáveis -->
          ${facesSvg}
          <!-- Sulcos Anatômicos e Fissuras Oclusais -->
          <path d="${geom.grooves}" fill="none" stroke="rgba(90, 76, 60, 0.42)" stroke-width="1.15" stroke-linecap="round" pointer-events="none"/>
          <!-- Brilho Specular do Esmalte -->
          <ellipse cx="-4" cy="-11" rx="5" ry="1.8" fill="rgba(255,255,255,0.55)" pointer-events="none"/>
          ${overlayDecor}
        </g>

        <!-- Badge Numérico FDI (Sempre Horizontal e Clicável) -->
        <g class="odonto-num-badge ${isSelected ? 'active' : ''} ${state.hasAny ? 'has-cond' : ''}"
           transform="translate(${bx.toFixed(1)}, ${by.toFixed(1)})"
           data-select-tooth="${tooth.num}">
          <rect x="-13" y="-9.5" width="26" height="19" rx="9.5"
                fill="${isSelected ? '#1E6FD9' : state.hasAny ? '#FFFBEB' : 'rgba(255,255,255,0.92)'}"
                stroke="${isSelected ? '#1E6FD9' : state.hasAny ? '#F59E0B' : '#CBD5E1'}"
                stroke-width="1.3"/>
          <text x="0" y="3.5" text-anchor="middle"
                font-size="10.5" font-weight="700"
                fill="${isSelected ? '#FFFFFF' : state.hasAny ? '#B45309' : '#334155'}">${tooth.num}</text>
        </g>
      </g>
    `;
  }

  /**
   * Gera a visualização de Raízes Anatômicas + Coroa para o Modo Carta Clínica e para o Inspetor
   */
  function renderRootSVG(tooth, tData, isUpper = true) {
    const state = getToothDominantState(tData);
    const rootColor = state.isMissing ? '#CBD5E1' : '#F3E5AB';
    const rootStroke = state.isMissing ? '#94A3B8' : '#C2A878';
    const flip = isUpper ? 1 : -1;

    let rootPaths = '';
    let canalPaths = '';

    if (tooth.roots === 3) {
      rootPaths = `
        <path d="M -12,0 C -16,${-22*flip} -18,${-38*flip} -14,${-46*flip} C -11,${-46*flip} -8,${-30*flip} -5,0 Z" fill="${rootColor}" stroke="${rootStroke}" stroke-width="1.2"/>
        <path d="M -4,0 C -4,${-26*flip} -2,${-44*flip} 0,${-50*flip} C 2,${-44*flip} 4,${-26*flip} 4,0 Z" fill="${rootColor}" stroke="${rootStroke}" stroke-width="1.2"/>
        <path d="M 5,0 C 8,${-30*flip} 11,${-46*flip} 14,${-46*flip} C 18,${-38*flip} 16,${-22*flip} 12,0 Z" fill="${rootColor}" stroke="${rootStroke}" stroke-width="1.2"/>
      `;
      canalPaths = `
        <path d="M -9,0 Q -13,${-24*flip} -13,${-42*flip}" stroke="#EC4899" stroke-width="2.2" fill="none" stroke-linecap="round"/>
        <path d="M 0,0 L 0,${-45*flip}" stroke="#EC4899" stroke-width="2.2" fill="none" stroke-linecap="round"/>
        <path d="M 9,0 Q 13,${-24*flip} 13,${-42*flip}" stroke="#EC4899" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      `;
    } else if (tooth.roots === 2) {
      rootPaths = `
        <path d="M -11,0 C -14,${-22*flip} -15,${-38*flip} -11,${-46*flip} C -7,${-44*flip} -4,${-26*flip} -2,0 Z" fill="${rootColor}" stroke="${rootStroke}" stroke-width="1.2"/>
        <path d="M 2,0 C 4,${-26*flip} 7,${-44*flip} 11,${-46*flip} C 15,${-38*flip} 14,${-22*flip} 11,0 Z" fill="${rootColor}" stroke="${rootStroke}" stroke-width="1.2"/>
      `;
      canalPaths = `
        <path d="M -7,0 Q -11,${-24*flip} -10,${-42*flip}" stroke="#EC4899" stroke-width="2.4" fill="none" stroke-linecap="round"/>
        <path d="M 7,0 Q 11,${-24*flip} 10,${-42*flip}" stroke="#EC4899" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      `;
    } else {
      rootPaths = `
        <path d="M -8,0 C -9,${-24*flip} -5,${-44*flip} 0,${-50*flip} C 5,${-44*flip} 9,${-24*flip} 8,0 Z" fill="${rootColor}" stroke="${rootStroke}" stroke-width="1.2"/>
      `;
      canalPaths = `
        <path d="M 0,0 L 0,${-45*flip}" stroke="#EC4899" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      `;
    }

    // Se tiver implante, mostra o parafuso de titânio na raiz
    if (state.hasImplant) {
      const yTop = isUpper ? -44 : 8;
      return `
        <g pointer-events="none">
          ${rootPaths}
          <rect x="-6" y="${yTop}" width="12" height="36" rx="3" fill="#8B5CF6" stroke="#4C1D95" stroke-width="1.3"/>
          <line x1="-6" y1="${yTop+7}" x2="6" y2="${yTop+7}" stroke="#EDE9FE" stroke-width="1.5"/>
          <line x1="-6" y1="${yTop+14}" x2="6" y2="${yTop+14}" stroke="#EDE9FE" stroke-width="1.5"/>
          <line x1="-6" y1="${yTop+21}" x2="6" y2="${yTop+21}" stroke="#EDE9FE" stroke-width="1.5"/>
          <line x1="-6" y1="${yTop+28}" x2="6" y2="${yTop+28}" stroke="#EDE9FE" stroke-width="1.5"/>
        </g>`;
    }

    return `
      <g pointer-events="none" opacity="${state.isMissing ? '0.35' : '1'}">
        ${rootPaths}
        ${state.hasRootCanal ? canalPaths : ''}
      </g>`;
  }

  /**
   * Renderiza a visualização em Boca Aberta (Arcada Completa Anatômica)
   */
  function renderOpenMouthArch() {
    const upperTeeth = archType === 'permanent'
      ? [...PERMANENT_UPPER_RIGHT, ...PERMANENT_UPPER_LEFT]
      : [...DECIDUOUS_UPPER_RIGHT, ...DECIDUOUS_UPPER_LEFT];

    const lowerTeeth = archType === 'permanent'
      ? [...PERMANENT_LOWER_RIGHT, ...PERMANENT_LOWER_LEFT]
      : [...DECIDUOUS_LOWER_RIGHT, ...DECIDUOUS_LOWER_LEFT];

    return `
      <div class="odonto-mouth-stage">
        <svg class="odonto-mouth-svg" viewBox="0 0 860 920" preserveAspectRatio="xMidYMid meet">
          <defs>
            <!-- Gradiente Perolado Realista do Esmalte Dentário -->
            <radialGradient id="enamelGrad" cx="38%" cy="32%" r="68%">
              <stop offset="0%" stop-color="#FFFFFF"/>
              <stop offset="58%" stop-color="#FBF9F5"/>
              <stop offset="100%" stop-color="#E6DFD3"/>
            </radialGradient>

            <!-- Gradiente da Cavidade Bucal Profunda -->
            <radialGradient id="oralCavityGrad" cx="50%" cy="50%" r="52%">
              <stop offset="0%" stop-color="#38121B"/>
              <stop offset="70%" stop-color="#59222E"/>
              <stop offset="100%" stop-color="#7D3242"/>
            </radialGradient>

            <!-- Gradiente Anatômico da Gengiva / Mucosa Alveolar -->
            <linearGradient id="gumUpperGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#F08A95"/>
              <stop offset="50%" stop-color="#E56B79"/>
              <stop offset="100%" stop-color="#C94A5A"/>
            </linearGradient>

            <linearGradient id="gumLowerGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stop-color="#F08A95"/>
              <stop offset="50%" stop-color="#E56B79"/>
              <stop offset="100%" stop-color="#C94A5A"/>
            </linearGradient>

            <!-- Gradiente do Palato Duro -->
            <radialGradient id="palateGrad" cx="50%" cy="65%" r="55%">
              <stop offset="0%" stop-color="#D96B78"/>
              <stop offset="65%" stop-color="#E57A87"/>
              <stop offset="100%" stop-color="#C85262"/>
            </radialGradient>

            <!-- Gradiente da Língua -->
            <radialGradient id="tongueGrad" cx="50%" cy="35%" r="55%">
              <stop offset="0%" stop-color="#E06372"/>
              <stop offset="75%" stop-color="#C94B5B"/>
              <stop offset="100%" stop-color="#9E3140"/>
            </radialGradient>

            <!-- Contorno Labial Externo -->
            <linearGradient id="lipGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#D95B6B"/>
              <stop offset="50%" stop-color="#B93C4C"/>
              <stop offset="100%" stop-color="#CB4D5D"/>
            </linearGradient>
          </defs>

          <!-- Fundo de Quadrantes Clínicos Externos -->
          <g class="odonto-quadrant-labels" pointer-events="none">
            <text x="54" y="64" fill="#64748B" font-size="12" font-weight="700" letter-spacing="0.6">Q${archType === 'permanent' ? '1' : '5'} · SUPERIOR DIREITO</text>
            <text x="806" y="64" text-anchor="end" fill="#64748B" font-size="12" font-weight="700" letter-spacing="0.6">Q${archType === 'permanent' ? '2' : '6'} · SUPERIOR ESQUERDO</text>
            <text x="54" y="875" fill="#64748B" font-size="12" font-weight="700" letter-spacing="0.6">Q${archType === 'permanent' ? '4' : '8'} · INFERIOR DIREITO</text>
            <text x="806" y="875" text-anchor="end" fill="#64748B" font-size="12" font-weight="700" letter-spacing="0.6">Q${archType === 'permanent' ? '3' : '7'} · INFERIOR ESQUERDO</text>
          </g>

          <!-- 1. Contorno Labial Externo (Boca Aberta Anatômica) -->
          <path d="M 105,460
                   C 95,210 230,36 390,42
                   C 410,43 422,52 430,52
                   C 438,52 450,43 470,42
                   C 630,36 765,210 755,460
                   C 765,710 625,882 430,882
                   C 235,882 95,710 105,460 Z"
                fill="url(#lipGrad)" stroke="#9E2F3E" stroke-width="3" opacity="0.92"/>

          <!-- 2. Cavidade Oral Interna -->
          <path d="M 134,460
                   C 126,230 245,62 430,62
                   C 615,62 734,230 726,460
                   C 734,690 615,858 430,858
                   C 245,858 126,690 134,460 Z"
                fill="url(#oralCavityGrad)" stroke="#4A1822" stroke-width="2"/>

          <!-- 3. Abóbada Palatina e Gengiva Maxilar (Arcada Superior) -->
          <path d="M 176,415
                   C 168,225 270,84 430,84
                   C 590,84 692,225 684,415
                   C 655,432 605,432 588,402
                   C 578,265 516,170 430,170
                   C 344,170 282,265 272,402
                   C 255,432 205,432 176,415 Z"
                fill="url(#gumUpperGrad)" stroke="#B83B4A" stroke-width="1.5"/>

          <!-- Palato Duro Central com Rafe e Rugas Palatinas -->
          <path d="M 272,395 C 282,260 344,168 430,168 C 516,168 578,260 588,395 C 520,418 340,418 272,395 Z"
                fill="url(#palateGrad)" opacity="0.88"/>
          <!-- Rafe Palatina Mediana e Rugas Anatômicas -->
          <g stroke="rgba(145, 38, 52, 0.38)" stroke-width="2" fill="none" stroke-linecap="round" pointer-events="none">
            <line x1="430" y1="158" x2="430" y2="395" stroke-dasharray="2,3"/>
            <path d="M 430,205 C 402,200 375,212 355,225"/>
            <path d="M 430,205 C 458,200 485,212 505,225"/>
            <path d="M 430,238 C 395,232 365,246 340,262"/>
            <path d="M 430,238 C 465,232 495,246 520,262"/>
            <path d="M 430,272 C 398,268 368,282 346,296"/>
            <path d="M 430,272 C 462,268 492,282 514,296"/>
          </g>
          <!-- Freio Labial Superior -->
          <path d="M 430,64 L 430,94" stroke="#F49FA8" stroke-width="3.5" stroke-linecap="round" pointer-events="none"/>

          <!-- 4. Gengiva Mandibular e Língua (Arcada Inferior) -->
          <path d="M 180,505
                   C 172,695 272,836 430,836
                   C 588,836 688,695 680,505
                   C 652,488 604,488 586,518
                   C 576,655 514,750 430,750
                   C 346,750 284,655 274,518
                   C 256,488 208,488 180,505 Z"
                fill="url(#gumLowerGrad)" stroke="#B83B4A" stroke-width="1.5"/>

          <!-- Língua Anatômica no Centro Inferior -->
          <path d="M 284,535
                   C 295,660 350,744 430,744
                   C 510,744 565,660 576,535
                   C 535,492 325,492 284,535 Z"
                fill="url(#tongueGrad)" stroke="#8F2836" stroke-width="1.5" opacity="0.92"/>
          <!-- Sulco Mediano da Língua -->
          <path d="M 430,525 L 430,705" stroke="rgba(110, 20, 32, 0.35)" stroke-width="2.5" stroke-linecap="round" pointer-events="none"/>
          <!-- Freio Labial Inferior -->
          <path d="M 430,826 L 430,856" stroke="#F49FA8" stroke-width="3.5" stroke-linecap="round" pointer-events="none"/>

          <!-- 5. Eixo Clínico Divisor de Quadrantes (Linha Média e Plano Oclusal) -->
          <g pointer-events="none" opacity="0.65">
            <line x1="430" y1="30" x2="430" y2="890" stroke="#F8FAFC" stroke-width="1.3" stroke-dasharray="5,5"/>
            <line x1="145" y1="460" x2="715" y2="460" stroke="#F8FAFC" stroke-width="1.3" stroke-dasharray="5,5"/>
            <rect x="372" y="446" width="116" height="28" rx="14" fill="rgba(15, 23, 42, 0.78)" stroke="rgba(255,255,255,0.25)"/>
            <text x="430" y="464" text-anchor="middle" fill="#F8FAFC" font-size="10.5" font-weight="700" letter-spacing="1.2">BOCA ABERTA</text>
            <text x="172" y="464" text-anchor="middle" fill="#FFD1D6" font-size="10" font-weight="700">DIREITO</text>
            <text x="688" y="464" text-anchor="middle" fill="#FFD1D6" font-size="10" font-weight="700">ESQUERDO</text>
          </g>

          <!-- 6. Dentes da Arcada Superior (Maxila) -->
          <g class="odonto-upper-arch">
            ${upperTeeth.map(t => renderArchToothSVG(t)).join('')}
          </g>

          <!-- 7. Dentes da Arcada Inferior (Mandíbula) -->
          <g class="odonto-lower-arch">
            ${lowerTeeth.map(t => renderArchToothSVG(t)).join('')}
          </g>
        </svg>
      </div>
    `;
  }

  /**
   * Renderiza o Modo 2: Carta Clínica Anatômica com Raízes + Coroa + Oclusal
   */
  function renderClinicalChartWithRoots() {
    const upperTeeth = archType === 'permanent'
      ? [...PERMANENT_UPPER_RIGHT, ...PERMANENT_UPPER_LEFT]
      : [...DECIDUOUS_UPPER_RIGHT, ...DECIDUOUS_UPPER_LEFT];

    const lowerTeeth = archType === 'permanent'
      ? [...PERMANENT_LOWER_RIGHT, ...PERMANENT_LOWER_LEFT]
      : [...DECIDUOUS_LOWER_RIGHT, ...DECIDUOUS_LOWER_LEFT];

    const renderRow = (teeth, isUpper) => `
      <div class="odonto-chart-row">
        ${teeth.map((t, idx) => {
          const geom = TOOTH_GEOMETRY[t.type] || TOOTH_GEOMETRY.molar;
          const tData = odontoData[t.num] || {};
          const state = getToothDominantState(tData);
          const isSelected = selectedToothNum === t.num;
          const isMidline = idx === teeth.length / 2 - 1;

          const facesSvg = FACES_LIST.map(faceKey => {
            const condKey = tData[faceKey] || 'healthy';
            const cond = ODONTO_CONDITIONS[condKey] || ODONTO_CONDITIONS.healthy;
            const fillVal = condKey === 'healthy' ? '#FAF8F5' : cond.fill;
            const strokeVal = condKey === 'healthy' ? '#B8B0A0' : cond.stroke;
            return `<path class="odonto-face" d="${geom.faces[faceKey]}" fill="${fillVal}" stroke="${strokeVal}" stroke-width="1.2" data-tooth="${t.num}" data-face="${faceKey}">
              <title>Dente ${t.num} — Face ${getAnatomicalFaceName(t.num, faceKey)}: ${cond.label}</title>
            </path>`;
          }).join('');

          return `
            <div class="odonto-chart-cell ${isSelected ? 'selected' : ''} ${isMidline ? 'midline-right' : ''}" data-select-tooth="${t.num}">
              <div class="odonto-chart-num">${t.num}</div>
              <svg viewBox="-28 ${isUpper ? '-56' : '-26'} 56 82" class="odonto-chart-svg">
                ${renderRootSVG(t, tData, isUpper)}
                <g transform="scale(${t.scale})">
                  <path d="${geom.outline}" fill="#FAF8F5" stroke="#8D8273" stroke-width="1.4"/>
                  ${facesSvg}
                  <path d="${geom.grooves}" fill="none" stroke="rgba(90,76,60,0.4)" stroke-width="1.1" pointer-events="none"/>
                  ${state.isMissing ? `<line x1="-15" y1="-15" x2="15" y2="15" stroke="#EF4444" stroke-width="3" pointer-events="none"/><line x1="15" y1="-15" x2="-15" y2="15" stroke="#EF4444" stroke-width="3" pointer-events="none"/>` : ''}
                </g>
              </svg>
            </div>
          `;
        }).join('')}
      </div>
    `;

    return `
      <div class="odonto-chart-stage">
        <div class="odonto-chart-label">ARCADA SUPERIOR (MAXILA — RAÍZES E FACE OCLUSAL)</div>
        ${renderRow(upperTeeth, true)}
        <div class="odonto-chart-divider"><span>PLANO OCLUSAL</span></div>
        ${renderRow(lowerTeeth, false)}
        <div class="odonto-chart-label">ARCADA INFERIOR (MANDÍBULA — FACE OCLUSAL E RAÍZES)</div>
      </div>
    `;
  }

  /**
   * Renderiza o Painel Inspetor Lateral do Dente Selecionado
   */
  function renderInspectorPanel() {
    const tooth = ALL_TEETH_MAP.get(selectedToothNum) || PERMANENT_UPPER_RIGHT[2];
    const geom = TOOTH_GEOMETRY[tooth.type] || TOOTH_GEOMETRY.molar;
    const tData = odontoData[tooth.num] || {};
    const state = getToothDominantState(tData);
    const quadrant = Math.floor(tooth.num / 10);
    const isUpper = quadrant === 1 || quadrant === 2 || quadrant === 5 || quadrant === 6;

    const facesSvg = FACES_LIST.map(faceKey => {
      const condKey = tData[faceKey] || 'healthy';
      const cond = ODONTO_CONDITIONS[condKey] || ODONTO_CONDITIONS.healthy;
      const fillVal = condKey === 'healthy' ? '#FAF8F5' : cond.fill;
      const strokeVal = condKey === 'healthy' ? '#94A3B8' : cond.stroke;
      return `<path class="odonto-face" d="${geom.faces[faceKey]}" fill="${fillVal}" stroke="${strokeVal}" stroke-width="1.3" data-tooth="${tooth.num}" data-face="${faceKey}"/>`;
    }).join('');

    return `
      <div class="odonto-inspector">
        <div class="odonto-inspector-header">
          <div class="odonto-inspector-badge">${tooth.num}</div>
          <div>
            <h5 class="odonto-inspector-title">${tooth.name}</h5>
            <span class="odonto-inspector-sub">${quadrant <= 4 ? 'Dentição Permanente' : 'Dentição Decídua'} · ${tooth.roots} ${tooth.roots > 1 ? 'raízes' : 'raiz'}</span>
          </div>
        </div>

        <!-- Visualização Ampliada Interativa do Dente (Raiz + Coroa 5 Faces) -->
        <div class="odonto-inspector-preview">
          <div class="odonto-inspector-compass">
            <span class="compass-top">${getAnatomicalFaceName(tooth.num, 'top')}</span>
            <div class="compass-middle">
              <span class="compass-side">${getAnatomicalFaceName(tooth.num, 'left')}</span>
              <svg viewBox="-34 -56 68 88" class="odonto-inspector-svg">
                ${renderRootSVG(tooth, tData, true)}
                <g transform="scale(1.12)">
                  <path d="${geom.outline}" fill="#FAF8F5" stroke="#64748B" stroke-width="1.5"/>
                  ${facesSvg}
                  <path d="${geom.grooves}" fill="none" stroke="rgba(90,76,60,0.45)" stroke-width="1.1" pointer-events="none"/>
                  ${state.isMissing ? `<line x1="-15" y1="-15" x2="15" y2="15" stroke="#EF4444" stroke-width="3" pointer-events="none"/><line x1="15" y1="-15" x2="-15" y2="15" stroke="#EF4444" stroke-width="3" pointer-events="none"/>` : ''}
                </g>
              </svg>
              <span class="compass-side">${getAnatomicalFaceName(tooth.num, 'right')}</span>
            </div>
            <span class="compass-bottom">${getAnatomicalFaceName(tooth.num, 'bottom')}</span>
          </div>
        </div>

        <!-- Ações Rápidas para o Dente Inteiro -->
        <div class="odonto-inspector-quick">
          <button type="button" class="btn btn-sm btn-primary" id="odontoApplyWholeToothBtn" style="flex:1">
            Aplicar "${ODONTO_CONDITIONS[selectedCondition].label}" no Dente ${tooth.num}
          </button>
          <button type="button" class="btn btn-sm btn-secondary" id="odontoClearToothBtn" title="Restaurar dente para saudável">
            Limpar
          </button>
        </div>

        <!-- Lista Detalhada das 5 Faces Anatômicas -->
        <div class="odonto-inspector-faces">
          <div class="odonto-inspector-section-title">Estado por Face Anatômica</div>
          ${FACES_LIST.map(faceKey => {
            const condKey = tData[faceKey] || 'healthy';
            const cond = ODONTO_CONDITIONS[condKey] || ODONTO_CONDITIONS.healthy;
            const faceName = getAnatomicalFaceName(tooth.num, faceKey);
            return `
              <div class="odonto-face-row" data-inspector-face="${faceKey}">
                <span class="odonto-face-name">${faceName}</span>
                <span class="odonto-face-badge" style="background:${cond.badgeBg};color:${cond.badgeText};border:1px solid ${cond.color}40">
                  <span class="odonto-dot" style="background:${cond.color}"></span>
                  ${cond.label}
                </span>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Observações Clínicas do Dente -->
        <div class="odonto-inspector-notes">
          <label class="odonto-inspector-section-title" for="odontoToothNoteInput">Anotação Clínica (Dente ${tooth.num})</label>
          <textarea id="odontoToothNoteInput" rows="2" placeholder="Ex: Cárie profunda mesial, sensibilidade térmica...">${escapeHTML(tData.notes || '')}</textarea>
          <button type="button" class="btn btn-sm btn-secondary" id="odontoSaveNoteBtn" style="width:100%;margin-top:6px">
            Salvar Anotação do Dente ${tooth.num}
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza o Resumo Clínico de todos os dentes com procedimentos/achados
   */
  function renderClinicalSummary() {
    const entries = Object.entries(odontoData)
      .map(([numStr, data]) => ({ num: parseInt(numStr, 10), data }))
      .filter(({ num, data }) => !isNaN(num) && getToothDominantState(data).hasAny)
      .sort((a, b) => a.num - b.num);

    if (entries.length === 0) {
      return `
        <div class="odonto-summary-empty">
          Todos os elementos dentários encontram-se marcados como <strong>Saudáveis</strong>. Clique em qualquer face dentária na boca aberta para registrar achados ou procedimentos.
        </div>`;
    }

    return `
      <div class="odonto-summary-grid">
        ${entries.map(({ num, data }) => {
          const toothInfo = ALL_TEETH_MAP.get(num);
          const state = getToothDominantState(data);
          const activeFaces = FACES_LIST
            .filter(f => data[f] && data[f] !== 'healthy')
            .map(f => {
              const c = ODONTO_CONDITIONS[data[f]] || ODONTO_CONDITIONS.healthy;
              return `<span class="odonto-summary-tag" style="background:${c.badgeBg};color:${c.badgeText}">${getAnatomicalFaceName(num, f)}: ${c.label}</span>`;
            });

          return `
            <div class="odonto-summary-item ${selectedToothNum === num ? 'active' : ''}" data-select-tooth="${num}">
              <div class="odonto-summary-item-head">
                <span class="odonto-summary-tooth-num">Dente ${num}</span>
                <span class="odonto-summary-tooth-name">${toothInfo ? toothInfo.name : ''}</span>
              </div>
              <div class="odonto-summary-tags">
                ${state.isMissing
                  ? `<span class="odonto-summary-tag" style="background:${ODONTO_CONDITIONS.missing.badgeBg};color:${ODONTO_CONDITIONS.missing.badgeText}">Dente Ausente / Extraído</span>`
                  : activeFaces.join('')}
              </div>
              ${data.notes ? `<div class="odonto-summary-note">📝 ${escapeHTML(data.notes)}</div>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function render() {
    container.innerHTML = `
      <div class="card odonto-pro-card">
        <!-- Barra Superior de Controles e Modos -->
        <div class="odonto-pro-header">
          <div>
            <h4 class="odonto-pro-title">Odontograma Anatômico</h4>
            <p class="odonto-pro-subtitle">Selecione a condição clínica abaixo e clique na face exata do dente ou no número FDI</p>
          </div>
          <div class="odonto-pro-toggles">
            <!-- Alternador de Visualização: Boca Aberta vs Carta com Raízes -->
            <div class="odonto-segmented">
              <button type="button" class="odonto-seg-btn ${viewMode === 'mouth' ? 'active' : ''}" data-view-mode="mouth">
                👄 Boca Aberta (Arcada)
              </button>
              <button type="button" class="odonto-seg-btn ${viewMode === 'chart' ? 'active' : ''}" data-view-mode="chart">
                🦷 Mapa com Raízes
              </button>
            </div>
            <!-- Alternador de Dentição: Permanente vs Decídua -->
            <div class="odonto-segmented">
              <button type="button" class="odonto-seg-btn ${archType === 'permanent' ? 'active' : ''}" data-arch-type="permanent">
                Adulto (32)
              </button>
              <button type="button" class="odonto-seg-btn ${archType === 'deciduous' ? 'active' : ''}" data-arch-type="deciduous">
                Infantil (20)
              </button>
            </div>
          </div>
        </div>

        <!-- Paleta de Condições Clínicas + Modo de Aplicação -->
        <div class="odonto-palette-bar">
          <div class="odonto-conditions-list">
            ${Object.values(ODONTO_CONDITIONS).map(c => `
              <button type="button"
                      class="odonto-cond-btn ${selectedCondition === c.key ? 'active' : ''}"
                      data-cond="${c.key}"
                      style="--cond-color:${c.color};--cond-bg:${c.badgeBg}"
                      title="${c.desc}">
                <span class="odonto-cond-swatch" style="background:${c.color}"></span>
                <span>${c.label}</span>
              </button>
            `).join('')}
          </div>

          <div class="odonto-apply-mode">
            <span class="odonto-apply-label">Modo de clique:</span>
            <button type="button" class="odonto-mode-pill ${applyMode === 'face' ? 'active' : ''}" data-apply-mode="face">
              Por Face (5 faces)
            </button>
            <button type="button" class="odonto-mode-pill ${applyMode === 'tooth' ? 'active' : ''}" data-apply-mode="tooth">
              Dente Inteiro
            </button>
          </div>
        </div>

        <!-- Layout Principal: Palco da Boca Aberta + Inspetor Lateral do Dente -->
        <div class="odonto-workspace">
          <div class="odonto-stage-col">
            ${viewMode === 'mouth' ? renderOpenMouthArch() : renderClinicalChartWithRoots()}
          </div>
          <div class="odonto-inspector-col">
            ${renderInspectorPanel()}
          </div>
        </div>

        <!-- Resumo Clínico de Achados e Procedimentos no Odontograma -->
        <div class="odonto-summary-section">
          <div class="odonto-summary-header">
            <h5>Resumo Clínico do Odontograma</h5>
          </div>
          ${renderClinicalSummary()}
        </div>
      </div>
    `;

    // Eventos: Seletor de condição
    container.querySelectorAll('[data-cond]').forEach(btn => {
      btn.onclick = () => {
        selectedCondition = btn.dataset.cond;
        // Se escolher Ausente ou Implante, sugere modo Dente Inteiro automaticamente para agilizar, mas permite alternar
        if (selectedCondition === 'missing' || selectedCondition === 'implant') {
          applyMode = 'tooth';
        }
        render();
      };
    });

    // Eventos: Modo de aplicação (Por Face vs Dente Inteiro)
    container.querySelectorAll('[data-apply-mode]').forEach(btn => {
      btn.onclick = () => {
        applyMode = btn.dataset.applyMode;
        render();
      };
    });

    // Eventos: Modo de visualização (Boca Aberta vs Carta com Raízes)
    container.querySelectorAll('[data-view-mode]').forEach(btn => {
      btn.onclick = () => {
        viewMode = btn.dataset.viewMode;
        render();
      };
    });

    // Eventos: Dentição Adulto vs Infantil
    container.querySelectorAll('[data-arch-type]').forEach(btn => {
      btn.onclick = () => {
        archType = btn.dataset.archType;
        selectedToothNum = archType === 'permanent' ? 16 : 55;
        render();
      };
    });

    // Eventos: Clique em uma face anatômica do dente (no palco ou no inspetor)
    container.querySelectorAll('.odonto-face').forEach(pathEl => {
      pathEl.onclick = (e) => {
        e.stopPropagation();
        const toothNum = parseInt(pathEl.dataset.tooth, 10);
        const faceKey = pathEl.dataset.face;
        applyConditionToTooth(toothNum, faceKey);
      };
    });

    // Eventos: Clique no número FDI ou no card de resumo para inspecionar o dente
    container.querySelectorAll('[data-select-tooth]').forEach(el => {
      el.onclick = (e) => {
        // Se clicou diretamente em uma face dentro do card, o stopPropagation acima já tratou
        const num = parseInt(el.dataset.selectTooth, 10);
        if (!isNaN(num)) {
          selectedToothNum = num;
          render();
        }
      };
    });

    // Eventos: Clique nas linhas de face dentro do Inspetor Lateral
    container.querySelectorAll('[data-inspector-face]').forEach(row => {
      row.onclick = () => {
        const faceKey = row.dataset.inspectorFace;
        if (!odontoData[selectedToothNum]) odontoData[selectedToothNum] = {};
        const curr = odontoData[selectedToothNum][faceKey] || 'healthy';
        odontoData[selectedToothNum][faceKey] = curr === selectedCondition ? 'healthy' : selectedCondition;
        saveOdontogram(patientId, odontoData);
        render();
      };
    });

    // Eventos: Aplicar no dente inteiro / Limpar dente no Inspetor
    const applyWholeBtn = container.querySelector('#odontoApplyWholeToothBtn');
    if (applyWholeBtn) {
      applyWholeBtn.onclick = () => {
        if (!odontoData[selectedToothNum]) odontoData[selectedToothNum] = {};
        FACES_LIST.forEach(f => { odontoData[selectedToothNum][f] = selectedCondition; });
        saveOdontogram(patientId, odontoData);
        toast.success(`Dente ${selectedToothNum} marcado como ${ODONTO_CONDITIONS[selectedCondition].label}`);
        render();
      };
    }

    const clearToothBtn = container.querySelector('#odontoClearToothBtn');
    if (clearToothBtn) {
      clearToothBtn.onclick = () => {
        if (odontoData[selectedToothNum]) {
          const notes = odontoData[selectedToothNum].notes || '';
          odontoData[selectedToothNum] = notes ? { notes } : {};
          if (!notes) delete odontoData[selectedToothNum];
          saveOdontogram(patientId, odontoData);
          toast.info(`Dente ${selectedToothNum} restaurado para Saudável`);
          render();
        }
      };
    }

    // Eventos: Salvar anotação clínica do dente selecionado
    const saveNoteBtn = container.querySelector('#odontoSaveNoteBtn');
    if (saveNoteBtn) {
      saveNoteBtn.onclick = () => {
        const noteInput = container.querySelector('#odontoToothNoteInput');
        const val = noteInput ? noteInput.value.trim() : '';
        if (!odontoData[selectedToothNum]) odontoData[selectedToothNum] = {};
        odontoData[selectedToothNum].notes = val;
        saveOdontogram(patientId, odontoData);
        toast.success(`Anotação do dente ${selectedToothNum} salva!`);
        render();
      };
    }
  }

  render();
}

