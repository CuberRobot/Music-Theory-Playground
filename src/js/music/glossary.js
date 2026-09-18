/**
 * 术语词典的数据。
 *
 * 排序原则：以国际通用的英文术语为主条目，中文作为对照。
 * 查资料、看英文教程、读软件界面时，认识英文名字比认识中文译名更有用，
 * 而且中文译名本身有多个版本（比如 leading tone 有人译"导音"有人译"导音级"）。
 *
 * 每条：en 英文名 / zh 中文名 / def 一句话解释 / lesson 去哪一节看 / cat 分类
 */

export const CATEGORIES = [
  { id: 'sound',    title: '声音与音高' },
  { id: 'interval', title: '音程' },
  { id: 'scale',    title: '音阶与调' },
  { id: 'chord',    title: '和弦' },
  { id: 'rhythm',   title: '节奏与时间' },
  { id: 'notation', title: '记谱与记号' },
  { id: 'harmony',  title: '和声与写作' },
];

export const TERMS = [
  // --- 声音与音高 -----------------------------------------------------------
  { en: 'Pitch', zh: '音高', cat: 'sound', lesson: '02-pitch', def: '声音的高低，由频率决定。' },
  { en: 'Frequency', zh: '频率', cat: 'sound', lesson: '00-harmonics', def: '每秒振动多少次，单位赫兹。' },
  { en: 'Hertz (Hz)', zh: '赫兹', cat: 'sound', lesson: '02-pitch', def: '频率的单位，440 Hz 就是每秒 440 次。' },
  { en: 'Standard pitch', zh: '标准音', cat: 'sound', lesson: '02-pitch', def: '调音的基准，现行标准是 A4 = 440 Hz。' },
  { en: 'Fundamental', zh: '基音', cat: 'sound', lesson: '00-harmonics', def: '泛音列里最低的那个频率 f，决定音高。' },
  { en: 'Overtone', zh: '泛音', cat: 'sound', lesson: '00-harmonics', def: '基音以上那些整数倍的频率。' },
  { en: 'Harmonic series', zh: '泛音列', cat: 'sound', lesson: '00-harmonics', def: 'f、2f、3f…… 一整串频率，音程就是从它数出来的。' },
  { en: 'Timbre', zh: '音色', cat: 'sound', lesson: '00-harmonics', def: '泛音的强弱配比。同一个音高，配比不同就是不同乐器。' },
  { en: 'Missing fundamental', zh: '缺失基频', cat: 'sound', lesson: '00-harmonics', def: '拿掉基音，音高仍在，因为耳朵算的是整串的公共周期。' },
  { en: 'Cent', zh: '音分', cat: 'sound', lesson: '01-temperament', def: '把八度分成 1200 份，用来比较律制误差。' },
  { en: 'Equal temperament', zh: '十二平均律', cat: 'sound', lesson: '01-temperament', def: '八度保持 2:1，八度内十二等分，半音比 2^(1/12)。' },
  { en: 'Just intonation', zh: '纯律', cat: 'sound', lesson: '04-consonance', def: '按泛音列的整数比调音，音程很纯但不能自由转调。' },
  { en: 'Pythagorean comma', zh: '毕达哥拉斯逗号', cat: 'sound', lesson: '01-temperament', def: '12 个纯五度比 7 个八度多出 23.46 音分。' },
  { en: 'Wolf fifth', zh: '狼五度', cat: 'sound', lesson: '01-temperament', def: '纯律链条里被压小的那个五度（约 678.5），听起来像狼嚎。' },
  { en: 'Octave', zh: '八度', cat: 'sound', lesson: '02-pitch', def: '频率比 2:1，最不容妥协的音程。' },
  { en: 'Semitone', zh: '半音', cat: 'sound', lesson: '02-pitch', def: '十二平均律里最小的单位，100 音分。' },
  { en: 'Whole tone', zh: '全音', cat: 'sound', lesson: '02-pitch', def: '两个半音，200 音分。' },
  { en: 'Pitch class', zh: '音类', cat: 'sound', lesson: '02-pitch', def: '忽略八度之后剩下的音高身份，C4 和 C5 是同一个音类。' },
  { en: 'Register', zh: '音组 / 音区', cat: 'sound', lesson: '02-pitch', def: '用来区分不同八度里的同名音，如小字一组。' },
  { en: 'Range', zh: '音域', cat: 'sound', lesson: '02-pitch', def: '一件乐器或一个人能唱奏的最低到最高。' },
  { en: 'Enharmonic', zh: '等音', cat: 'sound', lesson: '02-pitch', def: '同一个键、同一个频率、两个名字，如 C♯ 与 D♭。' },
  { en: 'Sharp', zh: '升号', cat: 'sound', lesson: '02-pitch', def: '升高半音，写作 ♯。' },
  { en: 'Flat', zh: '降号', cat: 'sound', lesson: '02-pitch', def: '降低半音，写作 ♭。' },
  { en: 'Natural', zh: '还原号', cat: 'sound', lesson: '19-notation', def: '取消前面的升降，写作 ♮。' },
  { en: 'Accidental', zh: '变音记号', cat: 'sound', lesson: '02-pitch', def: '升降还原号的总称。' },

  // --- 音程 -----------------------------------------------------------------
  { en: 'Interval', zh: '音程', cat: 'interval', lesson: '03-interval', def: '两个音之间的距离。' },
  { en: 'Interval number', zh: '度数', cat: 'interval', lesson: '03-interval', def: '跨过几个字母，两头都算。C 到 G 是五度。' },
  { en: 'Number of semitones', zh: '音数', cat: 'interval', lesson: '03-interval', def: '相差几个半音。C 到 G 是 7。' },
  { en: 'Interval quality', zh: '音程性质', cat: 'interval', lesson: '03-interval', def: '大、小、纯、增、减，同一个度数下再细分。' },
  { en: 'Perfect', zh: '纯', cat: 'interval', lesson: '03-interval', def: '只用于一、四、五、八度。' },
  { en: 'Major', zh: '大', cat: 'interval', lesson: '03-interval', def: '二、三、六、七度里较大的那个。' },
  { en: 'Minor', zh: '小', cat: 'interval', lesson: '03-interval', def: '二、三、六、七度里较小的那个，比大音程少半音。' },
  { en: 'Augmented', zh: '增', cat: 'interval', lesson: '03-interval', def: '比纯或大音程还多半音。' },
  { en: 'Diminished', zh: '减', cat: 'interval', lesson: '03-interval', def: '比纯或小音程还少半音。' },
  { en: 'Simple interval', zh: '单音程', cat: 'interval', lesson: '03-interval', def: '八度以内。' },
  { en: 'Compound interval', zh: '复音程', cat: 'interval', lesson: '03-interval', def: '超过一个八度，如九度、十度。' },
  { en: 'Inversion', zh: '转位', cat: 'interval', lesson: '03-interval', def: '把低音升八度或高音降八度，度数相加等于 9。' },
  { en: 'Consonance', zh: '协和', cat: 'interval', lesson: '04-consonance', def: '泛音能在低阶对上的音程。' },
  { en: 'Dissonance', zh: '不协和', cat: 'interval', lesson: '04-consonance', def: '泛音对不上，听起来发扎。' },
  { en: 'Perfect consonance', zh: '完全协和', cat: 'interval', lesson: '04-consonance', def: '最简比的两个数都不超过 4：八度、五度、四度。' },
  { en: 'Imperfect consonance', zh: '不完全协和', cat: 'interval', lesson: '04-consonance', def: '最简比不超过 8：大小三度、大小六度。' },
  { en: 'Tritone', zh: '三全音', cat: 'interval', lesson: '04-consonance', def: '三个全音，增四度或减五度，最不稳定的音程。' },
  { en: 'Beating', zh: '拍频', cat: 'interval', lesson: '04-consonance', def: '两个接近的频率互相干涉造成的抖动。' },
  { en: 'Diatonic', zh: '自然音', cat: 'interval', lesson: '03-interval', def: '属于当前调的音。' },
  { en: 'Chromatic', zh: '变化音', cat: 'interval', lesson: '03-interval', def: '不属于当前调、需要加升降号的音。' },

  // --- 音阶与调 -------------------------------------------------------------
  { en: 'Scale', zh: '音阶', cat: 'scale', lesson: '10-scale', def: '一批音按高度排好，围绕主音组织。' },
  { en: 'Mode', zh: '调式', cat: 'scale', lesson: '10-scale', def: '音的排列方式与中心。同一批音换个主音就是另一种调式。' },
  { en: 'Key', zh: '调', cat: 'scale', lesson: '10-scale', def: '一个主音加上它所属的音阶体系。' },
  { en: 'Tonic', zh: '主音', cat: 'scale', lesson: '10-scale', def: '第一级，最稳定，是"家"。' },
  { en: 'Supertonic', zh: '上主音', cat: 'scale', lesson: '10-scale', def: '第二级。' },
  { en: 'Mediant', zh: '中音', cat: 'scale', lesson: '10-scale', def: '第三级，决定大小调明暗的那个音。' },
  { en: 'Subdominant', zh: '下属音', cat: 'scale', lesson: '10-scale', def: '第四级。' },
  { en: 'Dominant', zh: '属音', cat: 'scale', lesson: '10-scale', def: '第五级，除主音外最稳定。' },
  { en: 'Submediant', zh: '下中音', cat: 'scale', lesson: '10-scale', def: '第六级。' },
  { en: 'Leading tone', zh: '导音', cat: 'scale', lesson: '10-scale', def: '第七级，离主音只有半音，最想解决。' },
  { en: 'Subtonic', zh: '下主音', cat: 'scale', lesson: '10-scale', def: '自然小调的第七级，离主音是全音，没有导音的拉力。' },
  { en: 'Major scale', zh: '大调音阶', cat: 'scale', lesson: '10-scale', def: '全全半全全全半。' },
  { en: 'Natural minor', zh: '自然小调', cat: 'scale', lesson: '10-scale', def: '全半全全半全全，是关系大调的同一批音。' },
  { en: 'Harmonic minor', zh: '和声小调', cat: 'scale', lesson: '10-scale', def: '自然小调把第七级升高半音，造出真正的导音。' },
  { en: 'Melodic minor', zh: '旋律小调', cat: 'scale', lesson: '10-scale', def: '上行升第六、七级，下行还原。' },
  { en: 'Pentatonic', zh: '五声音阶', cat: 'scale', lesson: '10-scale', def: '去掉两个最有张力的音，怎么弹都不难听。' },
  { en: 'Ionian', zh: '伊奥尼亚', cat: 'scale', lesson: '10-scale', def: '教会调式第一种，等于大调。' },
  { en: 'Dorian', zh: '多利亚', cat: 'scale', lesson: '10-scale', def: '教会调式第二种，小调色彩但第六级升高。' },
  { en: 'Phrygian', zh: '弗里吉亚', cat: 'scale', lesson: '10-scale', def: '教会调式第三种，第二级特别低，西班牙味。' },
  { en: 'Lydian', zh: '利底亚', cat: 'scale', lesson: '10-scale', def: '教会调式第四种，第四级升高，明亮而悬。' },
  { en: 'Mixolydian', zh: '混合利底亚', cat: 'scale', lesson: '10-scale', def: '教会调式第五种，大调但第七级降低，布鲁斯味。' },
  { en: 'Aeolian', zh: '爱奥利亚', cat: 'scale', lesson: '10-scale', def: '教会调式第六种，等于自然小调。' },
  { en: 'Locrian', zh: '洛克里亚', cat: 'scale', lesson: '10-scale', def: '教会调式第七种，主和弦是减三和弦，最不稳定。' },
  { en: 'Key signature', zh: '调号', cat: 'scale', lesson: '11-keysig', def: '写在谱号后面，集中标明这一行里哪些音要升降。' },
  { en: 'Circle of fifths', zh: '五度圈', cat: 'scale', lesson: '11-keysig', def: '十二个调按纯五度排成的圈，也是调性地图。' },
  { en: 'Relative keys', zh: '关系大小调', cat: 'scale', lesson: '11-keysig', def: '共用同一批音和同一个调号，主音相差小三度。' },
  { en: 'Parallel keys', zh: '同主音大小调', cat: 'scale', lesson: '11-keysig', def: '主音相同、音不同的两个调，如 C 大调与 c 小调。' },
  { en: 'Transposition', zh: '移调', cat: 'scale', lesson: '17-modulation', def: '整首曲子换个高度，内部关系完全不变。' },
  { en: 'Modulation', zh: '转调', cat: 'scale', lesson: '17-modulation', def: '真的换了调，原来的调不再回来。' },
  { en: 'Tonicization', zh: '离调', cat: 'scale', lesson: '17-modulation', def: '临时去别的调转一下，很快回来。' },
  { en: 'Pivot chord', zh: '共同和弦', cat: 'scale', lesson: '17-modulation', def: '两个调都认的和弦，用来当转调的枢轴。' },

  // --- 和弦 -----------------------------------------------------------------
  { en: 'Chord', zh: '和弦', cat: 'chord', lesson: '08-triad', def: '三个以上的音同时发响。' },
  { en: 'Triad', zh: '三和弦', cat: 'chord', lesson: '08-triad', def: '根音加两个三度叠成。' },
  { en: 'Root', zh: '根音', cat: 'chord', lesson: '08-triad', def: '和弦所依据的那个音，不一定在最低。' },
  { en: 'Third', zh: '三音', cat: 'chord', lesson: '08-triad', def: '决定和弦是大还是小。' },
  { en: 'Fifth', zh: '五音', cat: 'chord', lesson: '08-triad', def: '决定和弦是纯、减还是增。' },
  { en: 'Major triad', zh: '大三和弦', cat: 'chord', lesson: '08-triad', def: '下面大三度、上面小三度，明亮。' },
  { en: 'Minor triad', zh: '小三和弦', cat: 'chord', lesson: '08-triad', def: '下面小三度、上面大三度，柔和。' },
  { en: 'Augmented triad', zh: '增三和弦', cat: 'chord', lesson: '08-triad', def: '两个都是大三度，悬着不落地。' },
  { en: 'Diminished triad', zh: '减三和弦', cat: 'chord', lesson: '08-triad', def: '两个都是小三度，紧张。' },
  { en: 'Seventh chord', zh: '七和弦', cat: 'chord', lesson: '09-seventh', def: '三和弦再叠一个三度，最高音到根音是七度。' },
  { en: 'Dominant seventh', zh: '属七和弦', cat: 'chord', lesson: '09-seventh', def: '0 4 7 10，内含三全音，最想解决。' },
  { en: 'Major seventh', zh: '大七和弦', cat: 'chord', lesson: '09-seventh', def: '0 4 7 11，安静、像不动的照片。' },
  { en: 'Minor seventh', zh: '小七和弦', cat: 'chord', lesson: '09-seventh', def: '0 3 7 10，流行歌里最常见的小和弦。' },
  { en: 'Half-diminished seventh', zh: '半减七和弦', cat: 'chord', lesson: '09-seventh', def: '0 3 6 10，大调第七级、小调第二级。' },
  { en: 'Diminished seventh', zh: '减七和弦', cat: 'chord', lesson: '09-seventh', def: '0 3 6 9，四个音等距，强烈的转调工具。' },
  { en: 'Chord inversion', zh: '和弦转位', cat: 'chord', lesson: '08-triad', def: '换低音，构成音不变，稳定感改变。' },
  { en: 'Slash chord', zh: '斜线和弦', cat: 'chord', lesson: '27-texture', def: '写作 C/G，指低音用 G。' },

  // --- 节奏与时间 -----------------------------------------------------------
  { en: 'Beat', zh: '拍', cat: 'rhythm', lesson: '06-meter', def: '音乐的基本时间单位。' },
  { en: 'Meter', zh: '节拍', cat: 'rhythm', lesson: '06-meter', def: '拍的组织方式，重点是强弱循环。' },
  { en: 'Time signature', zh: '拍号', cat: 'rhythm', lesson: '06-meter', def: '分子是每小节几拍，分母是以什么音符为一拍。' },
  { en: 'Rhythm', zh: '节奏', cat: 'rhythm', lesson: '06-meter', def: '具体哪个音在什么时候响、响多久。' },
  { en: 'Note value', zh: '时值', cat: 'rhythm', lesson: '05-duration', def: '一个音持续多久。' },
  { en: 'Whole note', zh: '全音符', cat: 'rhythm', lesson: '05-duration', def: '四拍，时值体系的对半切起点。' },
  { en: 'Half note', zh: '二分音符', cat: 'rhythm', lesson: '05-duration', def: '两拍。' },
  { en: 'Quarter note', zh: '四分音符', cat: 'rhythm', lesson: '05-duration', def: '一拍，最常见的基准。' },
  { en: 'Eighth note', zh: '八分音符', cat: 'rhythm', lesson: '05-duration', def: '半拍。' },
  { en: 'Sixteenth note', zh: '十六分音符', cat: 'rhythm', lesson: '05-duration', def: '四分之一拍。' },
  { en: 'Rest', zh: '休止符', cat: 'rhythm', lesson: '05-duration', def: '不发音但占时间，长度要精确数出来。' },
  { en: 'Dot', zh: '附点', cat: 'rhythm', lesson: '05-duration', def: '时值增加一半。附点四分音符 = 1.5 拍。' },
  { en: 'Tie', zh: '延音线', cat: 'rhythm', lesson: '05-duration', def: '把两个同音高的音连起来，时值相加。' },
  { en: 'Tuplet', zh: '连音符', cat: 'rhythm', lesson: '05-duration', def: '把原本的等分改成另一种等分。' },
  { en: 'Triplet', zh: '三连音', cat: 'rhythm', lesson: '05-duration', def: '把 2 等分改成 3 等分。' },
  { en: 'Simple meter', zh: '单拍子', cat: 'rhythm', lesson: '06-meter', def: '每小节只有一个强拍，如 2/4、3/4、4/4。' },
  { en: 'Compound meter', zh: '复拍子', cat: 'rhythm', lesson: '06-meter', def: '几个单拍子合并，如 6/8 其实是两个 3/8。' },
  { en: 'Syncopation', zh: '切分音', cat: 'rhythm', lesson: '06-meter', def: '让音从弱拍起、持续到强拍，把重音抢过来。' },
  { en: 'Anacrusis', zh: '弱起', cat: 'rhythm', lesson: '06-meter', def: '音乐从弱拍或更早的位置进入，也叫不完全小节。' },
  { en: 'Tempo', zh: '速度', cat: 'rhythm', lesson: '19-notation', def: '整体快慢。改变它不影响音符之间的比例。' },
  { en: 'BPM', zh: '每分钟拍数', cat: 'rhythm', lesson: '19-notation', def: '速度的精确写法，如 <span class="note" role="img" aria-label="四分音符"></span>= 120。' },
  { en: 'Dynamics', zh: '力度', cat: 'rhythm', lesson: '19-notation', def: '音量的大小，从 pp 到 ff。' },
  { en: 'Groove', zh: '律动', cat: 'rhythm', lesson: '25-groove', def: '一段反复出现、带推动力的节奏型。' },

  // --- 记谱与记号 -----------------------------------------------------------
  { en: 'Staff', zh: '五线谱', cat: 'notation', lesson: '19-notation', def: '五条线加四个间，位置决定音高。' },
  { en: 'Clef', zh: '谱号', cat: 'notation', lesson: '19-notation', def: '定下谱表的基准音。' },
  { en: 'Treble clef', zh: '高音谱号', cat: 'notation', lesson: '19-notation', def: '把中央 C 定在下加一线上。' },
  { en: 'Bass clef', zh: '低音谱号', cat: 'notation', lesson: '19-notation', def: '把中央 C 定在最上面那条线上。' },
  { en: 'Ledger line', zh: '加线', cat: 'notation', lesson: '19-notation', def: '谱表上下临时加的短线，用来写超出五线的音。' },
  { en: 'Grand staff', zh: '大谱表', cat: 'notation', lesson: '19-notation', def: '高低音谱表用大括号连起来，钢琴用。' },
  { en: 'Measure', zh: '小节', cat: 'notation', lesson: '05-duration', def: '两条小节线之间的部分。' },
  { en: 'Barline', zh: '小节线', cat: 'notation', lesson: '19-notation', def: '划分小节的竖线。' },
  { en: 'Ornament', zh: '装饰音', cat: 'notation', lesson: '19-notation', def: '写一个符号、听起来是一串音的记号。' },
  { en: 'Trill', zh: '颤音', cat: 'notation', lesson: '19-notation', def: '本音与上方邻音快速交替，记作 tr。' },
  { en: 'Slur', zh: '连音线', cat: 'notation', lesson: '19-notation', def: '把不同音高的音连起来，表示演奏得连贯。' },
  { en: 'Staccato', zh: '断奏', cat: 'notation', lesson: '19-notation', def: '音符上方加小点，演奏得短促。' },
  { en: 'Fermata', zh: '延长记号', cat: 'notation', lesson: '19-notation', def: '自由延长，记作一个半圆加一点。' },
  { en: 'Repeat sign', zh: '反复记号', cat: 'notation', lesson: '19-notation', def: '指示把某段再来一遍。' },
  { en: 'Octave sign', zh: '八度记号', cat: 'notation', lesson: '19-notation', def: '记作 8va，表示整段移高或移低八度，为了少写加线。' },

  // --- 和声与写作 -----------------------------------------------------------
  { en: 'Harmony', zh: '和声', cat: 'harmony', lesson: '12-harmony', def: '多个音同时发响所形成的纵向关系。' },
  { en: 'Function', zh: '功能', cat: 'harmony', lesson: '12-harmony', def: '和弦在调里扮演的角色：主、下属、属。' },
  { en: 'Tonic function', zh: '主功能', cat: 'harmony', lesson: '12-harmony', def: 'I、vi、iii，稳定，可以停。' },
  { en: 'Subdominant function', zh: '下属功能', cat: 'harmony', lesson: '12-harmony', def: 'IV、ii，往外走。' },
  { en: 'Dominant function', zh: '属功能', cat: 'harmony', lesson: '12-harmony', def: 'V、vii°，最不安定，最想回主。' },
  { en: 'Cadence', zh: '终止式', cat: 'harmony', lesson: '12-harmony', def: '音乐收束的方式。' },
  { en: 'Authentic cadence', zh: '正格终止', cat: 'harmony', lesson: '12-harmony', def: 'V → I，最干脆的收束。' },
  { en: 'Plagal cadence', zh: '变格终止', cat: 'harmony', lesson: '12-harmony', def: 'IV → I，柔和的收束。' },
  { en: 'Deceptive cadence', zh: '阻碍终止', cat: 'harmony', lesson: '12-harmony', def: 'V 之后接到 vi，以为要结束却拐了个弯。' },
  { en: 'Roman numeral', zh: '罗马数字标记', cat: 'harmony', lesson: '12-harmony', def: '用 I–VII 标调内和弦，大写是大三、小写是小三。' },
  { en: 'Diatonic chord', zh: '调内和弦', cat: 'harmony', lesson: '12-harmony', def: '音阶自己长出来的和弦，性质不由人挑。' },
  { en: 'Chord progression', zh: '和弦进行', cat: 'harmony', lesson: '12-harmony', def: '和弦按时间排成的序列。' },
  { en: 'Secondary dominant', zh: '副属和弦', cat: 'harmony', lesson: '26-progression', def: '临时把某个和弦当成主音，给它配一个属和弦。' },
  { en: 'Borrowed chord', zh: '借用和弦', cat: 'harmony', lesson: '26-progression', def: '从同主音的另一调借来的和弦，比如大调里借小调的 iv。' },
  { en: 'Motif', zh: '动机', cat: 'harmony', lesson: '23-motif', def: '最短的、能被认出来的音乐念头。' },
  { en: 'Phrase', zh: '乐句', cat: 'harmony', lesson: '23-motif', def: '一句完整的话，通常 2 到 4 小节。' },
  { en: 'Sequence', zh: '模进', cat: 'harmony', lesson: '23-motif', def: '把同一个动机换个高度再说一遍。' },
  { en: 'Melody', zh: '旋律', cat: 'harmony', lesson: '24-contour', def: '横向进行、被听成一条线的那串音。' },
  { en: 'Contour', zh: '旋律轮廓', cat: 'harmony', lesson: '24-contour', def: '旋律上下的形状，先看整体再抠细节。' },
  { en: 'Step', zh: '级进', cat: 'harmony', lesson: '24-contour', def: '相邻音级之间移动，平滑。' },
  { en: 'Skip', zh: '跳进', cat: 'harmony', lesson: '24-contour', def: '跳过音级移动，有冲劲。' },
  { en: 'Texture', zh: '织体', cat: 'harmony', lesson: '27-texture', def: '各个层次怎么分布，谁在旋律、谁在伴奏。' },
  { en: 'Voicing', zh: '声部排列', cat: 'harmony', lesson: '28-orchestration', def: '同一个和弦，具体把音摆在哪些高度。' },
  { en: 'Form', zh: '曲式', cat: 'harmony', lesson: '29-form', def: '整首曲子的结构，比如 AABA、主歌副歌。' },
];

/** 速度术语。BPM 是常见区间，不是硬性规定。 */
export const TEMPO_TERMS = [
  { it: 'Largo', zh: '广板', bpm: '40–60', note: '极慢、庄重' },
  { it: 'Adagio', zh: '柔板', bpm: '60–76', note: '慢而从容' },
  { it: 'Andante', zh: '行板', bpm: '76–108', note: '像走路一样' },
  { it: 'Moderato', zh: '中板', bpm: '108–120', note: '中等' },
  { it: 'Allegro', zh: '快板', bpm: '120–156', note: '明快' },
  { it: 'Presto', zh: '急板', bpm: '168–200', note: '极快' },
];

/** 力度记号。 */
export const DYNAMICS = [
  { mark: 'pp', it: 'pianissimo', zh: '很弱' },
  { mark: 'p',  it: 'piano', zh: '弱' },
  { mark: 'mp', it: 'mezzo-piano', zh: '中弱' },
  { mark: 'mf', it: 'mezzo-forte', zh: '中强' },
  { mark: 'f',  it: 'forte', zh: '强' },
  { mark: 'ff', it: 'fortissimo', zh: '很强' },
];

/** 搜索：英文、中文、释义三处都匹配。 */
export function searchTerms(query, list = TERMS) {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((t) =>
    t.en.toLowerCase().includes(q)
    || t.zh.includes(query.trim())
    || t.def.includes(query.trim()));
}
