/**
 * 课程结构。这是全站唯一的学习路径真源：
 * 学习地图、每一页左侧的目录、上一课 / 下一课，全都从这里读。
 *
 * 三层结构：部分（part）→ 层（tier）→ 节（lesson）。
 * 节号是纯展示用的；链接用的是 id（目录名），所以重排不会打断链接。
 *
 * 第一部分的顺序原则：从物理性质往上建。
 * 一个音是什么 → 两个音的关系 → 时间 → 纵向叠置 → 调 → 记谱。
 * 第二部分把规则用起来，从动机写到成品。第三部分留给作品分析。
 */

export const PARTS = [
  {
    id: 'fundamentals',
    no: '第一部分',
    title: '乐理基础',
    blurb: '从声音本身出发，一层层往上建。先问"一个音是什么"，再问"音高之间的距离怎么定"，然后才谈音程、和弦、调。',
    tiers: [
      {
        id: 'sound',
        title: '一 · 声音本身',
        blurb: '先不聊音乐，先弄清楚一个音到底是什么。后面所有内容都站在这上面。',
        lessons: [
          { id: '00-harmonics',   no: '0', title: '泛音列',     sub: '一个音其实是一串音',       status: 'ready' },
          { id: '01-temperament', no: '1', title: '十二平均律', sub: '2^(1/12) 是怎么被逼出来的', status: 'ready' },
          { id: '02-pitch',       no: '2', title: '音高与音名', sub: '音名、八度、等音',         status: 'ready' },
        ],
      },
      {
        id: 'interval',
        title: '二 · 两个音之间',
        blurb: '有了可以测量的音高坐标，谈距离才有意义。',
        lessons: [
          { id: '03-interval',   no: '3', title: '音程',         sub: '度数、音数、性质',     status: 'ready' },
          { id: '04-consonance', no: '4', title: '协和与不协和', sub: '为什么有的音会打起来', status: 'ready' },
        ],
      },
      {
        id: 'time',
        title: '三 · 时间',
        blurb: '音高是纵向的，节奏是横向的。',
        lessons: [
          { id: '05-duration',     no: '5', title: '音的长短',   sub: '音符与休止符',         status: 'ready' },
          { id: '06-meter',        no: '6', title: '节奏与节拍', sub: '拍号、强弱、切分音',   status: 'ready' },
          { id: '07-note-grouping', no: '7', title: '音值组合法', sub: '小节里的音符该怎么写', status: 'ready' },
        ],
      },
      {
        id: 'chord',
        title: '四 · 纵向结构',
        blurb: '把三个以上的音同时叠起来。',
        lessons: [
          { id: '08-triad',   no: '8', title: '三和弦', sub: '四种性质与转位', status: 'ready' },
          { id: '09-seventh', no: '9', title: '七和弦', sub: '属七与它的同类', status: 'ready' },
        ],
      },
      {
        id: 'key',
        title: '五 · 调',
        blurb: '给一堆音找一个引力中心，然后看这个中心能玩出多少花样。',
        lessons: [
          { id: '10-scale',       no: '10', title: '音阶与调式',       sub: '大调、小调、五声',           status: 'ready' },
          { id: '11-keysig',      no: '11', title: '调号与关系调',     sub: '五度圈',                     status: 'ready' },
          { id: '12-harmony',     no: '12', title: '调内和声',         sub: '功能与终止式',               status: 'ready' },
          { id: '13-modal-chords', no: '13', title: '调式中的音程与和弦', sub: '级数是形状，性质是长出来的', status: 'ready' },
          { id: '14-nonchord',    no: '14', title: '和弦外音',         sub: '旋律与和声的接口',           status: 'ready' },
          { id: '15-borrowed',    no: '15', title: '借用与副属和弦',   sub: '从隔壁调式和隔壁调借东西',   status: 'ready' },
          { id: '16-chromatic',   no: '16', title: '半音阶与变化音',   sub: '调式变音与半音阶的写法',     status: 'ready' },
          { id: '17-modulation',  no: '17', title: '调性关系',         sub: '离调、转调、移调',           status: 'ready' },
        ],
      },
      {
        id: 'folk',
        title: '六 · 民族调式',
        blurb: '五声与七声，另一套组织音高的办法。',
        lessons: [
          { id: '18-pentatonic-modes', no: '18', title: '五声与七声调式', sub: '宫商角徵羽与它的变体', status: 'ready' },
        ],
      },
      {
        id: 'notation',
        title: '七 · 记谱',
        blurb: '把上面这些写成别人读得懂的符号。',
        lessons: [
          { id: '19-notation',   no: '19', title: '记谱法与记号', sub: '谱号、装饰音、术语',       status: 'ready' },
          { id: '20-clefs-range', no: '20', title: '谱号与音域',  sub: '不同谱号、各种乐器能到哪', status: 'ready' },
          { id: '21-transposing', no: '21', title: '移调乐器',    sub: '为什么单簧管写的和听的不一样', status: 'ready' },
        ],
      },
      {
        id: 'oneStyle',
        title: '八 · 一个真实风格：布鲁斯',
        blurb: '把前面二十节学的东西，一次性用在一种真实存在的音乐上。',
        lessons: [
          { id: '22-blues', no: '22', title: '布鲁斯的元素组成', sub: '蓝调音、十二小节、shuffle', status: 'ready' },
        ],
      },
    ],
  },
  {
    id: 'craft',
    no: '第二部分',
    title: '编曲与作曲',
    blurb: '规则学会了就该用起来。这一部分从"一个念头"开始，一路走到能打印、能播放的成品。',
    tiers: [
      {
        id: 'material',
        title: '八 · 写作的材料',
        blurb: '一段音乐是怎么从一个小念头长出来的。',
        lessons: [
          { id: '23-motif',   no: '23', title: '动机与乐句', sub: '重复、模进、倒影与句读',   status: 'ready' },
          { id: '24-contour', no: '24', title: '旋律的轮廓', sub: '级进、跳进与拱形',         status: 'ready' },
          { id: '25-groove',  no: '25', title: '节奏与律动', sub: '律动型、奇数拍、复节奏',   status: 'ready' },
        ],
      },
      {
        id: 'layers',
        title: '九 · 纵向与层次',
        blurb: '听起来"满"的段落，底下一定分好了工。',
        lessons: [
          { id: '26-progression',   no: '26', title: '和弦进行的写法', sub: '功能、代理与借用',       status: 'ready' },
          { id: '27-texture',       no: '27', title: '低音线与织体',   sub: '谁在底下托着',           status: 'ready' },
          { id: '28-orchestration', no: '28', title: '音区与配器',     sub: '音域覆盖与功能分层',     status: 'ready' },
        ],
      },
      {
        id: 'form',
        title: '十 · 结构',
        blurb: '把材料拼成一首完整的曲子。',
        lessons: [
          { id: '29-form', no: '29', title: '曲式与结构', sub: '重复建立、对比更新、回归满足', status: 'ready' },
        ],
      },
      {
        id: 'musescore',
        title: '十一 · 工具：MuseScore',
        blurb: '用 MuseScore 4 把心里的东西变成能打印、能播放的谱子。',
        lessons: [
          { id: '30-musescore-basics',   no: '30', title: 'MuseScore 入门', sub: '新建乐谱、输入第一个音符', status: 'planned' },
          { id: '31-musescore-notation', no: '31', title: '记谱进阶',       sub: '记号、连线、力度与速度',   status: 'planned' },
          { id: '32-musescore-publish',  no: '32', title: '排版与导出',     sub: '整理成能给别人看的谱',     status: 'planned' },
        ],
      },
    ],
  },
  {
    id: 'analysis',
    no: '第三部分',
    title: '作品分析',
    blurb: '前面 29 节讲的是规则。这一部分把规则放回真实作品里，看它们在别人手里是怎么用的、什么时候被打破。',
    tiers: [
      {
        id: 'beethoven',
        title: '贝多芬',
        blurb: '动机驱动这条路的终点，也是它最有说服力的证明。',
        lessons: [
          { id: 'a-beethoven-5', no: 'A', title: '第五交响曲', sub: '四个音的重量', status: 'ready' },
          { id: 'b-beethoven-9', no: 'B', title: '第九交响曲', sub: '先翻旧账，再唱歌', status: 'ready' },
        ],
      },
      {
        id: 'baroque',
        title: '巴洛克',
        blurb: '重复与低音驱动的时代。',
        lessons: [
          { id: 'c-vivaldi-seasons', no: 'C', title: '维瓦尔第 · 四季', sub: '先有诗，还是先有音乐', status: 'ready' },
          { id: 'd-pachelbel-canon', no: 'D', title: '帕赫贝尔 · 卡农', sub: '一条循环，三百年', status: 'ready' },
          { id: 'e-bach-wtc-prelude', no: 'E', title: '巴赫 · 平均律第一册 C 大调前奏曲', sub: '一个音型，三十五小节', status: 'ready' },
        ],
      },
      {
        id: 'mozart',
        title: '莫扎特',
        blurb: '同样一套语法，写出来的东西能有多少差别。',
        lessons: [
          { id: 'f-mozart-figaro', no: 'F', title: '费加罗的婚礼', sub: '一个仆人赢了主人', status: 'ready' },
          { id: 'g-mozart-40', no: 'G', title: '第四十交响曲', sub: '六个星期的三首', status: 'ready' },
        ],
      },
      {
        id: 'russian',
        title: '俄罗斯与东欧',
        blurb: '民族调式、管弦乐色彩，以及乡愁。',
        lessons: [
          { id: 'h-borodin-dances', no: 'H', title: '鲍罗丁 · 波罗维茨舞曲', sub: '一个化学家写的歌剧', status: 'ready' },
          { id: 'i-borodin-quartet', no: 'I', title: '鲍罗丁 · 第二弦乐四重奏', sub: '四个人，没有指挥', status: 'ready' },
          { id: 'j-dvorak-9', no: 'J', title: '德沃夏克 · 第九交响曲', sub: '在纽约写的波希米亚', status: 'ready' },
        ],
      },
      {
        id: 'modern',
        title: '晚期浪漫与二十世纪',
        blurb: '规则在这里被推到极限，然后被换掉。',
        lessons: [
          { id: 'k-wagner-tristan', no: 'K', title: '瓦格纳 · 特里斯坦前奏曲', sub: '一个和弦，悬了一百多年', status: 'ready' },
          { id: 'l-debussy-clair', no: 'L', title: '德彪西 · 月光', sub: '把引力关掉', status: 'ready' },
          { id: 'm-stravinsky-rite', no: 'M', title: '斯特拉文斯基 · 春之祭', sub: '节奏变成主角之后', status: 'ready' },
          { id: 'n-ravel-bolero', no: 'N', title: '拉威尔 · 波莱罗', sub: '十五分钟的渐强', status: 'ready' },
        ],
      },
      {
        id: 'anime-windband',
        title: '动画与管乐',
        blurb: '《吹响！上低音号》里的竞演曲。这一层的三首都是现代作品——没有公版谱可用，所以分析的落点在结构、制度、编制和听法上。',
        lessons: [
          { id: 'q-mikazuki', no: 'O', title: '三日月之舞', sub: '一场独奏掀起的风波', status: 'ready' },
          { id: 'r-provence', no: 'P', title: '普罗旺斯的风', sub: '一支没有弦乐的乐队', status: 'ready' },
          { id: 's-liz-to-aoi-tori', no: 'Q', title: '利兹与青鸟', sub: '两个声音的契合与不契合', status: 'ready' },
        ],
      },
    ],
  },
  {
    id: 'styles',
    no: '第四部分',
    title: '音乐风格解析',
    blurb: '爵士、摇滚、世界音乐……每种风格都由一组有限的手法和习惯组成。这一部分把它们拆开看：先说清这套音乐是用什么做的，再说它是从哪儿来的、谁把它带出去的。',
    reserved: '这一部分慢慢补。放在最后是有意的 —— 新内容往后加，前面章节的编号就不用反复改。',
    tiers: [
      {
        id: 'styles-core',
        title: '一 · 一套音乐是怎么做出来的',
        blurb: '一种风格能被认出来，靠的往往不是音色，而是几条固定的手法。',
        lessons: [
          { id: 'o-afrobeat', no: 'R', title: 'Afrobeat', sub: '鼓是主旋律', status: 'ready' },
          { id: 'p-raga', no: 'S', title: '拉格（Raga）', sub: '一个框架，九成靠即兴', status: 'ready' },
        ],
      },
    ],
  },
];

/** 把层压平，并带上所属部分的信息。 */
export const TIERS = PARTS.flatMap((part) =>
  part.tiers.map((tier) => ({
    ...tier,
    partId: part.id,
    partNo: part.no,
    partTitle: part.title,
  })));

/** 把所有节压平，方便按顺序找上一课 / 下一课。 */
export const LESSONS = TIERS.flatMap((tier) =>
  tier.lessons.map((lesson) => ({
    ...lesson,
    tierId: tier.id,
    tierTitle: tier.title,
    partId: tier.partId,
    partNo: tier.partNo,
    partTitle: tier.partTitle,
  })));

/** 从站点根算起的相对路径，例如 "lessons/00-harmonics/"。 */
export function hrefOf(lesson) {
  return `lessons/${lesson.id}/`;
}

export function findLesson(id) {
  return LESSONS.find((l) => l.id === id) ?? null;
}

export function neighbours(id) {
  const i = LESSONS.findIndex((l) => l.id === id);
  if (i < 0) return { prev: null, next: null };
  return { prev: LESSONS[i - 1] ?? null, next: LESSONS[i + 1] ?? null };
}
