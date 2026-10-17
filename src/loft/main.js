import '../style.css';
import './style.css';
import { createLoftOffice } from './office.js';
import { loftOffice } from './layout.js';
import { bootScene } from '../shared/scene-page.js';

bootScene({
  layout: loftOffice,
  createOffice: createLoftOffice,
  labels: {
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
  },
});
