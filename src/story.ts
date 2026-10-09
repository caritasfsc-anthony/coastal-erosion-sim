import type { LandformId } from './landforms';

export interface StoryStep {
  title: string;
  text: string;
  stage: number;
  focus?: LandformId;
  view?: { pos: [number, number, number]; target: [number, number, number] };
}

/** High oblique overview — two islands early / dumbbell late. */
export const OVERVIEW = {
  pos: [175, 145, 55] as [number, number, number],
  target: [0, 2, -10] as [number, number, number],
};

export const STORY: StoryStep[] = [
  {
    title: '序章：兩個獨立的島',
    text: '一開始，長洲還未「連成一體」——南、北是兩座完全分開的島丘，中間是開闊水道。這是簡化教學模型（靈感來自 3d.map.gov.hk，並非精確測量）。拖動時間軸，你會看到泥沙怎樣把兩島連成啞鈴形。',
    stage: 0.02, view: OVERVIEW,
  },
  {
    title: '海浪的力量',
    text: '破壞性海浪以「水力作用」把空氣壓入岩石裂縫，又以「磨蝕作用」挾帶砂石撞擊岩岸。留意浪花、濕潤岩面和「浪擊點」。試試右下角八個方位掣，揀定浪向，睇邊岸受浪最猛。',
    stage: 0.08, view: { pos: [70, 28, -160], target: [20, 4, -90] },
  },
  {
    title: '南氹的海崖',
    text: '鏡頭轉到南氹：浪在崖腳潮間帶蝕出明顯的浪蝕凹壁（凹痕），上方岩石失去支撐崩塌，形成陡峭海崖。平台在崖腳前方已經開始留低。',
    stage: 0.22, focus: 'cliff',
  },
  {
    title: '東北岩岬的海蝕洞',
    text: '東北岩岬三面受浪。海浪先在崖腳掏出凹壁，再沿節理向內鑽，把凹口蝕成愈來愈深的海蝕洞。',
    stage: 0.3, focus: 'cave',
  },
  {
    title: '北岸的海蝕隙',
    text: '北岸節理發達。浪沿垂直節理湧入狹縫、撞向盡頭岩壁，裂隙愈闊愈深。盡頭可先出現海蝕洞及噴水洞，洞頂崩塌後裂隙再延長。',
    stage: 0.45, focus: 'geo',
  },
  {
    title: '海蝕洞貫通：海蝕拱',
    text: '岬角兩側海蝕洞不斷向內伸延，終於貫通成海蝕拱。拱底續被侵蝕，拱頂愈來愈薄。',
    stage: 0.5, focus: 'arch',
  },
  {
    title: '水下沙洲開始連接兩島',
    text: '兩島之間成為相對掩蔽的低能量區。沿岸漂移帶來的泥沙在水道中堆積，先形成低潮時隱約可見的水下沙洲——連島沙洲的雛形。',
    stage: 0.42, focus: 'tombolo',
  },
  {
    title: '東灣海灘',
    text: '沙洲東側逐漸出現灣頭沉積。建設性海浪把沙推上東灣，新月形海灘變闊。撳方位掣轉浪向，沙灘位置會偏向背浪一側。',
    stage: 0.65, focus: 'beach',
  },
  {
    title: '拱頂崩塌：海蝕柱',
    text: '拱頂崩塌，碎石散落；向海一側孤立成海蝕柱。下一段岩岬又重複「洞 → 拱」。',
    stage: 0.75, focus: 'stack',
  },
  {
    title: '南氹浪蝕平台',
    text: '海崖大幅後退後，崖腳留下廣闊、平坦的浪蝕平台。低潮時看得最清楚；東南岸饅頭石矗立在石台邊緣。',
    stage: 0.85, focus: 'platform',
  },
  {
    title: '連島沙洲露出：啞鈴成形',
    text: '水下沙洲不斷增高，終於露出水面，把南北兩島連成一體——長洲著名的啞鈴形「腰」誕生了。東側是東灣海灘。撳八方位掣轉浪向，睇沙洲偏向邊邊！右上角俯視圖亦可同步睇變化。',
    stage: 0.92, focus: 'tombolo',
  },
  {
    title: '最後的海蝕殘柱',
    text: '最早的海蝕柱倒塌成殘柱。東北岩岬由海向陸排列：殘柱、柱、拱、洞——空間排列就是時間演變。',
    stage: 1, focus: 'stump',
  },
  {
    title: '總結：玩轉浪向與時間',
    text: '岩岸受蝕留下崖、隙、洞、拱、柱與平台；侵蝕物料在兩島之間沉積成連島沙洲與海灘。拖時間軸、撳八方位浪向、用右上角俯視圖睇變化，再挑戰模式考考自己——好玩嘅地理實驗，開始！',
    stage: 1, view: OVERVIEW,
  },
];
