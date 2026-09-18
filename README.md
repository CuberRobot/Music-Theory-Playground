# Music Theory Playground

> 看得见的乐理 · *See it, play it, hear it.*

用**看得见的声音**讲乐理的交互式静态网站。每个概念都配一个能拖、能听、能立刻看到结果的实验台。

纯前端，零依赖，零构建，可直接托管在 GitHub Pages。

线上地址：https://cuberrobot.github.io/Music-Theory-Playground/
（首次需要在仓库 Settings → Pages 里把 Source 选成 GitHub Actions。）

## 现在处于什么阶段

`M1`。设计系统、音频引擎、前两节已经上线：泛音列、十二平均律。

## 本地预览

```bash
./scripts/dev.sh          # 默认 http://localhost:5173
MTP_PORT=8080 ./scripts/dev.sh
```

或者随意用一个静态服务器：`python3 -m http.server 5173`
（必须走 http，不能用 `file://` 打开，因为用了 ES Modules 和 Web Audio。）

## 文档

| 文档 | 内容 |
| --- | --- |
| [docs/方案.md](docs/方案.md) | 目标、边界、技术选型、信息架构、里程碑 |
| [docs/UI设计规范.md](docs/UI设计规范.md) | 色彩、字体、栅格、组件、具象化隐喻、动效 |
| [docs/参考书与章节大纲.md](docs/参考书与章节大纲.md) | 参考书策略、章节知识地图、术语对照 |

## 目录结构

```text
Music-Theory-Playground/
├── index.html            # 首页 / 学习地图
├── lessons/              # 章节页，一章一个目录
├── labs/                 # 独立实验台，可被多章复用
├── styles/
│   ├── tokens.css        # 设计令牌（色彩/字体/间距/动效）
│   └── base.css          # 基础排版与重置
├── src/js/
│   ├── audio/            # Web Audio 合成引擎
│   ├── music/            # 乐理数据模型：音高、音程、和弦、音阶
│   └── widgets/          # 可复用交互组件（键盘、音程塔、五度圈…）
├── docs/                 # 方案与规范
└── scripts/dev.sh        # 零依赖本地服务器
```

## 三个不动摇的原则

1. **先听见，后命名** —— 术语出现之前，先让人玩过这个现象。
2. **静音也可读** —— 每个声音都要有视觉等价物，默认静音时不丢信息。
3. **视觉与声音同帧** —— 发声与动画共用同一个调度时钟。

## 许可

代码和教学内容分开授权，因为它们面向的是不同的人：

| 范围 | 许可 | 文件 |
| --- | --- | --- |
| 代码：`src/`、`styles/`、`scripts/`、根目录 HTML | MIT | [LICENSE](LICENSE) |
| 教学内容：`docs/` 全部文档，以及网站正文、术语说明、章节结构、自制图示与谱例 | CC BY-SA 4.0 | [LICENSE-CONTENT](LICENSE-CONTENT) |

一句话概括：**代码随便拿去用，教学内容可以自由改编，但改编后要保持同样开放。**

第三方素材（字体、图标、乐谱、录音）各自保留其原始许可，不适用上述两者。
截至 M0，仓库内不含任何第三方素材。
