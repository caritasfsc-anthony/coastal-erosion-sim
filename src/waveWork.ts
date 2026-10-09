// Where are the waves doing the most work right now? Drives the 浪擊點 marker + caption.
import * as THREE from 'three';
import { landformState, type LandformId } from './landforms';
import { HX, SEGMENTS, caveParams, caveZ, geoParams, geoX, headHalfWidth, headTop, phase, southCliff, stackGeom } from './world';

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
    title: '海蝕凹地加深中', text: `每一下浪都拍向崖腳：${PROC}把潮間帶的岩石掏空，形成海蝕凹地。`,
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
    title: '海蝕柱底部被掏蝕', text: '海浪環繞海蝕柱拍打，在柱腳蝕出海蝕凹地，上方岩柱愈來愈「頭重腳輕」。',
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
      const x = id === 'cliff' ? 18 : 40;
      const cl = southCliff(x, s);
      if (id === 'platform' || s >= 0.45) {
        return {
          pos: new THREE.Vector3(x, 0.8, cl - 0.6), n: new THREE.Vector3(0, 0, -1), face: 20,
          title: '南岸：海崖後退 → 浪蝕平台擴闊',
          text: '浪只能蝕到潮間帶高度；崩塌岩屑被沖走後留下平緩岩台。平台愈闊，浪到崖腳前消耗的能量愈多。',
        };
      }
      if (s < 0.1) {
        return {
          pos: new THREE.Vector3(x, 0.9, cl - 0.5), n: new THREE.Vector3(0, 0, -1), face: 14,
          title: '原本坡面：浪開始衝擊崖腳',
          text: `破壞性海浪在高潮位附近拍打較和緩的岩岸。接下來會蝕出「海蝕凹地」。（${PROC}）`,
        };
      }
      if (s < 0.23) {
        return {
          pos: new THREE.Vector3(x, 0.85, cl + 0.2), n: new THREE.Vector3(0, 0, -1), face: 12,
          title: '海蝕凹地加深中',
          text: `${PROC}把潮間帶崖腳掏空，形成明顯的海蝕凹地（wave-cut notch）。凹地愈深，上方岩石愈不穩。`,
        };
      }
      if (s < 0.32) {
        return {
          pos: new THREE.Vector3(x, 1.2, cl - 0.3), n: new THREE.Vector3(0, 0, -1), face: 18,
          title: '海蝕凹地頂部崩塌！',
          text: '凹地頂部失去支撐而崩塌，碎石跌落海中；留下陡峭海崖，岩屑稍後被浪沖走。',
        };
      }
      return {
        pos: new THREE.Vector3(x, 0.8, cl - 0.6), n: new THREE.Vector3(0, 0, -1), face: 20,
        title: '陡峭海崖成形 · 繼續後退',
        text: '「凹地 → 崩塌」反覆進行，海崖向陸後退；崖腳浪蝕平台逐漸變闊。',
      };
    }
    case 'geo': {
      // the surge funnels down the slot and slams into its back wall
      const G = geoParams(s);
      const z = G.zHead + 0.9;
      return {
        pos: new THREE.Vector3(geoX(z), 0.8, z), n: new THREE.Vector3(0, 0, 1), face: 18,
        title: '浪沿節理鑽入 → 海蝕隙', text: '浪湧入狹窄的裂隙、撞向盡頭岩壁，把空氣壓入節理；退浪時壓力驟降，裂隙一次次被撐闊、磨深，並向陸地伸延。',
      };
    }
    case 'beach': case 'tombolo': {
      const pos = landformState(id, s).pos.clone(); pos.y = 0.8;
      return {
        pos, n: new THREE.Vector3(0, 0, 1), face: 1, deposit: true,
        title: id === 'beach' ? '灣頭：低能量海灣沉積' : '兩島之間：連島沙洲生長',
        text: id === 'beach'
          ? '浪在岩岬折射、能量集中於岬角；海灣浪弱，建設性海浪把沙粒推上灣頭，形成新月形海灘。'
          : '南北兩島之間成為掩蔽區；泥沙先堆積成水下沙洲，再露出水面把兩島連接。背浪一側沉積更明顯。',
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
