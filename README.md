# Music Theory Playground

> 看得见的乐理 · *See it, play it, hear it.*

**一个用交互实验台讲乐理的静态网站。** 每个概念都配一个能拖、能听、能立刻看到结果的台子：
泛音列可以一个一个关掉听，五度的音分可以拖着看整圈会不会合上，卡农的四个声部可以看着它们依次进来。

**线上站** → https://cuberrobot.github.io/Music-Theory-Playground/
　**关于** → [关于这一站](about/)　**更新记录** → [维护历史](changelog/)

当前版本 **v1.0.0**（2026-09-25）。纯前端、零依赖、零构建、**没有任何音频文件**
——所有声音都是浏览器里当场合成的，所以整个仓库不到 8MB，离线也能跑。

---

## 现在有什么

| 部分 | 内容 | 数量 |
| --- | --- | --- |
| 一 · 乐理基础 | 从泛音列与十二平均律开始，到音程、节奏、记谱、音阶调式、和声 | 23 节（第 0–22 节） |
| 二 · 编曲与作曲 | 动机、轮廓、律动、和弦进行、织体、配器、曲式，加上 MuseScore 三节 | 10 节（第 23–32 节） |
| 三 · 作品分析 | 贝多芬、巴洛克、莫扎特、俄罗斯与东欧、晚期浪漫与二十世纪、动画与管乐、摇滚与交错织体 | 19 节（不编号） |
| 四 · 风格解析 | 一种风格能被认出来，靠的是几条固定手法：Afrobeat、拉格 | 2 节（不编号） |

合计 **54 节 · 20 层 · 40 个实验台**，另有可搜索的[术语表](glossary/)与[课程地图](lessons/)。

前两部分用数字编号（教学顺序），第三、四部分**不编号**——
作品分析是要长期加东西的模块，插一首曲子不该让别人的编号跟着挪（见 [CONTRIBUTING](CONTRIBUTING.md)）。

## 本地跑

```bash
python3 scripts/serve.py 5200     # 本地预览（禁缓存，改完直接刷新）
node scripts/audit-music.mjs      # 数据审计：乐理数字、页面、编号、实验台注册
node scripts/check-links.mjs      # 外链体检（需要代理的站加 --proxy）
```

必须走 http 打开（用了 ES Modules 与 Web Audio），不能双击文件用 `file://`。

## 目录地图

```
index.html                 首页（门面页，刻意不放交互）
lessons/<id>/index.html    每一节课（正文）
glossary/ about/ changelog/ 术语表、介绍、维护历史
src/js/music/              乐理纯函数：音高、音程、和弦、音阶、节奏
src/js/audio/              合成引擎、排期、速度表
src/js/widgets/            实验台（一个文件一个台，main.js 里注册）
src/js/site.js             版本号、对外链接、维护历史
scripts/audit-music.mjs    数据审计（唯一的质量门）
assets/musescore/          示例谱（MusicXML）与渲染图
docs/                      新增曲子的流程、UI 规范、参考书与版权
```

**唯一真源**：课程结构只在 `src/js/music/curriculum.js` 写一次，
左侧目录、课程地图、上一课／下一课都由它渲染。

## 怎么参与

这个项目按"正规维护"跑：**main 不直接提交**，每个改动一条分支 + 一个 PR，
合并前必须过 CI（跑数据审计）。三条底线是**数据可核对、页面要快、交互必须有反馈**，
完整规则见 [CONTRIBUTING.md](CONTRIBUTING.md)。

| 你想做的事 | 入口 |
| --- | --- |
| 报一个 bug / 指一个错误 / 提一首曲子 | 仓库的 Issues（三个模板：交互问题、内容错误、新曲目提案） |
| 加一首曲子（第三部分作品分析） | [docs/新增一首曲子.md](docs/新增一首曲子.md) —— 从"这一节要教什么"到开 PR 的完整流程 |
| 理解它为什么这样维护 | [关于](about/)（分读者／贡献者两栏）、[维护历史](changelog/) |

## 文档

| 文档 | 内容 |
| --- | --- |
| [CONTRIBUTING.md](CONTRIBUTING.md) | 分支与 PR、提交信息、编号规则、本地怎么跑、评审要点、交互铁律 |
| [docs/新增一首曲子.md](docs/新增一首曲子.md) | 加曲子／加章节的逐步流程与检查清单 |
| [docs/UI设计规范.md](docs/UI设计规范.md) | 颜色、间距、组件的设计令牌（含深色模式） |
| [docs/参考书与版权.md](docs/参考书与版权.md) | 参考书三条线（李重光 / Open Music Theory / 交互语言）与版权纪律 |

## 许可

**代码 MIT，教学内容 CC BY-SA 4.0。** 转载、改编、拿去上课都可以，署名并以相同方式共享即可。

作者：[jimmyland.me](https://jimmyland.me/)　·　[其他项目](https://jimmyland.me/projects/)
