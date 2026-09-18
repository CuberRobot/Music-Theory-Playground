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
          { id: '23-motif',   no: '23', title: '动机与乐句', sub: '重复、模进、倒影与句读',   status: 'planned' },
          { id: '24-contour', no: '24', title: '旋律的轮廓', sub: '级进、跳进与拱形',         status: 'planned' },
          { id: '25-groove',  no: '25', title: '节奏与律动', sub: '律动型、奇数拍、复节奏',   status: 'planned' },
        ],
      },
      {
        id: 'layers',
        title: '九 · 纵向与层次',
        blurb: '听起来"满"的段落，底下一定分好了工。',
        lessons: [
          { id: '26-progression',   no: '26', title: '和弦进行的写法', sub: '功能、代理与借用',       status: 'planned' },
          { id: '27-texture',       no: '27', title: '低音线与织体',   sub: '谁在底下托着',           status: 'planned' },
          { id: '28-orchestration', no: '28', title: '音区与配器',     sub: '音域覆盖与功能分层',     status: 'planned' },
        ],
      },
      {
        id: 'form',
        title: '十 · 结构',
        blurb: '把材料拼成一首完整的曲子。',
        lessons: [
          { id: '29-form', no: '29', title: '曲式与结构', sub: '重复建立、对比更新、回归满足', status: 'planned' },
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
    blurb: '拿真实作品当例子，看前面学到的规则在别人手里是怎么用的。',
    reserved: '这一部分先占个位置。要分析哪些作品还没定，定了再往里放。',
    tiers: [],
  },
  {
    id: 'styles',
    no: '第四部分',
    title: '音乐风格解析',
    blurb: '布鲁斯、爵士、摇滚、前卫摇滚、世界音乐……每种风格都由一组有限的手法和习惯组成。这一部分把它们拆开看。',
    reserved: '这一部分慢慢补。放在最后是有意的 —— 新内容往后加，前面章节的编号就不用反复改。',
    tiers: [],
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
