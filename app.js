(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const els = {
    list: $('#task-list'), status: $('#status-message'), total: $('#totalCount'), completed: $('#completedCount'), remaining: $('#remainingCount'), allCount: $('#allFilterCount'), summary: $('#taskSummary'), empty: $('#emptyState'), emptyTitle: $('#emptyTitle'), emptyDescription: $('#emptyDescription'), dialog: $('#taskDialog'), form: $('#task-form'), taskId: $('#taskId'), title: $('#task-title'), description: $('#task-description'), dueDate: $('#taskDueDate'), priority: $('#taskPriority'), save: $('#task-submit'), formError: $('#formError'), toast: $('#toast')
  };
  const state = { config: null, tasks: [], filter: 'all', busy: false, toastTimer: null };
  const hasCredentials = (config) => config && /^https:\/\/.+/.test(config.supabaseUrl) && config.supabasePublishableKey && config.supabasePublishableKey !== 'YOUR_SUPABASE_PUBLISHABLE_KEY';

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }
  function notify(message, isError = false) {
    clearTimeout(state.toastTimer);
    els.toast.textContent = message;
    els.toast.classList.toggle('error', isError);
    els.toast.classList.add('visible');
    state.toastTimer = setTimeout(() => els.toast.classList.remove('visible'), 3200);
  }
  function setStatus(message = '', kind = '') {
    els.status.textContent = message;
    els.status.className = `status-message${kind ? ` ${kind}` : ''}`;
    els.status.hidden = !message;
  }
  function formatDate(value) {
    if (!value) return '';
    const date = new Date(`${value.slice(0, 10)}T00:00:00`);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
  }
  function updateSummary() {
    const completed = state.tasks.filter((task) => task.completed === true).length;
    els.total.textContent = state.tasks.length;
    els.completed.textContent = completed;
    els.remaining.textContent = state.tasks.length - completed;
    els.allCount.textContent = state.tasks.length;
    els.summary.textContent = `${state.tasks.length} ${state.tasks.length === 1 ? 'task' : 'tasks'} saved to the cloud.`;
  }
  function taskMarkup(task) {
    const id = escapeHtml(task.id);
    const title = escapeHtml(task.title || 'Untitled task');
    const description = escapeHtml(task.description || '');
    const priority = ['low', 'medium', 'high'].includes(task.priority) ? task.priority : 'medium';
    const dueDate = formatDate(task.due_date);
    const checked = task.completed === true;
    return `<article class="task-row${checked ? ' is-completed' : ''}" data-task-id="${id}">
      <button class="task-check" type="button" data-action="toggle" aria-label="Mark ${title} ${checked ? 'to do' : 'complete'}" aria-pressed="${checked}">${checked ? '✓' : ''}</button>
      <div class="task-copy"><h3 class="task-title">${title}</h3>${description ? `<p class="task-description">${description}</p>` : ''}</div>
      <div class="task-meta"><span class="priority ${priority}">${priority[0].toUpperCase()}${priority.slice(1)} priority</span>${dueDate ? `<span class="due-date">${escapeHtml(dueDate)}</span>` : ''}</div>
      <div class="task-actions"><button class="icon-button" type="button" data-action="edit" aria-label="Edit ${title}" title="Edit">✎</button><button class="icon-button delete" type="button" data-action="delete" aria-label="Delete ${title}" title="Delete">⌫</button></div>
    </article>`;
  }
  function render() {
    updateSummary();
    const filtered = state.tasks.filter((task) => state.filter === 'all' || (state.filter === 'completed' ? task.completed === true : task.completed !== true));
    els.list.innerHTML = filtered.map(taskMarkup).join('');
    els.list.hidden = filtered.length === 0;
    els.empty.hidden = filtered.length > 0 || state.busy;
    if (!state.tasks.length) {
      els.emptyTitle.textContent = 'A fresh start';
      els.emptyDescription.textContent = 'Add your first task and make today count.';
    } else if (!filtered.length) {
      els.emptyTitle.textContent = state.filter === 'completed' ? 'Nothing completed yet' : 'All caught up';
      els.emptyDescription.textContent = state.filter === 'completed' ? 'Finish a task and it will show up here.' : 'There are no tasks left to do. Nice work!';
    }
  }
  async function api(path = '', options = {}) {
    const { headers = {}, ...rest } = options;
    const response = await fetch(`${state.config.supabaseUrl.replace(/\/$/, '')}/rest/v1/${encodeURIComponent(state.config.tableName)}${path}`, {
      ...rest,
      headers: {
        apikey: state.config.supabasePublishableKey,
        Authorization: `Bearer ${state.config.supabasePublishableKey}`,
        'Content-Type': 'application/json',
        ...headers
      }
    });
    if (!response.ok) {
      const detail = await response.text();
      let message = `Request failed (${response.status}).`;
      try { message = JSON.parse(detail).message || JSON.parse(detail).hint || message; } catch { if (detail) message = detail.slice(0, 240); }
      throw new Error(message);
    }
    if (response.status === 204) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }
  async function loadTasks() {
    state.busy = true;
    els.list.setAttribute('aria-busy', 'true');
    setStatus('Loading your tasks…');
    render();
    try {
      const rows = await api('?select=id,title,description,due_date,priority,completed,created_at&order=created_at.desc');
      state.tasks = Array.isArray(rows) ? rows : [];
      setStatus('');
    } catch (error) {
      state.tasks = [];
      setStatus(`Could not load tasks: ${error.message} Check your config.json and Supabase table policies, then refresh.`, 'error');
    } finally {
      state.busy = false;
      els.list.setAttribute('aria-busy', 'false');
      render();
    }
  }
  function openDialog(task = null) {
    els.form.reset();
    els.formError.hidden = true;
    els.formError.textContent = '';
    els.taskId.value = task?.id ?? '';
    els.title.value = task?.title ?? '';
    els.description.value = task?.description ?? '';
    els.dueDate.value = task?.due_date ? String(task.due_date).slice(0, 10) : '';
    els.priority.value = task?.priority ?? 'medium';
    $('#dialogTitle').textContent = task ? 'Edit task' : 'Add a task';
    els.save.textContent = task ? 'Save changes' : 'Save task';
    els.dialog.showModal();
    requestAnimationFrame(() => els.title.focus());
  }
  function closeDialog() { if (els.dialog.open) els.dialog.close(); }
  function showFormError(message) { els.formError.textContent = message; els.formError.hidden = false; }
  async function saveTask(event) {
    event.preventDefault();
    const title = els.title.value.trim();
    if (!title) { showFormError('Please enter a task name.'); els.title.focus(); return; }
    const id = els.taskId.value;
    const payload = { title, description: els.description.value.trim() || null, due_date: els.dueDate.value || null, priority: els.priority.value };
    state.busy = true;
    els.save.disabled = true;
    els.save.textContent = id ? 'Saving…' : 'Adding…';
    try {
      if (id) {
        await api(`?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(payload) });
        notify('Task updated.');
      } else {
        await api('', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ ...payload, completed: false }) });
        notify('Task added.');
      }
      closeDialog();
      await loadTasks();
    } catch (error) { showFormError(`Could not save task: ${error.message}`); }
    finally { state.busy = false; els.save.disabled = false; }
  }
  async function toggleTask(task) {
    try {
      await api(`?id=eq.${encodeURIComponent(task.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ completed: task.completed !== true }) });
      await loadTasks();
    } catch (error) { notify(`Could not update task: ${error.message}`, true); }
  }
  async function deleteTask(task) {
    if (!window.confirm(`Delete “${task.title}”? This cannot be undone.`)) return;
    try {
      await api(`?id=eq.${encodeURIComponent(task.id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      state.tasks = state.tasks.filter((item) => String(item.id) !== String(task.id));
      render();
      notify('Task deleted.');
    } catch (error) { notify(`Could not delete task: ${error.message}`, true); }
  }
  function setFilter(filter) {
    state.filter = filter;
    document.querySelectorAll('[data-filter]').forEach((button) => {
      const active = button.dataset.filter === filter;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    render();
  }
  async function start() {
    $('#todayLabel').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date());
    $('#addTaskButton').addEventListener('click', () => openDialog());
    $('#emptyAddButton').addEventListener('click', () => openDialog());
    $('#closeDialogButton').addEventListener('click', closeDialog);
    $('#cancelDialogButton').addEventListener('click', closeDialog);
    els.form.addEventListener('submit', saveTask);
    document.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => setFilter(button.dataset.filter)));
    els.list.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      const row = button.closest('[data-task-id]');
      const task = state.tasks.find((item) => String(item.id) === row.dataset.taskId);
      if (!task) return;
      if (button.dataset.action === 'toggle') toggleTask(task);
      if (button.dataset.action === 'edit') openDialog(task);
      if (button.dataset.action === 'delete') deleteTask(task);
    });
    try {
      const response = await fetch('config.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Could not read config.json (${response.status}).`);
      state.config = await response.json();
      if (!hasCredentials(state.config)) {
        setStatus('Add your Supabase Project URL and publishable key to config.json to connect the task list.', 'error');
        state.busy = false;
        els.list.setAttribute('aria-busy', 'false');
        render();
        return;
      }
      if (!state.config.tableName) throw new Error('The tableName field is missing from config.json.');
      await loadTasks();
    } catch (error) {
      state.busy = false;
      els.list.setAttribute('aria-busy', 'false');
      setStatus(`${error.message} Make sure config.json is beside index.html and you are using a web server.`, 'error');
      render();
    }
  }
  start();
})();
