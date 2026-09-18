/**
 * 时值与节拍。以四分音符为 1 拍。
 */

/** 音符时值。dots 表示附点，tuplet 表示连音。 */
export const DURATIONS = [
  { key: 'whole',    label: '全音符',   beats: 4,    dots: 0 },
  { key: 'half',     label: '二分音符', beats: 2,    dots: 0 },
  { key: 'quarter',  label: '四分音符', beats: 1,    dots: 0 },
  { key: 'eighth',   label: '八分音符', beats: 0.5,  dots: 0 },
  { key: 'sixteenth',label: '十六分音符', beats: 0.25, dots: 0 },
  { key: 'dottedHalf',   label: '附点二分音符', beats: 3,    dots: 1 },
  { key: 'dottedQuarter',label: '附点四分音符', beats: 1.5,  dots: 1 },
  { key: 'dottedEighth', label: '附点八分音符', beats: 0.75, dots: 1 },
];

export function durationByKey(key) {
  return DURATIONS.find((d) => d.key === key) ?? DURATIONS[2];
}

/**
 * 拍号与强弱规律。weight 是相对的重音强度，只用来画强弱梯度，
 * 不是声学上的分贝值。
 */
export const METERS = [
  { sig: '2/4', beats: 2, unit: 4, weights: [1, 0.35],                 kind: '单拍子' },
  { sig: '3/4', beats: 3, unit: 4, weights: [1, 0.35, 0.35],           kind: '单拍子' },
  { sig: '4/4', beats: 4, unit: 4, weights: [1, 0.35, 0.7, 0.35],      kind: '单拍子' },
  { sig: '3/8', beats: 3, unit: 8, weights: [1, 0.3, 0.3],             kind: '单拍子' },
  { sig: '6/8', beats: 6, unit: 8, weights: [1, 0.3, 0.3, 0.7, 0.3, 0.3], kind: '复拍子' },
];

export function meterBySig(sig) {
  return METERS.find((m) => m.sig === sig) ?? METERS[2];
}

/** 把一个拍号展开成"每格多少拍"的网格。6/8 按八分音符分格。 */
export function gridStep(meter) {
  return meter.unit === 8 ? 0.5 : 1;
}

/**
 * 判断一组时值能不能正好填满一个小节。
 * 浮点数直接比较会出错，所以按 1/16 拍为单位取整后再比。
 */
export function fitsMeasure(durations, beatsPerMeasure) {
  const total = durations.reduce((a, b) => a + b, 0);
  return Math.round(total * 16) === Math.round(beatsPerMeasure * 16);
}
