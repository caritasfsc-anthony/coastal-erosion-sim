// Learning content + where/when each landform exists — generic coastal teaching sample.
import * as THREE from 'three';
import {
  H, HX, NECK_Z0, NECK_Z1, SEGMENTS, TOMB_X, beachWidth, caveParams, caveZ,
  geoParams, geoX, headHalfWidth, headTop, phase, southCliff, southCoast0,
  retreat, stackGeom, tomboloCrest,
} from './world';

export type LandformId = 'cliff' | 'platform' | 'geo' | 'cave' | 'arch' | 'stack' | 'stump' | 'beach' | 'tombolo';

export interface Landform {
  id: LandformId;
  zh: string;
  en: string;
  tag: string;
  short: string;
  steps: string[];
  processes: string[];
  sequence: string;
  example?: string;
  bestStage: number;
  view: [number, number, number];
  bonus?: boolean;
  quiz: string;
}

export const LANDFORMS: Landform[] = [
  {
    id: 'cliff', zh: '海崖', en: 'Sea Cliff', tag: '侵蝕地貌',
    short: '浪先在崖腳蝕出「海蝕凹地」，凹地頂部崩塌後形成陡峭岩壁；海崖不斷向陸後退。',
    steps: [
      '原本岩岸較為和緩（原本的坡面）。破壞性海浪在高潮位附近衝擊崖腳。',
      '水力作用與磨蝕作用蝕出「海蝕凹地」（wave-cut notch），凹地愈蝕愈深。',
      '海蝕凹地的頂部因失去支撐而崩塌，形成陡峭的海崖。',
      '「凹地 → 崩塌」反覆進行，海崖向陸地後退，崖腳留下愈來愈闊的浪蝕平台。',
    ],
    processes: ['水力作用', '磨蝕作用', '風化及塊體移動'],
    sequence: '原本坡面 → 海蝕凹地加深 → 崩塌 → 海崖後退／浪蝕平台變闊',
    example: '香港常見於岩岸南岸／外島（例如西貢東部、東平洲）。',
    bestStage: 0.18, view: [58, 10, -125],
    quiz: '由崖腳的海蝕凹地不斷擴大、上方岩石崩塌而形成的陡峭岩壁是？',
  },
  {
    id: 'platform', zh: '浪蝕平台', en: 'Wave-cut Platform', tag: '侵蝕地貌',
    short: '海崖後退後，波浪沖走崩塌岩屑，在崖腳留下平坦、略向海傾的岩石台地；後退愈多，平台愈闊。',
    steps: [
      '海崖因持續受蝕而向陸地後退（對照原本較前的坡面）。',
      '波浪沖走崩塌了的岩屑，潮間帶高度的基岩被留下，形成平緩平台。',
      '平台在低潮時露出水面；海崖愈後退，浪蝕平台愈闊。',
      '平台愈闊，波浪到達崖腳前已消耗較多能量，後退速度因而減慢。',
    ],
    processes: ['磨蝕作用', '水力作用'],
    sequence: '是「海崖後退」留下的證據；海蝕柱和殘柱最後亦會被削平成平台的一部分。',
    example: '香港岩岸常見；後退愈多，平台愈闊。',
    bestStage: 0.88, view: [48, 12, -95],
    quiz: '低潮時露出水面、由海崖後退後遺留的平緩岩石台地是？',
  },
  {
    id: 'geo', zh: '海蝕隙', en: 'Geo / Cleft', tag: '侵蝕地貌',
    short: '海浪沿岩石的節理或斷層侵蝕，形成狹長而深入陸地的裂隙。',
    steps: [
      '岩石中的節理、斷層是較脆弱的部分。',
      '海浪湧入裂縫時把空氣壓縮，退浪時壓力驟降——反覆的「水力作用」令裂縫擴闊。',
      '海浪挾帶的砂石進一步磨蝕裂縫兩壁，裂隙不斷加深、伸入陸地。',
      '若海蝕洞頂部崩塌，亦可形成海蝕隙（有時先出現噴水洞）。',
    ],
    processes: ['水力作用', '磨蝕作用'],
    sequence: '與海蝕洞同樣沿「弱點」發展，代表海崖上的線狀差異侵蝕。',
    example: '香港多處節理發達的岩岸可見。',
    bestStage: 0.7, view: [12, 36, 38],
    quiz: '海浪沿節理不斷侵蝕，形成狹長、深入陸地的裂隙是？',
  },
  {
    id: 'cave', zh: '海蝕洞', en: 'Sea Cave', tag: '侵蝕地貌',
    short: '海浪沿岬角的節理、斷層等弱點侵蝕而成的洞穴。本模擬置於東北教學岩岬。',
    steps: [
      '岬角三面環海，波浪折射令能量集中在岬角兩側。',
      '海浪沿岬角上的節理或斷層進行水力作用及磨蝕作用。',
      '裂縫被擴闊、加深，在崖腳附近形成洞穴——海蝕洞。',
      '洞穴繼續向岬角內部伸延。',
    ],
    processes: ['水力作用', '磨蝕作用', '溶蝕作用'],
    sequence: '海崖 → 【海蝕洞】 → 海蝕拱 → 海蝕柱 → 海蝕殘柱',
    example: '教學示意；可對照西貢果洲群島等地。',
    bestStage: 0.3, view: [38, 8, 22],
    quiz: '海浪沿岬角的節理及斷層侵蝕，在崖腳形成的洞穴是？',
  },
  {
    id: 'arch', zh: '海蝕拱', en: 'Sea Arch', tag: '侵蝕地貌',
    short: '岬角兩側的海蝕洞互相貫通，形成拱門狀的通道。',
    steps: [
      '岬角兩側的海蝕洞不斷向內伸延。',
      '兩個海蝕洞最終貫通（或一個洞蝕穿整個岬角）。',
      '形成一條海水可以穿過的拱形通道——海蝕拱。',
      '拱底持續被侵蝕擴大，拱頂變得愈來愈薄。',
    ],
    processes: ['水力作用', '磨蝕作用'],
    sequence: '海崖 → 海蝕洞 → 【海蝕拱】 → 海蝕柱 → 海蝕殘柱',
    example: '教學序列示意；可對照西貢吊鐘洲等地。',
    bestStage: 0.5, view: [42, 12, 28],
    quiz: '岬角兩側的海蝕洞貫通後形成的拱門狀地貌是？',
  },
  {
    id: 'stack', zh: '海蝕柱', en: 'Sea Stack', tag: '侵蝕地貌',
    short: '海蝕拱頂崩塌後，與陸地分離而孤立於海中的岩柱。',
    steps: [
      '海蝕拱的拱頂愈來愈薄，加上風化作用削弱岩石。',
      '拱頂最終承受不住自身重量而崩塌。',
      '向海一側的岩石與岬角分離，孤立於海中，成為海蝕柱。',
    ],
    processes: ['水力作用', '磨蝕作用', '風化作用'],
    sequence: '海崖 → 海蝕洞 → 海蝕拱 → 【海蝕柱】 → 海蝕殘柱',
    example: '教學序列示意；可對照西貢破邊洲等地。',
    bestStage: 0.75, view: [40, 16, 36],
    quiz: '海蝕拱的拱頂崩塌後，遺下孤立於海中的岩柱是？',
  },
  {
    id: 'stump', zh: '海蝕殘柱', en: 'Stump', tag: '延伸', bonus: true,
    short: '海蝕柱底部被蝕斷倒塌後，只剩下的低矮岩墩。',
    steps: [
      '海浪在海蝕柱底部蝕出海蝕凹地。',
      '凹地擴大，海蝕柱最終倒塌。',
      '只剩下低矮的殘柱，高潮時可能被海水淹沒，成為浪蝕平台的一部分。',
    ],
    processes: ['水力作用', '磨蝕作用'],
    sequence: '海崖 → 海蝕洞 → 海蝕拱 → 海蝕柱 → 【海蝕殘柱】',
    example: '教學序列的最終階段。',
    bestStage: 1.0, view: [32, 14, 32],
    quiz: '海蝕柱倒塌後剩下、高潮時或會被淹沒的低矮岩墩是？',
  },
  {
    id: 'beach', zh: '海灘', en: 'Beach', tag: '沉積地貌',
    short: '海灣內波浪能量較低，沙粒被沉積在灣頭而成的海灘。本模擬海灘位於連島沙洲東側。',
    steps: [
      '海浪在岬角處折射，能量集中於岬角，海灣內能量分散。',
      '海灣成為低能量環境，以建設性海浪為主（進流強、回流弱）。',
      '侵蝕得來的沙粒及卵石被搬運到灣頭沉積。',
      '沉積物不斷累積，海灘逐漸變闊，呈新月形。',
    ],
    processes: ['波浪折射', '沿岸漂移', '沉積作用'],
    sequence: '岩岸被侵蝕的物料成為海灘的來源——「岬角受蝕、海灣沉積」。',
    example: '香港多處海灣可見；本模擬置於連島沙洲東側作示意。',
    bestStage: 0.65, view: [55, 28, 20],
    quiz: '在海灣低能量環境中，沙粒被建設性海浪沉積而成的是？',
  },
  {
    id: 'tombolo', zh: '連島沙洲', en: 'Tombolo', tag: '沉積地貌',
    short: '起初南北是兩個完全分開的島；泥沙在島間掩蔽區堆積，先成水下沙洲，再露出水面，把兩島連成啞鈴形。',
    steps: [
      '起初南北是兩座完全獨立的島，中間是開闊水道。',
      '海浪繞過兩島發生折射，島與島之間成為波浪能量較低的掩蔽區。',
      '沿岸漂移帶來的泥沙在水道中堆積，先形成低潮可見的水下沙洲。',
      '沙洲繼續增高並露出水面，把兩島連接成啞鈴形。轉「海浪方向」可睇邊岸受浪較強（沙洲位置保持穩定）。',
    ],
    processes: ['波浪折射', '沿岸漂移', '沉積作用'],
    sequence: '由侵蝕得來的沉積物，在兩島之間的掩蔽區重新堆積；東側常伴生灣頭海灘。',
    example: '經典連島沙洲：兩島＋中央沙洲（本模擬為簡化教學樣本）。',
    bestStage: 0.92, view: [110, 85, 10],
    quiz: '起初分開的兩島之間，泥沙堆積並露出水面、把兩島連接起來的沙洲是？',
  },
];

export const byId = (id: LandformId) => LANDFORMS.find((l) => l.id === id)!;

export function geoFrame(s: number, shift = 0, raise = 0): { pos: THREE.Vector3; target: THREE.Vector3 } {
  const G = geoParams(s);
  const zc = G.clG - G.L * 0.55 - 4;
  const target = new THREE.Vector3(geoX(zc), 12, zc);
  const dist = Math.min(108, Math.max(64, 60 + G.L * 1.45));
  // look into the cleft from seaward (+Z) and above
  const dir = new THREE.Vector3(0.12, 0.82, 0.55).normalize();
  const pos = target.clone().addScaledVector(dir, dist);
  const side = new THREE.Vector3(1, 0, -0.15).normalize().multiplyScalar(dist * shift).add(new THREE.Vector3(0, 0, dist * raise));
  return { pos: pos.add(side), target: target.add(side) };
}

export interface LandformState { present: boolean; pos: THREE.Vector3; note: string; }

function segIn(s: number, lo: number, hi: number, ideal: number): number {
  let best = -1, bd = Infinity;
  for (let k = 0; k < SEGMENTS.length; k++) {
    const p = phase(s, k);
    if (p >= lo && p <= hi && Math.abs(p - ideal) < bd) { bd = Math.abs(p - ideal); best = k; }
  }
  return best;
}

export function landformState(id: LandformId, s: number, out = new THREE.Vector3()): LandformState {
  switch (id) {
    case 'cliff': {
      const x = 18;
      const cl = southCliff(x, s);
      const R = Math.round(retreat(s));
      let note: string;
      let y = H * 0.55;
      if (s < 0.08) {
        note = '第①步：原本的坡面——岩岸仍較和緩，浪開始衝擊崖腳';
        y = H * 0.35;
      } else if (s < 0.23) {
        note = '第②步：海蝕凹地加深——潮間帶崖腳被掏空（wave-cut notch）';
        y = 2.4; // pin at waterline notch
        return { present: true, pos: out.set(x, y, cl + 0.6), note };
      } else if (s < 0.30) {
        note = `第③步：海蝕凹地頂部崩塌 · 已後退約 ${R} 米（示意）`;
        y = H * 0.45;
      } else {
        note = `第④步：陡峭海崖成形 · 岸線已後退約 ${R} 米，崖腳平台擴闊中（示意）`;
      }
      return { present: true, pos: out.set(x, y, cl + 1.2), note };
    }
    case 'platform': {
      const x = 22;
      const cl = southCliff(x, s);
      const c0 = southCoast0(x);
      const platPhase = s < 0.14 ? 0 : Math.min(1, (s - 0.14) / 0.86);
      // smoothstep approx for note readout
      const t = platPhase * platPhase * (3 - 2 * platPhase);
      const w = Math.max(2, c0 - cl) + 2 + 30 * t;
      return {
        present: s > 0.08,
        pos: out.set(x, 1.4, cl - Math.max(5, w * 0.4)),
        note: s < 0.14
          ? '凹地／崩塌初期：浪蝕平台仍很窄'
          : `波浪沖走岩屑後留下平台 · 現闊約 ${Math.round(w)} 米，隨海崖後退而擴闊`,
      };
    }
    case 'geo': {
      const G = geoParams(s);
      const z = G.clG - G.L * 0.4;
      return {
        present: s > 0.1, pos: out.set(geoX(z), 7, z),
        note: s > 0.1 ? `北岸：沿節理深入約 ${Math.round(G.L)} 米${G.blow ? '，盡頭仍有海蝕洞及噴水洞' : ''}` : '浪正沿節理蝕出狹窄裂縫',
      };
    }
    case 'cave': {
      // Prefer earliest teaching segment still in cave phase — stable Z per segment
      const k = segIn(s, 0.12, 0.4, 0.3);
      if (k < 0) return { present: false, pos: out.set(HX + 14, 4, caveZ(0)), note: '目前沒有發育中的海蝕洞' };
      const zc = caveZ(k), w = headHalfWidth(zc);
      const cv = caveParams(phase(s, k), w);
      // Offset label east of mouth so it does not stack on arch/stack
      return { present: true, pos: out.set(HX + w + 3.5, Math.max(2.5, cv.ry * 0.55), zc), note: '東北教學岩岬' };
    }
    case 'arch': {
      const k = segIn(s, 0.4, 0.57, 0.5);
      if (k < 0) return { present: false, pos: out.set(HX - 6, 14, caveZ(1)), note: '海蝕洞尚未貫通／拱頂已崩塌' };
      const zc = caveZ(k), w = headHalfWidth(zc);
      const cv = caveParams(phase(s, k), w);
      // Raise / offset west so label clears cave & stack
      return { present: true, pos: out.set(HX - w * 0.2, cv.ry * 1.15 + 3.5, zc), note: '東北教學岩岬' };
    }
    case 'stack': {
      // Always the first (outermost) teaching segment — fixed world coords, never teleports
      const k = 0;
      const p = phase(s, k);
      const st = stackGeom(k, Math.max(p, 0.7));
      if (p < 0.64) return { present: false, pos: out.set(HX, headTop(HX, st.zs) + 1.5, st.zs), note: '海蝕拱尚未崩塌' };
      return { present: true, pos: out.set(HX, headTop(HX, st.zs) + 2.2, st.zs), note: '孤立於海中（離岸可見空隙）' };
    }
    case 'stump': {
      const k = 0;
      const p = phase(s, k);
      const st = stackGeom(k, 1);
      if (p < 0.9) return { present: false, pos: out.set(HX, 3.2, st.zs), note: '海蝕柱仍然屹立' };
      return { present: true, pos: out.set(HX, 3.2, st.zs), note: '' };
    }
    case 'beach': {
      // Anchored east of tombolo — does not slide with beachWidth / wave dir
      const z = (NECK_Z0 + NECK_Z1) * 0.38;
      const bw = beachWidth(s);
      return {
        present: s > 0.32 && bw > 6,
        pos: out.set(TOMB_X + 22, 2.2, z),
        note: s > 0.32 ? `灣頭灘面闊約 ${Math.round(bw)} 米（示意）` : '沙洲尚未成形，灣頭海灘仍未出現',
      };
    }
    case 'tombolo': {
      const c = tomboloCrest(s);
      // Mid-channel fixed anchor
      const z = (NECK_Z0 + NECK_Z1) * 0.55;
      let note: string;
      if (c < -3.2) note = '初期：南北兩島完全分開，中間是開闊水道';
      else if (c < -0.6) note = '中期：水下沙洲正在堆積，低潮時隱約可見';
      else if (c < 0.6) note = '沙洲接近露出水面，兩島快將相連';
      else note = '後期：連島沙洲已露出，南北兩島連成啞鈴形';
      return {
        present: true, pos: out.set(TOMB_X, Math.max(1.4, c + 1.8), z),
        note,
      };
    }
  }
}

export function stageWhenPresent(id: LandformId): number {
  return byId(id).bestStage;
}

export const SEQUENCE: LandformId[] = ['cliff', 'cave', 'arch', 'stack', 'stump'];

export const PROCESSES = [
  { zh: '水力作用', en: 'Hydraulic action', d: '海浪衝擊岩石，把空氣壓入裂縫；退浪時壓力驟降，反覆令裂縫擴大、岩石碎裂。' },
  { zh: '磨蝕作用', en: 'Abrasion', d: '海浪挾帶砂石、卵石撞擊及摩擦岩岸，像砂紙一樣把岩石磨去。' },
  { zh: '溶蝕作用', en: 'Solution', d: '海水中的弱酸溶解石灰岩等可溶性岩石。' },
  { zh: '磨損作用', en: 'Attrition', d: '被搬運的石塊互相碰撞，變得愈來愈細、愈來愈圓滑。' },
];
