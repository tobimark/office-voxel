// Big floor plate entry: everything generic lives in ../shared/scene-page.js, so this
// page is only the layout, its furniture builder and its wording.
import '../style.css';
import './style.css';
import { bootScene } from '../shared/scene-page.js';
import { createFloorOffice } from './office.js';
import { floorOffice } from './layout.js';

bootScene({
  layout: floorOffice,
  createOffice: createFloorOffice,
  labels: {
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
  },
});
