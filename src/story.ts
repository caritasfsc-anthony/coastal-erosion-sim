import type { LandformId } from './landforms';

export interface StoryStep {
  title: string;
  text: string;
  stage: number;
  focus?: LandformId;
  view?: { pos: [number, number, number]; target: [number, number, number] };
}

export const OVERVIEW = { pos: [100, 70, 212] as [number, number, number], target: [-28, 0, 44] as [number, number, number] };

export const STORY: StoryStep[] = [
  {
    title: '序章：一段年輕的岩岸',
    text: '這是一段剛形成不久的岩岸：右方是筆直的海崖，中央是伸出海中的岬角，左方是一個海灣，海灣外還有一個小島。接下來，我們會把數千年的海浪侵蝕壓縮成幾分鐘。',
    stage: 0, view: OVERVIEW,
  },
  {
    title: '海浪的力量',
    text: '破壞性海浪以「水力作用」把空氣壓入岩石裂縫，又以「磨蝕作用」挾帶砂石撞擊岩岸。留意浪花——它們撞擊岩石的地方，就是侵蝕最活躍的地方。',
    stage: 0.06, view: { pos: [92, 22, 82], target: [40, 6, 40] },
  },
  {
    title: '海崖與浪蝕凹壁',
    text: '海浪在崖腳蝕出浪蝕凹壁，凹壁上方的岩石失去支撐而崩塌，形成陡峭的海崖。這個過程不斷重複，海崖便一步步向陸地後退。',
    stage: 0.2, focus: 'cliff',
  },
  {
    title: '岬角上的海蝕洞',
    text: '岬角三面受浪，波浪折射令能量集中在岬角。海浪沿岬角的節理及斷層侵蝕，在兩側崖腳蝕出海蝕洞。',
    stage: 0.3, focus: 'cave',
  },
  {
    title: '沿節理伸延的海蝕隙',
    text: '在右方的海崖上，海浪沿一條垂直節理反覆進行水力作用，裂縫愈來愈闊、愈來愈深，形成狹長的海蝕隙。',
    stage: 0.45, focus: 'geo',
  },
  {
    title: '海蝕洞貫通：海蝕拱',
    text: '岬角兩側的海蝕洞不斷向內伸延，終於貫通，形成海水可以穿過的海蝕拱。拱底繼續被侵蝕，拱頂變得愈來愈薄。',
    stage: 0.5, focus: 'arch',
  },
  {
    title: '海灣裏的海灘',
    text: '與岬角相反，海灣受到掩護，波浪能量分散。建設性海浪把從岬角侵蝕得來的沙粒帶到灣頭沉積，海灘逐漸變闊。',
    stage: 0.65, focus: 'beach',
  },
  {
    title: '拱頂崩塌：海蝕柱',
    text: '拱頂最終承受不住自身重量而崩塌，向海一側的岩石孤立於海中，成為海蝕柱。與此同時，下一段岬角又重複「洞 → 拱」的過程。',
    stage: 0.75, focus: 'stack',
  },
  {
    title: '海崖後退留下的浪蝕平台',
    text: '經過長時間的侵蝕，海崖已大幅後退，在崖腳留下廣闊的浪蝕平台。試試把潮汐切換到「低潮」，平台會露出更多。',
    stage: 0.85, focus: 'platform',
  },
  {
    title: '連接島嶼的連島沙洲',
    text: '海浪繞過小島兩側發生折射，島嶼背後成為掩蔽區，泥沙在此沉積。沙洲由岸邊伸向島嶼，最終露出水面，把島嶼與陸地連起來。',
    stage: 0.92, focus: 'tombolo',
  },
  {
    title: '最後的海蝕殘柱',
    text: '最早形成的海蝕柱，底部被蝕斷後倒塌，只剩下低矮的海蝕殘柱，高潮時更會被淹沒。看看岬角：殘柱、海蝕柱、海蝕拱和海蝕洞由海向陸排成一列——空間上的排列，正是時間上的演變。',
    stage: 1, focus: 'stump',
  },
  {
    title: '總結：侵蝕與沉積的循環',
    text: '岬角受侵蝕而後退，留下海蝕洞、拱、柱與平台；被蝕下的物料又在海灣和島嶼背後沉積成海灘與連島沙洲。拖動時間軸，自己再探索一次吧！',
    stage: 1, view: OVERVIEW,
  },
];
