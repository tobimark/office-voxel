// Page wording is presentation configuration, independent of world geometry.
const openLabels = {
    blocked: '这里被家具挡住了，试试走道或地毯上的空地。',
    pickPerson: '今天也一起做点有趣的事吧。',
    floorClick: '点击地面空处可以移动，人物会绕开家具。',
    bubbleWave: '嗨，欢迎来到我们的办公室！',
    bubbleThink: '嗯…这个点子还能再有趣一点。',
    returning: name => `${name}正在回到工位。`,
    seated: name => `${name}已坐下，正在敲键盘。`,
    walking: name => `${name}开始在办公室散步。点击空地可以指定目的地。`,
    sceneState: { day: '阳光正好 · 自由探索', golden: '午后暖光 · 慢一点也好', night: '下班时分 · 灵感还亮着' },
    departing: name => `${name}正在走向你点击的位置。`,
  };
const loftLabels = {
    blocked: '这里被家具挡住了，试试两条长走道或长桌两端的空地。',
    pickPerson: '长桌这一排，今天也都在一起做事。',
    floorClick: '点击地面空处可以移动，人物会绕开家具。',
    bubbleWave: '嗨，欢迎来到我们的长桌办公室！',
    bubbleThink: '嗯…长桌这一头还能再坐一个人。',
    returning: name => `${name}正在走回自己的座位。`,
    seated: name => `${name}已坐回长桌工位，正在敲键盘。`,
    walking: name => `${name}开始沿着长桌散步。点击空地可以指定目的地。`,
    sceneState: { day: '长桌开间 · 自由探索', golden: '午后暖光 · 一排人一起敲键盘', night: '下班时分 · 还有一盏灯亮着' },
    departing: name => `${name}正在走向你点击的位置。`,
  };
const suiteLabels = {
    blocked: '这里被墙或家具挡住了，走门才能去别的房间。',
    pickPerson: '隔着门也听得见你叫我。',
    floorClick: '点击地面空处可以移动，人物会走门绕开墙和家具。',
    bubbleWave: '嗨，欢迎来到我们的分间办公室！',
    bubbleThink: '嗯…隔着一扇门，思路反而更清楚了。',
    returning: name => `${name}正在走回自己的房间。`,
    seated: name => `${name}已坐回自己的房间，正在敲键盘。`,
    walking: name => `${name}开始穿过走廊串门。点击空地可以指定目的地。`,
    sceneState: { day: '走廊贯通 · 自由探索', golden: '午后暖光 · 四扇门都开着', night: '下班时分 · 只剩走廊的灯' },
    departing: name => `${name}正在走向你点击的位置。`,
  };
const floorLabels = {
    loading: '正在搭建大平层办公室…',
    sceneState: { day: '大平层 · 自由探索', golden: '午后暖光 · 六个房间都亮着', night: '下班时分 · 走廊还留着一盏灯' },
    selecting: name => `已选择${name}，可以切换动作或点击空地移动。`,
    blocked: '这里被墙或家具挡住了，走门才能去别的房间。',
    pickPerson: '隔着玻璃也看得见你在忙。',
    floorClick: '点击地面空处可以移动，人物会走门绕开墙和家具。',
    walking: name => `${name}开始沿着走廊串门。点击空地可以指定目的地。`,
    returning: name => `${name}正在走回自己的房间。`,
    seated: name => `${name}已坐回房间里的工位，正在敲键盘。`,
    bubbleWave: '嗨，欢迎来到我们的大平层！',
    bubbleCelebrate: '好耶！又完成了一件小事。',
    bubbleThink: '嗯…六间房，还是中间这条走廊最热闹。',
  };

export const sceneLabels = Object.freeze({studio: openLabels, team: openLabels, loft: loftLabels, suite: suiteLabels, floor: floorLabels});
