// Learning content + where/when each landform exists — Cheung Chau (長洲) teaching model.
import * as THREE from 'three';
import {
  H, HX, NECK_Z0, NECK_Z1, SEGMENTS, TOMB_X, beachWidth, caveParams, caveZ,
  geoParams, geoX, headHalfWidth, headTop, phase, southCliff, southCoast0,
  stackGeom, tomboloCrest,
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
    short: '海浪在岩岸底部不斷侵蝕，令上方岩石崩塌而形成的陡峭岩壁。長洲南氹岸可見典型海崖。',
    steps: [
      '破壞性海浪在高潮位附近衝擊岩岸底部。',
      '水力作用與磨蝕作用在崖腳蝕出「浪蝕凹壁」（wave-cut notch）。',
      '凹壁愈蝕愈深，上方岩石失去支撐而崩塌，形成陡峭的海崖。',
      '「侵蝕 → 凹壁 → 崩塌」不斷重複，海崖逐漸向陸地後退。',
    ],
    processes: ['水力作用', '磨蝕作用', '風化及塊體移動'],
    sequence: '海崖後退時會在崖腳留下浪蝕平台；岬角上的海崖沿弱點發展成海蝕洞。',
    example: '長洲南氹（Nam Tam）南岸；亦可對照西貢東部、東平洲。',
    bestStage: 0.28, view: [38, 22, -48],
    quiz: '由崖腳的浪蝕凹壁不斷擴大、上方岩石崩塌而形成的陡峭岩壁是？',
  },
  {
    id: 'platform', zh: '浪蝕平台', en: 'Wave-cut Platform', tag: '侵蝕地貌',
    short: '海崖後退後，在崖腳留下的一片平坦、略向海傾的岩石台地。南氹岸可見清晰平台與凹壁對比。',
    steps: [
      '海崖受浪蝕而不斷後退。',
      '原本位於崖腳、潮間帶高度的岩石被留下，形成平緩、略向海傾斜的平台。',
      '平台在低潮時露出水面，表面常見潮池與海藻。',
      '平台愈闊，波浪在到達崖腳前消耗愈多能量，海崖後退速度因而減慢。',
    ],
    processes: ['磨蝕作用', '水力作用'],
    sequence: '是「海崖後退」留下的證據；海蝕柱和殘柱最後亦會被削平成平台的一部分。',
    example: '長洲南氹浪蝕平台；東南岸饅頭石附近的石台。',
    bestStage: 0.85, view: [42, 20, -58],
    quiz: '低潮時露出水面、由海崖後退後遺留的平緩岩石台地是？',
  },
  {
    id: 'geo', zh: '海蝕隙', en: 'Geo / Cleft', tag: '侵蝕地貌',
    short: '海浪沿岩石的節理或斷層侵蝕，形成狹長而深入陸地的裂隙。長洲北岸多處可見。',
    steps: [
      '岩石中的節理、斷層是較脆弱的部分。',
      '海浪湧入裂縫時把空氣壓縮，退浪時壓力驟降——反覆的「水力作用」令裂縫擴闊。',
      '海浪挾帶的砂石進一步磨蝕裂縫兩壁，裂隙不斷加深、伸入陸地。',
      '若海蝕洞頂部崩塌，亦可形成海蝕隙（有時先出現噴水洞）。',
    ],
    processes: ['水力作用', '磨蝕作用'],
    sequence: '與海蝕洞同樣沿「弱點」發展，代表海崖上的線狀差異侵蝕。',
    example: '長洲北岸岩岸的多條海蝕隙（見 3d.map.gov.hk 北岸）。',
    bestStage: 0.7, view: [12, 36, 38],
    quiz: '海浪沿節理不斷侵蝕，形成狹長、深入陸地的裂隙是？',
  },
  {
    id: 'cave', zh: '海蝕洞', en: 'Sea Cave', tag: '侵蝕地貌',
    short: '海浪沿岬角的節理、斷層等弱點侵蝕而成的洞穴。本模擬置於長洲東北岩岬。',
    steps: [
      '岬角三面環海，波浪折射令能量集中在岬角兩側。',
      '海浪沿岬角上的節理或斷層進行水力作用及磨蝕作用。',
      '裂縫被擴闊、加深，在崖腳附近形成洞穴——海蝕洞。',
      '洞穴繼續向岬角內部伸延。',
    ],
    processes: ['水力作用', '磨蝕作用', '溶蝕作用'],
    sequence: '海崖 → 【海蝕洞】 → 海蝕拱 → 海蝕柱 → 海蝕殘柱',
    example: '長洲東北岩岸（教學示意）；可對照西貢果洲群島。',
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
    example: '長洲東北岩岬（教學序列示意）；可對照西貢吊鐘洲。',
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
    example: '長洲東北岩岬（教學序列示意）；可對照西貢破邊洲。',
    bestStage: 0.75, view: [40, 16, 36],
    quiz: '海蝕拱的拱頂崩塌後，遺下孤立於海中的岩柱是？',
  },
  {
    id: 'stump', zh: '海蝕殘柱', en: 'Stump', tag: '延伸', bonus: true,
    short: '海蝕柱底部被蝕斷倒塌後，只剩下的低矮岩墩。',
    steps: [
      '海浪在海蝕柱底部蝕出浪蝕凹壁。',
      '凹壁擴大，海蝕柱最終倒塌。',
      '只剩下低矮的殘柱，高潮時可能被海水淹沒，成為浪蝕平台的一部分。',
    ],
    processes: ['水力作用', '磨蝕作用'],
    sequence: '海崖 → 海蝕洞 → 海蝕拱 → 海蝕柱 → 【海蝕殘柱】',
    example: '長洲東北岩岬教學序列的最終階段。',
    bestStage: 1.0, view: [32, 14, 32],
    quiz: '海蝕柱倒塌後剩下、高潮時或會被淹沒的低矮岩墩是？',
  },
  {
    id: 'beach', zh: '海灘', en: 'Beach', tag: '沉積地貌',
    short: '海灣內波浪能量較低，沙粒被沉積在灣頭而成的海灘。長洲東灣（Tung Wan）在連島沙洲東側。',
    steps: [
      '海浪在岬角處折射，能量集中於岬角，海灣內能量分散。',
      '海灣成為低能量環境，以建設性海浪為主（進流強、回流弱）。',
      '侵蝕得來的沙粒及卵石被搬運到灣頭沉積。',
      '沉積物不斷累積，海灘逐漸變闊——東灣呈新月形。',
    ],
    processes: ['波浪折射', '沿岸漂移', '沉積作用'],
    sequence: '岩岸被侵蝕的物料成為海灘的來源——「岬角受蝕、海灣沉積」。',
    example: '長洲東灣（Tung Wan）海灘，位於連島沙洲東側。',
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
      '沙洲繼續增高並露出水面，把兩島連接——長洲啞鈴形的「腰」誕生。轉一轉「海浪方向」，沙洲會偏向背浪一側。',
    ],
    processes: ['波浪折射', '沿岸漂移', '沉積作用'],
    sequence: '由侵蝕得來的沉積物，在兩島之間的掩蔽區重新堆積；東側常伴生東灣海灘。',
    example: '長洲本身就是經典連島沙洲島嶼（南北兩島＋中央沙洲）。',
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
      return { present: true, pos: out.set(x, H * 0.62, cl + 1.2), note: `南氹：崖腳可見浪蝕凹壁 · 岸線已後退約 ${Math.round(14 * s)} 米（示意）` };
    }
    case 'platform': {
      const x = 22;
      const cl = southCliff(x, s);
      const c0 = southCoast0(x);
      const w = (c0 - cl) + 16 + 18 * s;
      return {
        present: s > 0.1,
        pos: out.set(x, 1.5, cl - Math.max(6, w * 0.45)),
        note: s > 0.1 ? `南氹浪蝕平台闊約 ${Math.round(w)} 米 · 低潮時更清晰` : '海崖剛開始後退，平台仍很窄',
      };
    }
    case 'geo': {
      const G = geoParams(s);
      const z = G.clG - G.L * 0.4;
      return {
        present: s > 0.1, pos: out.set(geoX(z), 7, z),
        note: s > 0.1 ? `長洲北岸：沿節理深入約 ${Math.round(G.L)} 米${G.blow ? '，盡頭仍有海蝕洞及噴水洞' : ''}` : '浪正沿節理蝕出狹窄裂縫',
      };
    }
    case 'cave': {
      const k = segIn(s, 0.12, 0.4, 0.3);
      if (k < 0) return { present: false, pos: out.set(HX + 10, 4, caveZ(3)), note: '目前沒有發育中的海蝕洞' };
      const zc = caveZ(k), w = headHalfWidth(zc);
      const cv = caveParams(phase(s, k), w);
      return { present: true, pos: out.set(HX + w + 0.5, Math.max(2.5, cv.ry * 0.6), zc), note: '長洲東北岩岬' };
    }
    case 'arch': {
      const k = segIn(s, 0.4, 0.57, 0.5);
      if (k < 0) return { present: false, pos: out.set(HX, 12, caveZ(1)), note: '海蝕洞尚未貫通／拱頂已崩塌' };
      const zc = caveZ(k), w = headHalfWidth(zc);
      const cv = caveParams(phase(s, k), w);
      return { present: true, pos: out.set(HX + w * 0.55, cv.ry * 0.95 + 1.5, zc), note: '長洲東北岩岬' };
    }
    case 'stack': {
      const k = segIn(s, 0.64, 0.88, 0.75);
      if (k < 0) return { present: false, pos: out.set(HX, H, 135), note: '海蝕拱尚未崩塌' };
      const st = stackGeom(k, phase(s, k));
      return { present: true, pos: out.set(HX, headTop(HX, st.zs) + 1.5, st.zs), note: '長洲東北岩岬' };
    }
    case 'stump': {
      const k = segIn(s, 0.9, 1.0, 1.0);
      if (k < 0) return { present: false, pos: out.set(HX, 3, 138), note: '海蝕柱仍然屹立' };
      const st = stackGeom(k, phase(s, k));
      return { present: true, pos: out.set(HX, 3.2, st.zs), note: '' };
    }
    case 'beach': {
      const z = (NECK_Z0 + NECK_Z1) * 0.45;
      const bw = beachWidth(s);
      const x = TOMB_X + 14 + bw * 0.3;
      return {
        present: s > 0.32 && bw > 6,
        pos: out.set(x, 2.0, z),
        note: s > 0.32 ? `東灣灘面闊約 ${Math.round(bw)} 米 · 隨浪向偏向背浪側` : '沙洲尚未成形，東灣海灘仍未出現',
      };
    }
    case 'tombolo': {
      const c = tomboloCrest(s);
      const z = (NECK_Z0 + NECK_Z1) * 0.5;
      let note: string;
      if (c < -3.2) note = '初期：南北兩島完全分開，中間是開闊水道';
      else if (c < -0.6) note = '中期：水下沙洲正在堆積，低潮時隱約可見';
      else if (c < 0.6) note = '沙洲接近露出水面，兩島快將相連';
      else note = '後期：連島沙洲已露出，南北兩島連成啞鈴形';
      return {
        present: true, pos: out.set(TOMB_X + 2, Math.max(1.2, c + 1.6), z),
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
