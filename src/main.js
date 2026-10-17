import './style.css';
import { createOffice } from './office.js';
import { smallOffice, teamOffice } from './layouts.js';
import { bootScene } from './shared/scene-page.js';

bootScene({
  layout: document.body.dataset.office === 'nine' ? teamOffice : smallOffice,
  createOffice,
  labels: {
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
  },
});
