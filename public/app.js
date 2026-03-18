const DB_NAME = 'capture-bridge-db';
const STORE_NAME = 'uploads';
const LAST_UPLOAD_AT_KEY = 'capture-bridge.last-upload-at';

const elements = {
  captureButton: document.querySelector('#capture-button'),
  cameraInput: document.querySelector('#camera-input'),
  statusText: document.querySelector('#status-text'),
  queueCount: document.querySelector('#queue-count'),
  lastResult: document.querySelector('#last-result'),
  retryButton: document.querySelector('#retry-button'),
  retryLabel: document.querySelector('#retry-label'),
  queueList: document.querySelector('#queue-list')
};

const state = {
  queue: [],
  isProcessing: false,
  lastUploadAt: null
};

function setStatus(text) {
  elements.statusText.textContent = text;
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(new Date(value));
}

function getStoredLastUploadAt() {
  return localStorage.getItem(LAST_UPLOAD_AT_KEY);
}

function storeLastUploadAt(value) {
  localStorage.setItem(LAST_UPLOAD_AT_KEY, value);
}

function formatLastUploadAt(value) {
  if (!value) {
    return 'None';
  }

  const target = new Date(value);
  const diffSeconds = Math.max(0, Math.floor((Date.now() - target.getTime()) / 1000));

  if (diffSeconds < 60) {
    return `${diffSeconds} second${diffSeconds === 1 ? '' : 's'} ago`;
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(target);
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode, handler) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const request = handler(store);

    tx.oncomplete = () => resolve(request?.result);
    tx.onerror = () => reject(tx.error || request?.error);
    tx.onabort = () => reject(tx.error || request?.error);
  }).finally(() => {
    db.close();
  });
}

function queueSort(a, b) {
  return a.createdAt.localeCompare(b.createdAt);
}

async function readQueueFromDb() {
  const items = await withStore('readonly', (store) => store.getAll());
  state.queue = (items || []).sort(queueSort);
}

async function writeQueueItem(item) {
  await withStore('readwrite', (store) => store.put(item));
}

async function deleteQueueItem(id) {
  await withStore('readwrite', (store) => store.delete(id));
}

function bytesLabel(bytes) {
  if (bytes > 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
}

function renderQueue() {
  const activeCount = state.queue.filter((item) => item.status !== 'done').length;
  elements.queueCount.textContent = String(activeCount);
  elements.lastResult.textContent = formatLastUploadAt(state.lastUploadAt);
  elements.queueList.replaceChildren();

  for (const item of state.queue) {
    const li = document.createElement('li');
    const stateLabel =
      item.status === 'pending'
        ? 'Queued'
        : item.status === 'uploading'
          ? 'Uploading…'
          : item.status === 'failed'
            ? 'Failed'
            : 'Done';
    const statusClass =
      item.status === 'done'
        ? 'queue-item-state--done'
        : item.status === 'failed'
          ? 'queue-item-state--failed'
          : item.status === 'uploading'
            ? 'queue-item-state--uploading'
            : '';

    li.innerHTML = `
      <div class="queue-item-top">
        <span class="queue-item-name">${item.name}</span>
        <span class="${statusClass}">${stateLabel}</span>
      </div>
      <div class="queue-item-meta">
        ${bytesLabel(item.size)} · ${formatDate(item.createdAt)}
        ${item.error ? ` · ${item.error}` : ''}
      </div>
    `;
    elements.queueList.append(li);
  }
}

function updateCaptureButton() {
  elements.captureButton.disabled = false;
  const hasFailedUploads = state.queue.some((item) => item.status === 'failed');
  elements.retryButton.disabled = !hasFailedUploads;
  elements.retryLabel.textContent = hasFailedUploads
    ? 'Retry Failed Uploads'
    : 'No Failed Uploads';
  if (!state.isProcessing) {
    setStatus('Ready');
  }
}

async function queueFile(file) {
  const item = {
    id:
      (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`),
    name: file.name || `capture-${Date.now()}`,
    type: file.type || 'application/octet-stream',
    size: file.size || 0,
    createdAt: new Date().toISOString(),
    status: 'pending',
    retries: 0,
    error: '',
    file
  };

  state.queue.push(item);
  state.queue.sort(queueSort);
  await writeQueueItem(item);
  renderQueue();
  await processQueue();
}

async function uploadItem(item) {
  const formData = new FormData();
  formData.append('photo', item.file, item.name);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `Upload failed (${response.status})`);
  }

  return response.json();
}

async function processQueue() {
  if (state.isProcessing) {
    updateCaptureButton();
    return;
  }

  state.isProcessing = true;
  updateCaptureButton();

  try {
    for (const item of state.queue) {
      if (item.status === 'done') {
        continue;
      }

      item.status = 'uploading';
      item.error = '';
      await writeQueueItem(item);
      renderQueue();
      setStatus('Uploading');

      try {
        const result = await uploadItem(item);
        item.status = 'done';
        await writeQueueItem(item);
        state.lastUploadAt = result.receivedAt;
        storeLastUploadAt(result.receivedAt);
        await deleteQueueItem(item.id);
      } catch (error) {
        item.status = 'failed';
        item.error = error.message;
        item.retries += 1;
        await writeQueueItem(item);
        renderQueue();
        setStatus('Retry Required');
        return;
      }
    }

    state.queue = state.queue.filter((item) => item.status !== 'done');
    renderQueue();
    setStatus('Ready');
  } finally {
    state.isProcessing = false;
    updateCaptureButton();
  }
}

async function retryFailedUploads() {
  let changed = false;
  for (const item of state.queue) {
    if (item.status === 'failed') {
      item.status = 'pending';
      item.error = '';
      await writeQueueItem(item);
      changed = true;
    }
  }

  if (changed) {
    renderQueue();
    await processQueue();
  }
}

async function boot() {
  state.lastUploadAt = getStoredLastUploadAt();
  await readQueueFromDb();
  renderQueue();
  updateCaptureButton();
  await processQueue();
  window.setInterval(renderQueue, 1000);
}

elements.captureButton.addEventListener('click', () => {
  elements.cameraInput.click();
});

elements.cameraInput.addEventListener('change', async (event) => {
  const [file] = event.target.files || [];
  if (!file) {
    return;
  }

  await queueFile(file);
  event.target.value = '';
});

elements.retryButton.addEventListener('click', () => {
  retryFailedUploads().catch(() => {});
});

window.addEventListener('online', () => {
  processQueue().catch(() => {});
});

void boot();
