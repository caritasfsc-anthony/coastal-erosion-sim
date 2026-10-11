export type LessonId = 'cliff' | 'arch' | 'beach' | 'geo' | 'tombolo';
export interface Step { title: string; action: string; observe: string; reason: string; label: string }
export interface Lesson { id: LessonId; name: string; en: string; category: string; intro: string; steps: Step[]; limit: string; question: string; choices: string[]; answer: number; explanation: string }
export const lessons: Lesson[] = [
 {id:'cliff',name:'海崖與浪蝕平台',en:'CLIFF RETREAT',category:'侵蝕',intro:'岩石被移走，崖線向陸地後退。平台是留下來的基岩。',steps:[
 {title:'原有岩岸',action:'海浪到達岩岸的潮間帶。',observe:'看岩體側面的完整剖面，以及虛線標示的原來崖線。',reason:'此例從已有陡岸開始。海崖也可由其他地質及地貌過程形成。',label:'原有岩體'},
 {title:'崖腳被掏蝕',action:'水力作用及磨蝕作用移走崖腳岩石，形成海蝕凹地。',observe:'凹地向陸地深入，上面的岩石仍然懸垂。',reason:'侵蝕集中於浪能到達的高度；不是整塊陸地向上升。',label:'海蝕凹地'},
 {title:'懸垂岩塊崩塌',action:'裂隙與風化削弱岩體，失去支撐的岩塊崩落。',observe:'崖頂高度不增加；崖線後退，崖腳留下岩屑。',reason:'這是簡化的塊體崩塌例子；真實崖岸亦可能滑坡。',label:'崩落岩屑'},
 {title:'岩屑被搬走',action:'波浪搬走及磨細部分崩塌物，露出基岩。',observe:'平台與崖身連在一起；它並非新增的沉積地。',reason:'平台是岩岸後退後留下的岩面，也會繼續受侵蝕及風化。',label:'浪蝕平台'},
 {title:'反覆侵蝕，崖線再退',action:'掏蝕、崩塌及搬運反覆發生。',observe:'用原來崖線比較：岩體體積減少，平台變闊。',reason:'平台寬度與潮差、岩性、波能及海面變化有關，並非固定速率。',label:'後退的海崖'}
 ],limit:'側面剖切的均質岩岸概念模型；不計算岩石強度、滑坡或侵蝕速率。水面位置固定以便比較。',question:'浪蝕平台的岩石主要來自哪裏？',choices:['後退海崖留下的基岩','海浪堆積出來的新岩石','原來海床整體抬升'],answer:0,explanation:'此例的平台是崖線後退後露出的基岩，不是沙石堆積形成。'},
 {id:'arch',name:'海蝕洞、拱、柱',en:'HEADLAND EROSION',category:'侵蝕',intro:'從同一塊岬角移走岩石，觀察洞、拱及孤立岩柱的空間關係。',steps:[
 {title:'有弱點的岩岬',action:'海浪沿岩岬的節理或較弱岩層侵蝕。',observe:'這是一塊有厚度的岩岬，海水包圍其外側。',reason:'裂隙及岩性控制侵蝕位置；不是所有岬角都經歷以下各步。',label:'原有岩岬'},
 {title:'海蝕洞深入',action:'弱點擴大為有頂部、側壁及盡頭的洞穴。',observe:'旋轉到背面：洞未貫穿，後面仍有岩石。',reason:'水力作用及挾沙石的磨蝕可沿弱點向內侵蝕。',label:'未貫穿的海蝕洞'},
 {title:'洞穴貫通，形成拱',action:'洞穴穿過岩岬，留下上方的岩橋。',observe:'從前後兩面都能看穿開口；拱頂仍連接兩側。',reason:'可由一個洞向內侵蝕，或兩面的洞逐漸相遇。',label:'貫通的海蝕拱'},
 {title:'拱頂崩塌，留下柱',action:'侵蝕及風化削弱拱頂，岩橋崩塌。',observe:'孤立岩柱留在原來岩岬的位置，沒有向海移動或新長出來。',reason:'海蝕柱是原有岩體的殘餘；較靠陸的一側仍是岬角。',label:'原位殘留的海蝕柱'},
 {title:'岩柱降低，成為殘柱',action:'繼續侵蝕及崩塌，使岩柱逐漸降低。',observe:'同一位置只留下低矮岩體；柱與殘柱是這塊岩石的不同階段。',reason:'殘柱在潮漲時可能被淹沒。這裏固定水位以便觀察。',label:'海蝕殘柱'}
 ],limit:'理想化岩岬；洞口以規則曲線簡化，崩塌按教學步驟切換，不是每個岬角的必然路徑。',question:'海蝕柱為甚麼會與陸地分離？',choices:['海底長出新的岩柱','海蝕拱頂崩塌，留下外側岩體','海浪將整根柱推離岸邊'],answer:1,explanation:'海蝕柱留在原有岩體的位置，分離是因為相連的拱頂被移走。'},
 {id:'beach',name:'海灘與泥沙搬運',en:'SEDIMENT MOVEMENT',category:'沉積與侵蝕',intro:'海灘是鬆散泥沙的堆積體。比較較平靜與風暴情境，追蹤沙去了哪裏。',steps:[
 {title:'較平靜的海灘',action:'岸上有沙灘及灘脊，水下亦有泥沙。',observe:'金色是沙，灰色是固定基底；水線只是兩者與水面的交界。',reason:'海灘物料可由河流、崖岸、近岸海床及沿岸搬運供應。',label:'岸上沙灘與水下沙'},
 {title:'風暴：沙向海搬移',action:'強浪及回流把部分上灘的沙搬到近岸水下。',observe:'上灘變低、近岸沙壩變厚；金色剖面面積保持不變。',reason:'這裏只模擬封閉剖面的岸海方向再分配，沒有沙憑空產生。',label:'上灘侵蝕 · 近岸堆積'},
 {title:'風暴後的剖面',action:'部分沙暫時儲存在水下沙壩。',observe:'沙仍在系統內；岸上沙灘較窄，不代表所有沙都已消失。',reason:'真實風暴也可把沙帶出系統，或越過灘頂；本例沒有包括。',label:'水下沙壩'},
 {title:'較平靜：沙逐步回岸',action:'在合適波浪條件下，部分近岸沙向岸搬移。',observe:'沙壩降低，上灘及灘脊重新增厚。',reason:'恢復取決於波況及泥沙供應，不能保證完全回復。',label:'向岸搬運'},
 {title:'沿岸漂移',action:'斜向進流挾沙上灘，退流大致沿坡向下，沙沿岸淨移動。',observe:'俯視時看黃色折線：每次進退後，沙的位置沿岸偏移。',reason:'沿岸流亦能搬沙；本步顯示路徑，不改變前面的封閉剖面沙量。',label:'沿岸淨搬運 →'}
 ],limit:'沙剖面面積守恆的示意，無量綱且不作真實體積預測。沿岸漂移路徑另作示意，不求解水流或粒徑。',question:'風暴後岸上沙灘變窄，沙可能去了哪裏？',choices:['必定全部溶入海水','只會向上堆成山','可能搬到近岸水下沙壩'],answer:2,explanation:'岸上侵蝕與近岸堆積可以同時發生，應查看整個泥沙系統。'},
 {id:'geo',name:'海蝕隙',en:'JOINT → CLEFT',category:'侵蝕',intro:'沿岩石弱線侵蝕出狹長海灣；向下看它與海蝕洞的分別。',steps:[
 {title:'岩岸弱線',action:'岩體中有節理或較弱岩帶。',observe:'虛線指出優先受侵蝕的位置。',reason:'不同岩石抵抗侵蝕能力不同。',label:'節理／弱岩帶'},
 {title:'沿弱線侵蝕',action:'海水沿弱線移走岩石，入口向內深入。',observe:'狹長裂口與外海相通；從上面能看到水。',reason:'此例直接展示沿弱岩帶侵蝕的路徑。',label:'沿弱線深入'},
 {title:'狹長海蝕隙',action:'持續侵蝕使裂口加深及擴闊。',observe:'兩側是陡壁，頂部敞開；並不是有完整頂部的洞。',reason:'海蝕隙也可由洞頂崩塌形成；本例沒有演示那條路徑。',label:'頂部敞開的海蝕隙'}
 ],limit:'規則岩塊用來突出沿弱線侵蝕；沒有模擬真實節理網絡。',question:'這個海蝕隙與未崩塌海蝕洞有甚麼分別？',choices:['海蝕隙頂部敞開','海蝕隙必定由沙形成','海蝕隙不與海相通'],answer:0,explanation:'海蝕隙是狹長、向天敞開的凹入海岸；海蝕洞有岩石頂部。'},
 {id:'tombolo',name:'連島沙洲',en:'ISLAND + SEDIMENT',category:'沉積',intro:'離岸島後方在適合條件下積沙，最終與陸地相連。先看水下，再看露出水面的沙。',steps:[
 {title:'陸地與離岸島',action:'海水隔開陸地與島嶼，近岸有泥沙來源。',observe:'島與陸地的位置固定；海床上已有少量沙。',reason:'是否形成沙洲取決於水深、波況、島形及泥沙收支。',label:'水道與離岸島'},
 {title:'島後方堆積',action:'波浪受島嶼影響，掩蔽區內在合適條件下淨沉積。',observe:'沙從外部供應逐步加在海床上，岩島沒有伸長。',reason:'折射及繞射可改變波能及搬運；掩蔽區並非完全沒有浪。',label:'水下堆積體'},
 {title:'沙脊接近水面',action:'持續的泥沙輸入使水下沙脊增厚。',observe:'水面仍可能蓋過沙脊；水下相連不等於已有乾燥通道。',reason:'只有泥沙輸入多於輸出，堆積體才有淨增長。',label:'水下沙脊'},
 {title:'形成連島沙洲',action:'沙脊部分露出水面，把島與陸地連接。',observe:'金色通道是鬆散沉積物；它與深色岩島不同。',reason:'此例假設持續供沙及固定水位。潮汐、風暴可使通道淹沒或被沖開。',label:'連島沙洲'}
 ],limit:'展示供沙充足的其中一個情境；波線只示意島嶼影響，不是折射／繞射計算。沒有島必然相連的假設。',question:'連島沙洲要持續增厚，最重要的泥沙條件是？',choices:['島嶼向陸地生長','泥沙輸入長期多於輸出','海水停止流動'],answer:1,explanation:'連島沙洲是淨沉積的結果，需要泥沙來源及適合的搬運環境。'}
 ];

// x grows from sea towards land. A closed sand wedge, area is conserved.
export const beachX = Array.from({length:81},(_,i)=>-10+i*.25);
const initial = beachX.map(x=>.16+1.9*Math.exp(-(((x-5)/3.5)**2))+.25*Math.exp(-(((x+4)/3)**2)));
const storm = beachX.map(x=>.16+1.5*Math.exp(-(((x-5)/3.8)**2))+.75*Math.exp(-(((x+3)/3.5)**2)));
export function area(a:number[]) {return a.slice(1).reduce((n,y,i)=>n+(a[i]+y)*.125,0)}
const scale=area(initial)/area(storm);
export function beachProfile(step:number) {const t=[0,.5,1,.3,.3][step] ?? 0;return initial.map((v,i)=>v*(1-t)+storm[i]*scale*t)}
export function cliffProfile(step:number):[number,number][] {
 const retreat=[0,0,2.8,2.8,6][step]; const notch=step===1?2.8:0;
 return [[retreat,1],[retreat+notch,1.5],[retreat+notch,2.5],[retreat,3.2],[retreat,9],[13,9],[13,-2],[-8,-2],[-8,.4],[retreat,.8]];
}
