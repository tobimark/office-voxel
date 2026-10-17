import '../style.css';
import './style.css';
import { createSuiteOffice } from './office.js';
import { suiteOffice } from './layout.js';
import { bootScene } from '../shared/scene-page.js';

bootScene({
  layout: suiteOffice,
  createOffice: createSuiteOffice,
  labels: {
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
  },
});
