import './asset-library.css';
import { filterAssets } from './asset-library-data.js';

const root = document.querySelector('#library');
const kind = document.body.dataset.library;
const isCharacter = kind === 'characters';
const title = isCharacter ? '人物素材' : '物品素材';
// pagehide releases GPU resources, so rebuild if the browser restores this page from its cache.
const restore = event => { if (event.persisted) location.reload(); };
window.addEventListener('pageshow', restore);
if (import.meta.hot) import.meta.hot.dispose(() => window.removeEventListener('pageshow', restore));
root.innerHTML = `
  <main class="library-main">
    <section class="catalog" aria-label="${title}目录">
      <div class="catalog-heading"><span class="eyebrow">PIXOFFICE / ASSET LIBRARY</span><h1>${title}<span class="title-dot">.</span></h1>
        <p>${isCharacter ? '挑一位伙伴，看看动作和心情。' : '从一只杯子，到一张办公桌。'}</p>
        <p id="summary" class="catalog-summary" role="status">正在读取素材目录…</p>
      </div>
      <div class="catalog-tools"><label class="search-label" for="search">搜索素材</label><input id="search" type="search" placeholder="${isCharacter ? '姓名、职业或外观 ID' : '名称、分类或素材 ID'}" autocomplete="off" />
        <label class="search-label" for="category">筛选分类</label><select id="category"><option value="">全部${isCharacter ? '人物' : '分类'}</option></select>
      </div>
      <div class="result-heading"><h2>素材目录</h2><output id="result-count" aria-live="polite"></output></div>
      <div id="asset-list" class="asset-list"></div>
      <p id="empty" class="empty-state" hidden>没有找到匹配素材，请换个关键词或分类。</p>
    </section>
    <section class="preview-panel" aria-label="素材预览与控制">
      <div class="preview-stage"><div class="stage-label"><span class="live-dot"></span>实时 3D 预览</div>
        <div id="preview" class="preview-viewport"></div>
        <p id="preview-message" class="preview-message" role="status">正在准备预览…</p>
        <div class="stage-bottom"><span>拖拽旋转 · 滚轮缩放</span><div class="camera-buttons"><button data-camera="overview">重置视角</button><button data-camera="front">正面</button>${isCharacter ? '<button data-camera="face">表情特写</button>' : ''}</div></div>
      </div>
      <div class="asset-details"><div class="detail-heading"><div><span id="detail-category" class="eyebrow"></span><h2 id="detail-name">选择一个素材</h2></div><code id="detail-id"></code></div>
        <p id="detail-description"></p><div id="swatches" class="swatches"></div>
        ${isCharacter ? `<section class="motion-controls"><div class="control-heading"><h3>动作</h3><button id="pause" aria-pressed="false">暂停动画</button></div><div id="actions" class="choice-buttons" aria-label="选择动作"></div>
          <div class="control-heading"><h3>表情</h3><span>与动作自由组合</span></div><div id="expressions" class="choice-buttons" aria-label="选择表情"></div></section>` : ''}
        <dl class="asset-metadata"><dt>素材 ID</dt><dd id="metadata-id">—</dd>${isCharacter ? '<dt>人物身份</dt><dd id="character-id">—</dd>' : ''}<dt>来源</dt><dd id="detail-source">—</dd></dl>
      </div>
    </section>
  </main>
  <footer class="library-footer"><span>PIXOFFICE / 素材工作室</span><span id="status" role="status" aria-live="polite">正在载入…</span></footer>`;

async function boot() {
  const [{ assetLibrary }, { createAssetPreview }, { drawPortrait }, motions] = await Promise.all([
    import('./asset-library-catalog.js'), import('./asset-preview.js'),
    import('../assets/characters/appearance.js'), import('../assets/characters/motions.js'),
  ]);
  const entries = assetLibrary[kind];
  const list = root.querySelector('#asset-list'), search = root.querySelector('#search');
  const category = root.querySelector('#category'), message = root.querySelector('#preview-message');
  const status = root.querySelector('#status');
  const preview = createAssetPreview(root.querySelector('#preview'), kind);
  const thumbnails = new Map();
  let selected = null;
  const cleanups = [];
  function dispose() {
    for (const cleanup of cleanups.splice(0)) cleanup();
    preview.dispose();
  }
  window.addEventListener('pagehide', dispose, { once: true });
  cleanups.push(() => window.removeEventListener('pagehide', dispose));
  if (import.meta.hot) import.meta.hot.dispose(dispose);
  try {
    root.querySelector('#summary').textContent = isCharacter
      ? `${assetLibrary.identityCount} 位人物 · ${entries.length} 套外观 · ${motions.characterActions.length} 种动作 · ${motions.characterExpressions.length} 种表情`
      : `${entries.length} 件素材 · ${new Set(entries.map(entry => entry.category)).size} 个分类`;
    for (const value of new Set(entries.map(entry => isCharacter ? entry.role : entry.category))) {
      const option = new Option(value, value); category.add(option);
    }
    function select(entry) {
      selected = entry;
      for (const button of list.querySelectorAll('.asset-card')) button.setAttribute('aria-pressed', String(button.dataset.id === entry.id));
      root.querySelector('#detail-name').textContent = entry.name;
      root.querySelector('#detail-category').textContent = isCharacter ? entry.role : entry.category;
      root.querySelector('#detail-id').textContent = entry.id;
      root.querySelector('#metadata-id').textContent = entry.id;
      root.querySelector('#detail-description').textContent = entry.description;
      root.querySelector('#detail-source').textContent = entry.source.replace('../', 'src/');
      if (isCharacter) root.querySelector('#character-id').textContent = entry.characterId;
      const swatches = root.querySelector('#swatches'); swatches.replaceChildren();
      if (isCharacter) for (const [label, key] of [['上衣', 'shirt'], ['裤子', 'pants'], ['头发', 'hair']]) {
        const item = document.createElement('span'), chip = document.createElement('i');
        chip.style.backgroundColor = entry.look[key];
        item.append(chip, `${label} ${entry.look[key]}`); swatches.append(item);
      }
      try {
        preview.select(entry); message.hidden = true;
        status.textContent = `正在预览 ${entry.name} · ${entry.id}`;
      } catch (error) {
        message.hidden = false; message.textContent = `预览失败：${error.message}`;
        status.textContent = '可选择其他素材继续浏览。';
      }
      const url = new URL(location.href); url.searchParams.set('asset', entry.id); history.replaceState(null, '', url);
    }
    function renderList() {
      const visible = filterAssets(entries, search.value).filter(entry => !category.value || (isCharacter ? entry.role : entry.category) === category.value);
      list.replaceChildren(); root.querySelector('#empty').hidden = visible.length > 0;
      root.querySelector('#result-count').textContent = `${visible.length} / ${entries.length}`;
      for (const entry of visible) {
        const card = document.createElement('button'); card.className = 'asset-card'; card.dataset.id = entry.id;
        card.setAttribute('aria-pressed', String(entry.id === selected?.id));
        const image = document.createElement('img'); image.alt = ''; image.width = 240; image.height = 160;
        if (!thumbnails.has(entry.id)) {
          try {
            if (isCharacter) {
              const canvas = document.createElement('canvas'); drawPortrait(canvas, entry.look); thumbnails.set(entry.id, canvas.toDataURL());
            } else thumbnails.set(entry.id, preview.thumbnail(entry));
          } catch { /* A failed preview remains selectable and reports its error in the stage. */ }
        }
        if (thumbnails.has(entry.id)) image.src = thumbnails.get(entry.id); else image.hidden = true;
        const name = document.createElement('strong'); name.textContent = entry.name;
        const caption = document.createElement('span'); caption.textContent = isCharacter ? entry.role : entry.category;
        const id = document.createElement('code'); id.textContent = entry.id;
        card.append(image, name, caption, id); card.addEventListener('click', () => select(entry)); list.append(card);
      }
    }
    search.addEventListener('input', renderList); category.addEventListener('change', renderList);
    if (isCharacter) {
      function choices(target, values, command, initial) {
        for (const value of values) {
          const button = document.createElement('button'); button.textContent = value.name; button.dataset[command] = value.id;
          button.setAttribute('aria-pressed', String(value.id === initial));
          button.addEventListener('click', () => {
            preview[command](value.id);
            for (const other of target.children) other.setAttribute('aria-pressed', String(other === button));
            status.textContent = `${selected?.name ?? ''} · ${value.name}`;
          });
          target.append(button);
        }
      }
      choices(root.querySelector('#actions'), motions.characterActions, 'action', 'idle');
      choices(root.querySelector('#expressions'), motions.characterExpressions, 'expression', 'happy');
      const pause = root.querySelector('#pause');
      const updatePause = () => { pause.textContent = preview.paused ? '播放动画' : '暂停动画'; pause.setAttribute('aria-pressed', String(preview.paused)); };
      updatePause(); pause.addEventListener('click', () => { preview.pause(!preview.paused); updatePause(); });
    }
    root.querySelectorAll('[data-camera]').forEach(button => button.addEventListener('click', () => preview.frame(button.dataset.camera)));
    renderList();
    const initial = entries.find(entry => entry.id === new URLSearchParams(location.search).get('asset')) ?? entries[0];
    if (initial) select(initial);
    else { message.textContent = '目录中还没有可预览的素材。'; status.textContent = '素材目录为空。'; }
    const initialExpression = new URLSearchParams(location.search).get('expression');
    if (isCharacter && motions.characterExpressions.some(entry => entry.id === initialExpression)) {
      root.querySelector(`[data-expression="${initialExpression}"]`)?.click();
    }
    // A small read-only surface for browser lifecycle and interaction checks.
    window.assetLibraryPreview = { getState: () => ({ ...preview.getState(), selectedId: selected?.id, count: entries.length }), dispose };
    cleanups.push(() => { delete window.assetLibraryPreview; });
  } catch (error) { dispose(); throw error; }
}

boot().catch(error => {
  root.querySelector('#status').textContent = `素材加载失败：${error.message}`;
  root.querySelector('#preview-message').textContent = '无法载入素材，请检查目录内容并刷新页面。';
});
