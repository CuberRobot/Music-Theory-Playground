/**
 * 课程结构。这是全站唯一的学习路径真源：
 * 首页的学习地图、每一页左侧的目录、上一课 / 下一课，全都从这里读。
 *
 * 顺序原则：从物理性质往上建。先讲清"一个音是什么"（泛音列），
 * 再讲清"音高之间怎么定标尺"（平均律），然后才谈音程、和弦、调。
 */

export const TIERS = [
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
      { id: '03-interval',   no: '3', title: '音程',         sub: '度数、音数、性质',       status: 'ready' },
      { id: '04-consonance', no: '4', title: '协和与不协和', sub: '为什么有的音会打起来',   status: 'ready' },
    ],
  },
  {
    id: 'time',
    title: '三 · 时间',
    blurb: '音高是纵向的，节奏是横向的。',
    lessons: [
      { id: '05-duration', no: '5', title: '音的长短',   sub: '音符与休止符',       status: 'ready' },
      { id: '06-meter',    no: '6', title: '节奏与节拍', sub: '拍号、强弱、切分音', status: 'ready' },
    ],
  },
  {
    id: 'chord',
    title: '四 · 纵向结构',
    blurb: '把三个以上的音同时叠起来。',
    lessons: [
      { id: '07-triad',   no: '7', title: '三和弦', sub: '四种性质与转位', status: 'ready' },
      { id: '08-seventh', no: '8', title: '七和弦', sub: '属七与它的同类', status: 'ready' },
    ],
  },
  {
    id: 'key',
    title: '五 · 调',
    blurb: '给一堆音找一个引力中心。',
    lessons: [
      { id: '09-scale',      no: '9',  title: '音阶与调式',   sub: '大调、小调、五声', status: 'ready' },
      { id: '10-keysig',     no: '10', title: '调号与关系调', sub: '五度圈',           status: 'ready' },
      { id: '11-harmony',    no: '11', title: '调内和声',     sub: '功能与终止式',     status: 'ready' },
      { id: '12-modulation', no: '12', title: '调性关系',     sub: '离调、转调、移调', status: 'ready' },
    ],
  },
  {
    id: 'notation',
    title: '六 · 记谱',
    blurb: '把上面这些写成别人读得懂的符号。',
    lessons: [
      { id: '13-notation', no: '13', title: '记谱法与记号', sub: '谱号、装饰音、术语', status: 'ready' },
    ],
  },
];

/** 把所有层压平，方便按顺序找上一课 / 下一课。 */
export const LESSONS = TIERS.flatMap((tier) =>
  tier.lessons.map((lesson) => ({ ...lesson, tierTitle: tier.title, tierId: tier.id })),
);

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
