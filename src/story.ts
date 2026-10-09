import type { LandformId } from './landforms';

export interface StoryStep {
  title: string;
  text: string;
  stage: number;
  focus?: LandformId;
  view?: { pos: [number, number, number]; target: [number, number, number] };
}

/** High oblique overview — recognisable Cheung Chau dumbbell silhouette. */
export const OVERVIEW = {
  pos: [160, 130, 40] as [number, number, number],
  target: [0, 0, 0] as [number, number, number],
};

export const STORY: StoryStep[] = [
  {
    title: '序章：長洲的啞鈴形',
    text: '這是一個以香港長洲為藍本的簡化教學模型（靈感來自地政總署 3d.map.gov.hk，並非精確測量數據）。你會看到南、北兩座島丘，中央是連島沙洲，東側是東灣海灘——這就是長洲著名的「啞鈴」輪廓。接下來，我們把數千年的海浪侵蝕壓縮成幾分鐘。',
    stage: 0.15, view: OVERVIEW,
  },
  {
    title: '海浪的力量',
    text: '破壞性海浪以「水力作用」把空氣壓入岩石裂縫，又以「磨蝕作用」挾帶砂石撞擊岩岸。留意每一個浪頭到岸時爆開的浪花、被打濕發亮的岩面和閃動的「浪擊點」——浪拍打岩石的地方，就是侵蝕最活躍的地方。',
    stage: 0.08, view: { pos: [70, 28, 160], target: [20, 4, 120] },
  },
  {
    title: '南氹的海崖',
    text: '把鏡頭轉到長洲南岸南氹：每一下浪都拍向崖腳，在潮間帶高度蝕出浪蝕凹壁；凹壁上方的岩石失去支撐而崩塌，形成陡峭的海崖。這個過程不斷重複，海崖便一步步向陸地後退。',
    stage: 0.2, focus: 'cliff',
  },
  {
    title: '東北岩岬的海蝕洞',
    text: '長洲東北岩岬三面受浪，波浪折射令能量集中。海浪先在崖腳掏出凹壁，再沿節理及斷層向內鑽，把低矮的凹口蝕成愈來愈深、愈來愈高的海蝕洞。',
    stage: 0.3, focus: 'cave',
  },
  {
    title: '北岸的海蝕隙',
    text: '長洲北岸岩層節理發達。海浪沿垂直節理（黃色虛線）反覆進行水力作用及磨蝕作用：浪湧入狹縫、撞向盡頭岩壁，裂隙愈來愈闊、愈來愈深，並沿節理伸入陸地。盡頭的海蝕洞頂被浪壓穿成噴水洞，洞頂崩塌後裂隙便再延長。',
    stage: 0.45, focus: 'geo',
  },
  {
    title: '海蝕洞貫通：海蝕拱',
    text: '東北岩岬兩側的海蝕洞不斷向內伸延，終於貫通，形成海水可以穿過的海蝕拱。拱底繼續被侵蝕，拱頂變得愈來愈薄。',
    stage: 0.5, focus: 'arch',
  },
  {
    title: '東灣海灘',
    text: '與岩岬相反，連島沙洲東側的東灣（Tung Wan）受到掩護，波浪能量分散。建設性海浪把沙粒帶到灣頭沉積，新月形海灘逐漸變闊——今天長洲人最熟悉的沙灘就在這裏。',
    stage: 0.65, focus: 'beach',
  },
  {
    title: '拱頂崩塌：海蝕柱',
    text: '浪不斷掏蝕拱腳，拱頂最終崩塌，碎石散落海中；向海一側的岩石從此孤立，成為海蝕柱。與此同時，下一段岩岬又重複「洞 → 拱」的過程。',
    stage: 0.75, focus: 'stack',
  },
  {
    title: '南氹／饅頭石的浪蝕平台',
    text: '經過長時間的侵蝕，南氹海崖已大幅後退，在崖腳留下廣闊的浪蝕平台。東南岸還有圓潤的饅頭石地標，矗立在石台邊緣。試試把潮汐切換到「低潮」，平台會露出更多。',
    stage: 0.85, focus: 'platform',
  },
  {
    title: '長洲的連島沙洲',
    text: '南北兩座島丘之間的掩蔽區，泥沙不斷沉積。沙洲逐漸露出水面，把兩丘連接起來——這就是長洲啞鈴形的「腰」，市鎮也建在這片連島沙洲上。西側則是避風塘／海灣。',
    stage: 0.92, focus: 'tombolo',
  },
  {
    title: '最後的海蝕殘柱',
    text: '最早形成的海蝕柱，底部被蝕斷後倒塌，只剩下低矮的海蝕殘柱。看看東北岩岬：殘柱、海蝕柱、海蝕拱和海蝕洞由海向陸排成一列——空間上的排列，正是時間上的演變。',
    stage: 1, focus: 'stump',
  },
  {
    title: '總結：長洲的侵蝕與沉積',
    text: '岩岸受侵蝕而後退，留下海蝕隙、洞、拱、柱與浪蝕平台；被蝕下的物料又在東灣和島丘之間沉積成海灘與連島沙洲。這就是長洲地貌的教學故事——拖動時間軸，自己再探索一次吧！',
    stage: 1, view: OVERVIEW,
  },
];
