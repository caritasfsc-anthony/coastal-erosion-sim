// Where are the waves doing the most work right now? Drives the 浪擊點 marker + caption.
import * as THREE from 'three';
import { landformState, type LandformId } from './landforms';
import { GX, HX, SEGMENTS, caveParams, caveZ, cliffLine, geoLength, headHalfWidth, headTop, phase, stackGeom } from './world';

export interface Strike {
  pos: THREE.Vector3;     // point on the struck face, at the waterline
  n: THREE.Vector3;       // seaward normal of that face
  face: number;           // height of the face (for spray)
  title: string;
  text: string;
  deposit?: boolean;
  segment?: number;
}

const PROC = '水力作用 · 磨蝕作用';

function headlandStrike(k: number, s: number): Strike {
  const p = phase(s, k);
  const zc = caveZ(k), w = headHalfWidth(zc);
  const cv = caveParams(p, w);
  const top = headTop(HX, zc);
  if (p < 0.1) return {
    pos: new THREE.Vector3(HX + w + 0.4, 0.8, zc), n: new THREE.Vector3(1, 0, 0.25), face: top, segment: k,
    title: '浪蝕凹壁加深中', text: `每一下浪都拍向崖腳：${PROC}把潮間帶的岩石掏空，形成凹壁。`,
  };
  if (p < 0.38) return {
    pos: new THREE.Vector3(HX + w + 0.4, Math.max(0.8, cv.ry * 0.3), zc), n: new THREE.Vector3(1, 0, 0.25), face: top, segment: k,
    title: '海蝕洞向內伸延', text: '浪湧入節理把洞內空氣壓縮，退浪時壓力驟降令岩石碎裂（水力作用）；浪中砂石再磨蝕洞壁。',
  };
  if (p < 0.565) return {
    pos: new THREE.Vector3(HX + w * 0.6, 1.2, zc), n: new THREE.Vector3(1, 0, 0.2), face: cv.ry, segment: k,
    title: '兩側海蝕洞貫通 → 海蝕拱', text: '海浪由岬角兩側夾擊，洞穴終於蝕穿；浪繼續拍打拱腳，拱頂愈來愈薄。',
  };
  if (p < 0.64) return {
    pos: new THREE.Vector3(HX + w * 0.5, 1, zc), n: new THREE.Vector3(1, 0, 0.2), face: top, segment: k,
    title: '拱頂崩塌！', text: '失去支撐的拱頂塌下，碎石跌入海中——它們隨即成為海浪磨蝕岩岸的「工具」。',
  };
  const st = stackGeom(k, p);
  if (p < 0.88) return {
    pos: new THREE.Vector3(HX + st.r + 0.3, 0.8, st.zs), n: new THREE.Vector3(1, 0, 0.35), face: top, segment: k,
    title: '海蝕柱底部被掏蝕', text: '海浪環繞海蝕柱拍打，在柱腳蝕出浪蝕凹壁，上方岩柱愈來愈「頭重腳輕」。',
  };
  return {
    pos: new THREE.Vector3(HX + st.r + 0.3, 0.6, st.zs), n: new THREE.Vector3(1, 0, 0.35), face: 2, segment: k,
    title: '海蝕柱倒塌 → 海蝕殘柱', text: '柱腳被蝕斷，海蝕柱倒塌，只餘低矮殘柱，繼續被浪削平成浪蝕平台。',
  };
}

/** The most seaward headland block still being worked on. */
export function activeStrike(s: number): Strike {
  for (let k = 0; k < SEGMENTS.length; k++) if (phase(s, k) < 0.985) return headlandStrike(k, s);
  return headlandStrike(SEGMENTS.length - 1, s);
}

/** Strike zone for a specific landform (used by 「觀看形成過程」 and story chapters). */
export function strikeFor(id: LandformId, s: number, sTarget = s): Strike {
  switch (id) {
    case 'cliff': case 'platform': {
      const x = id === 'cliff' ? 70 : 118;
      return {
        pos: new THREE.Vector3(x, 0.8, cliffLine(x, s) + 0.6), n: new THREE.Vector3(0, 0, 1), face: 20,
        title: id === 'cliff' ? '崖腳受浪拍打 → 海崖後退' : '海崖後退 → 平台擴闊',
        text: id === 'cliff'
          ? '浪在崖腳蝕出凹壁，上方岩石失去支撐而崩落；落石被浪捲走，海崖一步步向陸後退。'
          : '浪只能蝕到潮間帶高度，海崖後退後在崖腳留下平緩的岩台；平台愈闊，浪到崖腳前消耗的能量愈多。',
      };
    }
    case 'geo': {
      const z = cliffLine(GX, s) - geoLength(s) * 0.15;
      return {
        pos: new THREE.Vector3(GX, 0.8, z + 2), n: new THREE.Vector3(0, 0, 1), face: 16,
        title: '浪沿節理鑽入 → 海蝕隙', text: '浪衝入垂直節理，把空氣壓縮；退浪時壓力驟降，裂縫一次次被撐闊、磨深。',
      };
    }
    case 'beach': case 'tombolo': {
      const pos = landformState(id, s).pos.clone(); pos.y = 0.8;
      return {
        pos, n: new THREE.Vector3(0, 0, 1), face: 1, deposit: true,
        title: id === 'beach' ? '低能量海灣：沙粒沉積' : '島後掩蔽區：沙洲伸展',
        text: id === 'beach'
          ? '浪在岬角折射、能量集中於岬角；灣內浪弱，建設性海浪把岬角蝕下的沙粒推上灣頭。'
          : '浪繞過島嶼兩側後在島後相遇，能量驟降，沿岸漂移帶來的泥沙在此堆積成沙洲。',
      };
    }
    case 'cave': case 'arch': case 'stack': case 'stump': {
      const want = { cave: 0.28, arch: 0.5, stack: 0.75, stump: 0.95 }[id];
      let best = 0, bd = Infinity;
      for (let k = 0; k < SEGMENTS.length; k++) { const d = Math.abs(phase(sTarget, k) - want); if (d < bd) { bd = d; best = k; } }
      return headlandStrike(best, s);
    }
  }
}
