// ── Global State ──
let lastResult = null;
let msgCounter = 0;
let activeChart = null;

// ── Upload File ──
async function uploadFile() {
  const fileInput = document.getElementById('fileInput');
  const tableName = document.getElementById('tableName').value.trim() || 'data';
  const file = fileInput.files[0];

  if (!file) {
    alert('Please select a file first.');
    return;
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('table_name', tableName);

  try {
    const res = await fetch('/upload', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    if (data.error) {
      alert('Upload failed: ' + data.error);
      return;
    }

    alert(`✅ Table "${data.table}" loaded!\n${data.rows} rows | Columns: ${data.columns.join(', ')}`);
    loadSchema();
    showSuggestions(data.table, data.columns);

  } catch (err) {
    alert('Upload error: ' + err.message);
  }
}

// ── Load Schema ──
async function loadSchema() {
  try {
    const res = await fetch('/schema');
    const schema = await res.json();
    const panel = document.getElementById('schemaPanel');

    if (!Object.keys(schema).length) {
      panel.innerHTML = '<p class="no-data">No tables loaded yet.</p>';
      return;
    }

    panel.innerHTML = Object.entries(schema).map(([name, info]) => `
      <div class="schema-table" onclick="previewTable('${name}')">
        <strong>${name}</strong> &nbsp;(${info.row_count} rows)<br>
        ${info.columns.map(c => `
          <span>• ${c.name} <em>${c.type}</em></span>
        `).join('')}
        <div class="preview-hint">Click to preview data</div>
      </div>
    `).join('');

    const tableNames = Object.keys(schema);
    if (tableNames.length > 1) {
      const tip = document.createElement('div');
      tip.style.cssText = 'font-size:11px;color:#6c7086;margin-top:8px;line-height:1.6;';
      tip.textContent = `💡 Tip: You can query across tables! e.g. "Join ${tableNames[0]} and ${tableNames[1]}"`;
      panel.appendChild(tip);
    }

  } catch (err) {
    console.error('Schema load error:', err);
  }
}

// ── Preview Table ──
async function previewTable(tableName) {
  try {
    const res = await fetch('/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: tableName })
    });

    const data = await res.json();

    if (data.error || !data.columns) {
      console.error('Preview error:', data.error);
      return;
    }

    document.getElementById('previewTitle').textContent = `Preview: ${tableName}`;
    document.getElementById('previewPanel').style.display = 'flex';

    const html = `
      <table>
        <thead>
          <tr>${data.columns.map(c => `<th>${c}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${data.rows.slice(0, 5).map(row => `
            <tr>${row.map(val => `<td>${val ?? ''}</td>`).join('')}</tr>
          `).join('')}
        </tbody>
      </table>
    `;
    document.getElementById('previewContent').innerHTML = html;

  } catch (err) {
    console.error('Preview error:', err);
  }
}

// ── Close Preview ──
function closePreview() {
  document.getElementById('previewPanel').style.display = 'none';
}

// ── Clear All Tables ──
async function clearAllTables() {
  if (!confirm('Clear all loaded tables?')) return;
  try {
    await fetch('/clear', { method: 'POST' });
    loadSchema();
    closePreview();
    document.getElementById('suggestions').innerHTML = '';
    document.getElementById('downloadBar').style.display = 'none';
    lastResult = null;
    addMsg('bot', '🗑 All tables cleared.');
  } catch (err) {
    alert('Error clearing tables: ' + err.message);
  }
}

// ── Show Suggestion Chips ──
function showSuggestions(table, columns) {
  const suggestions = document.getElementById('suggestions');
  const lastCol = columns[columns.length - 1];
  const firstCol = columns[0];

  const chips = [
    `Show all rows from ${table}`,
    `Count total rows in ${table}`,
    `Show top 5 by ${lastCol}`,
    `What is the average ${lastCol}?`,
    `Show unique values of ${firstCol}`
  ];

  suggestions.innerHTML = chips.map(q => `
    <button class="chip" onclick="setQuestion('${q}')">${q}</button>
  `).join('');
}

// ── Set Question from Chip ──
function setQuestion(q) {
  document.getElementById('questionInput').value = q;
  document.getElementById('questionInput').focus();
}

// ── Ask Question ──
async function ask() {
  const input = document.getElementById('questionInput');
  const question = input.value.trim();

  if (!question) {
    alert('Please type a question first.');
    return;
  }

  input.value = '';
  addMsg('user', question);
  const loadingId = addLoading();
  const btn = document.querySelector('.input-bar button');
  btn.disabled = true;
  document.getElementById('downloadBar').style.display = 'none';

  try {
    const res = await fetch('/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });

    const data = await res.json();
    removeMsg(loadingId);

    let html = '';
    html += `<div class="bubble">${data.explanation || 'Here are the results:'}</div>`;

    if (data.sql) {
      html += `<div class="sql-box">${data.sql}</div>`;
    }

    if (data.error) {
      html += `<div class="error-msg">⚠ ${data.error}</div>`;
    }

    if (data.columns && data.rows && data.rows.length > 0) {
      lastResult = { columns: data.columns, rows: data.rows };
      document.getElementById('downloadBar').style.display = 'block';

      // Check if chart is possible
      const numericCols = data.columns.filter((c, i) =>
        data.rows.some(r => typeof r[i] === 'number' || !isNaN(parseFloat(r[i])))
      );
      const hasChart = data.columns.length >= 2 && numericCols.length >= 1;
      const msgId = 'result-' + (++msgCounter);

      html += `
        <div class="view-toggle">
          <button class="view-btn active" onclick="showTable('${msgId}')">📋 Table</button>
          ${hasChart ? `<button class="view-btn" onclick="showChart('${msgId}')">📊 Chart</button>` : ''}
        </div>
        <div id="table-${msgId}" class="result-table">
          <table>
            <thead>
              <tr>${data.columns.map(c => `<th>${c}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${data.rows.slice(0, 100).map(row => `
                <tr>${row.map(val => `<td>${val ?? ''}</td>`).join('')}</tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div id="chart-${msgId}" class="chart-container" style="display:none">
          <canvas id="canvas-${msgId}"></canvas>
        </div>
        <div class="row-count">${data.count} row(s) returned</div>
      `;

      // Store chart data on lastResult
      lastResult.msgId = msgId;
      lastResult.hasChart = hasChart;

    } else if (!data.error) {
      lastResult = null;
      document.getElementById('downloadBar').style.display = 'none';
      html += `<div class="row-count">No results found.</div>`;
    }

    addMsgHTML('bot', html);

    // Draw chart if available
    if (lastResult && lastResult.hasChart) {
      drawChart(lastResult.msgId, lastResult.columns, lastResult.rows);
    }

    saveHistory(question, data.sql);

  } catch (err) {
    removeMsg(loadingId);
    addMsg('bot', '⚠ Something went wrong: ' + err.message);
  }

  btn.disabled = false;
}

// ── Show Table View ──
function showTable(msgId) {
  document.getElementById(`table-${msgId}`).style.display = 'block';
  document.getElementById(`chart-${msgId}`).style.display = 'none';
  const btns = document.querySelectorAll(`#result-area-${msgId} .view-btn`);
  document.querySelectorAll('.view-btn').forEach(b => {
    if (b.onclick && b.onclick.toString().includes(msgId)) {
      b.classList.remove('active');
    }
  });
  event.target.classList.add('active');
}

// ── Show Chart View ──
function showChart(msgId) {
  document.getElementById(`table-${msgId}`).style.display = 'none';
  document.getElementById(`chart-${msgId}`).style.display = 'block';
  document.querySelectorAll('.view-btn').forEach(b => {
    if (b.onclick && b.onclick.toString().includes(msgId)) {
      b.classList.remove('active');
    }
  });
  event.target.classList.add('active');
}

// ── Draw Chart ──
function drawChart(msgId, columns, rows) {
  const canvas = document.getElementById(`canvas-${msgId}`);
  if (!canvas) return;

  // Find label col (first non-numeric) and value col (first numeric)
  const labelColIndex = 0;
  const valueColIndex = columns.findIndex((c, i) =>
    i > 0 && rows.some(r => !isNaN(parseFloat(r[i])))
  );

  if (valueColIndex === -1) return;

  const labels = rows.slice(0, 20).map(r => String(r[labelColIndex] ?? ''));
  const values = rows.slice(0, 20).map(r => parseFloat(r[valueColIndex]) || 0);

  const isDark = document.body.classList.contains('dark');

  // Destroy previous chart if exists
  if (activeChart) {
    activeChart.destroy();
    activeChart = null;
  }

  activeChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: columns[valueColIndex],
        data: values,
        backgroundColor: isDark
          ? 'rgba(137, 220, 235, 0.7)'
          : 'rgba(79, 158, 248, 0.7)',
        borderColor: isDark
          ? 'rgba(137, 220, 235, 1)'
          : 'rgba(79, 158, 248, 1)',
        borderWidth: 1,
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: isDark ? '#cdd6f4' : '#444'
          }
        }
      },
      scales: {
        x: {
          ticks: { color: isDark ? '#a6adc8' : '#666' },
          grid: { color: isDark ? '#313244' : '#f0f0f0' }
        },
        y: {
          ticks: { color: isDark ? '#a6adc8' : '#666' },
          grid: { color: isDark ? '#313244' : '#f0f0f0' }
        }
      }
    }
  });
}

// ── Download CSV ──
function downloadCSV() {
  if (!lastResult) {
    alert('No results to download yet.');
    return;
  }

  const { columns, rows } = lastResult;
  const header = columns.join(',');
  const body = rows.map(row =>
    row.map(val => {
      const str = String(val ?? '');
      return str.includes(',') || str.includes('\n') ? `"${str}"` : str;
    }).join(',')
  ).join('\n');

  const csv = header + '\n' + body;
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'query_results.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Query History ──
function saveHistory(question, sql) {
  const history = JSON.parse(localStorage.getItem('queryHistory') || '[]');
  history.unshift({ question, sql, time: new Date().toLocaleTimeString() });
  if (history.length > 20) history.pop();
  localStorage.setItem('queryHistory', JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  const history = JSON.parse(localStorage.getItem('queryHistory') || '[]');
  const panel = document.getElementById('historyPanel');
  if (!panel) return;
  if (!history.length) {
    panel.innerHTML = '<p class="no-data">No queries yet.</p>';
    return;
  }
  panel.innerHTML = history.map(h => `
    <div class="history-item" onclick="setQuestion('${h.question.replace(/'/g, "\\'")}')">
      <div class="history-question">${h.question}</div>
      <div class="history-time">${h.time}</div>
    </div>
  `).join('');
}

// ── Add Simple Text Message ──
function addMsg(role, text) {
  const id = 'msg-' + (++msgCounter);
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.id = id;
  div.innerHTML = `<div class="bubble">${text}</div>`;
  const messages = document.getElementById('messages');
  const welcome = messages.querySelector('.welcome');
  if (welcome) welcome.remove();
  messages.appendChild(div);
  div.scrollIntoView({ behavior: 'smooth' });
  return id;
}

// ── Add HTML Message ──
function addMsgHTML(role, html) {
  const id = 'msg-' + (++msgCounter);
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.id = id;
  div.innerHTML = html;
  const messages = document.getElementById('messages');
  messages.appendChild(div);
  div.scrollIntoView({ behavior: 'smooth' });
  return id;
}

// ── Add Loading Spinner ──
function addLoading() {
  const id = 'msg-' + (++msgCounter);
  const div = document.createElement('div');
  div.className = 'msg bot';
  div.id = id;
  div.innerHTML = `<div class="bubble"><span class="spinner"></span>Thinking...</div>`;
  const messages = document.getElementById('messages');
  messages.appendChild(div);
  div.scrollIntoView({ behavior: 'smooth' });
  return id;
}

// ── Remove Message ──
function removeMsg(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// ── Dark Mode ──
function toggleDark() {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  localStorage.setItem('darkMode', isDark);
  document.querySelector('.dark-toggle').textContent = isDark ? '☀️' : '🌙';
}

// ── On Page Load ──
window.onload = function () {
  loadSchema();
  renderHistory();
  const isDark = localStorage.getItem('darkMode') === 'true';
  if (isDark) {
    document.body.classList.add('dark');
    document.querySelector('.dark-toggle').textContent = '☀️';
  }
};