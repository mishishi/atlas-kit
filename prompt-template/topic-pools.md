# Topic Pools · 参考主题池

> **不**作为 prompt 模板的一部分。`build-prompt.mjs` 只读
> `prompt-template/main-template.md` + `prompt-template/categories/<kind>.md`
> 两份文件，不读本目录。
>
> 本文件是**给人看的参考**：当你准备用 `/create` 向导或
> `scripts/generate-card.mjs` 生成新卡时，从这里挑主题。
> 主题池的可贵之处在于「已经被人脑筛选过」——不是 open-ended
> 的「给我 50 个音乐主题」AI 输出，而是用户确认过的具体作品名。

## music · 15 首

* 你的香气 — 平井坚的抒情摇滚代表作
* 千本桜 — 初音ミク的 VOCALOID 现象级曲
* 夜曲 — 周杰伦的钢琴主导中国风
* 童年 — 罗大佑的民谣经典
* 起风了 — 买辣椒也用券的华语流行
* 稻香 — 周杰伦的乡愁叙事
* 演员 — 薛之谦的都市情歌
* 十年 — 陈奕迅的粤语经典
* 富士山下 — 陈奕迅的港式大编制
* Lemon — 米津玄师的 J-POP 现象作
* 恋爱循环 — 花澤香菜的角色歌
* 红莲华 — LiSA 的动画主题曲
* Bohemian Rhapsody — Queen 的摇滚史诗
* Take On Me — a-ha 的合成器流行
* 夜的钢琴曲五 — 石进的华人网络钢琴曲

## anime · 15 部

* 虫师 — 漆原友纪的治愈怪谈
* 千与千寻 — 宫崎骏的成长寓言
* 鬼灭之刃 — 吾峠呼世晴的少年热血
* 进击的巨人 — 谏山创的黑暗史诗
* 灌篮高手 — 井上雄彦的篮球经典
* 钢之炼金术师 FA — 荒川弘的等价交换
* 银魂 — 空知英秋的恶搞与温情
* 死亡笔记 — 死神笔记本的智力博弈
* 命运石之门 — 志仓千代丸的时间循环
* 咒术回战 — 芥见下々的现代咒术
* 夏目友人帐 — 绿川幸的妖怪日常
* 你的名字 — 新海诚的身体互换
* 天空之城 — 宫崎骏的飞行冒险
* CLANNAD — Key 社的校园催泪
* 浪客剑心 — 和月伸宏的幕末剑客

## 如何使用

```bash
# 1. 从池子里挑一个 slug
node scripts/build-prompt.mjs "你的香气" music --out tmp/p.md

# 2. 整卡流水线（图像 + 缩略图 + 落盘 + 写 cards.json）
node scripts/generate-card.mjs --topic "你的香气" --kind music --slug your-scent --series soundtrack-atlas --seriesNo "001"

# 3. 内容补全（mmx text chat）
node scripts/finish-card.mjs --slug your-scent
node scripts/finish-card.mjs --bulk    # 一次性补全所有 placeholder 字段
```

## R43 (2026-06-21) 来源

music 15 + anime 15 选自当日 R40 主题池讨论，原始版本曾放在
`prompt-template/categories/music.md` 和 `anime.md` 末尾作为
`## Topic Pool` 章节。R43 重构时**移出**模板：模板只承载
prompt 拼接必需的指令，主题池是参考文档，不该污染模板大小。
