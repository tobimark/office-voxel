import './styles/base.css';
import './styles/loft.css';
import './styles/suite.css';
import './styles/floor.css';
import { getLayout } from '../layouts/registry.js';
import { sceneLabels } from './presets.js';
import { bootScene } from './scene-page.js';

const requested = document.body.dataset.office ?? 'studio';
const id = requested === 'nine' ? 'team' : requested;
bootScene({ layout: getLayout(id), labels: sceneLabels[id] });
