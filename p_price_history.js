// ===================================================
// p_price_history.js — Ingredient Price History & Chart
// ===================================================

function renderPriceHistory(container) {
    const ings = DB.getAll('ingredients');
    let selectedIngId = null; // null = all

    // Palette for chart lines
    const PALETTE = [
        '#f97316', '#0ea5e9', '#22c55e', '#8b5cf6', '#ef4444',
        '#f59e0b', '#ec4899', '#14b8a6', '#64748b', '#a78bfa',
        '#fb923c', '#34d399', '#60a5fa', '#f472b6', '#fbbf24',
    ];

    let chartInstance = null;

    function fmtDate(ts) {
        const d = new Date(ts);
        return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
    }
    function fmtDateTime(ts) {
        const d = new Date(ts);
        return d.toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' })
            + ' ' + d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    }

    function getChartData() {
        if (selectedIngId) {
            const ing = ings.find(i => i.id === selectedIngId);
            if (!ing) return { labels: [], datasets: [] };
            const hist = DB.getPriceHistory(selectedIngId);
            return {
                labels: hist.map(h => fmtDate(h.timestamp)),
                datasets: [{
                    label: ing.name,
                    data: hist.map(h => h.price),
                    borderColor: PALETTE[0],
                    backgroundColor: PALETTE[0] + '22',
                    fill: true,
                    tension: 0.35,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                }]
            };
        } else {
            // Show up to 10 ingredients that have history
            const allHist = DB.getPriceHistory(null);
            const ingIds = [...new Set(allHist.map(h => h.ingredientId))].slice(0, 12);
            // Collect all unique dates across all
            const allTs = [...new Set(allHist.map(h => h.timestamp))].sort((a, b) => a - b);
            // Use 1 label per day date string (group by day)
            const dayMap = {};
            allHist.forEach(h => {
                const day = new Date(h.timestamp).toDateString();
                if (!dayMap[day]) dayMap[day] = { ts: h.timestamp, day };
            });
            const days = Object.values(dayMap).sort((a, b) => a.ts - b.ts);
            const labels = days.map(d => fmtDate(d.ts));

            const datasets = ingIds.map((iid, idx) => {
                const ing = ings.find(i => i.id === iid);
                const hist = allHist.filter(h => h.ingredientId === iid);
                // For each day label, find closest price
                const data = days.map(day => {
                    const dayTs = day.ts;
                    // find last record on or before this day
                    const matching = hist.filter(h => new Date(h.timestamp).toDateString() === day.day);
                    if (matching.length > 0) return matching[matching.length - 1].price;
                    // fallback: last known price before this day
                    const before = hist.filter(h => h.timestamp <= dayTs);
                    return before.length > 0 ? before[before.length - 1].price : null;
                });
                return {
                    label: ing ? ing.name : `ID:${iid}`,
                    data,
                    borderColor: PALETTE[idx % PALETTE.length],
                    backgroundColor: 'transparent',
                    tension: 0.3,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    spanGaps: true,
                };
            });
            return { labels, datasets };
        }
    }

    function renderChart() {
        const canvas = document.getElementById('phChart');
        if (!canvas) return;
        if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

        const data = getChartData();
        if (!data.labels.length) {
            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
            document.getElementById('phNoData').style.display = 'flex';
            return;
        }
        document.getElementById('phNoData').style.display = 'none';

        chartInstance = new Chart(canvas, {
            type: 'line',
            data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: 'rgba(255,255,255,0.8)', font: { size: 12 }, padding: 12, usePointStyle: true }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15,20,35,0.95)',
                        titleColor: '#fff', bodyColor: 'rgba(255,255,255,0.8)',
                        callbacks: {
                            label: ctx => ` ${ctx.dataset.label}: ${formatPrice(ctx.parsed.y)}`
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: 'rgba(255,255,255,0.5)', maxTicksLimit: 10 },
                        grid: { color: 'rgba(255,255,255,0.06)' }
                    },
                    y: {
                        ticks: {
                            color: 'rgba(255,255,255,0.5)',
                            callback: v => formatPrice(v)
                        },
                        grid: { color: 'rgba(255,255,255,0.06)' }
                    }
                }
            }
        });
    }

    function renderTable() {
        const hist = selectedIngId
            ? DB.getPriceHistory(selectedIngId).slice().reverse()
            : DB.getPriceHistory(null).slice().reverse().slice(0, 200);

        const tbody = document.getElementById('phTableBody');
        if (!tbody) return;
        tbody.innerHTML = hist.map(h => {
            const ing = ings.find(i => i.id === h.ingredientId);
            const noteColor = h.note === 'snapshot' ? '#0ea5e9' : h.note === 'auto' ? '#22c55e' : '#f59e0b';
            const noteLabel = h.note === 'snapshot' ? '📸 Snapshot' : h.note === 'auto' ? '✏️ Edit' : h.note || '-';
            return `<tr>
        <td style="font-size:12px;color:var(--text-muted)">${fmtDateTime(h.timestamp)}</td>
        <td><strong>${ing ? ing.name : `ID:${h.ingredientId}`}</strong>${ing ? `<br><small class="text-muted">${ing.group || ''}</small>` : ''}</td>
        <td><span style="font-weight:700;color:var(--primary)">${formatPrice(h.price)}</span><small class="text-muted"> /${ing ? (ing.recipeUnit || ing.buyUnit) : ''}</small></td>
        <td><span style="font-size:11px;padding:2px 8px;border-radius:99px;background:${noteColor}22;color:${noteColor}">${noteLabel}</span></td>
      </tr>`;
        }).join('') || `<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--text-muted)">${t('sys_ph_no_data')}</td></tr>`;
    }

    function redraw() {
        renderChart();
        renderTable();
        // update select highlight
        document.querySelectorAll('.ph-ing-btn').forEach(b => {
            b.classList.toggle('active', parseInt(b.dataset.id || '0') === (selectedIngId || 0));
        });
        // stats
        const hist = DB.getPriceHistory(selectedIngId);
        const statsEl = document.getElementById('phStats');
        if (statsEl && hist.length > 0) {
            const prices = hist.map(h => h.price);
            const min = Math.min(...prices), max = Math.max(...prices);
            const first = prices[0], last = prices[prices.length - 1];
            const change = first > 0 ? (((last - first) / first) * 100).toFixed(1) : null;
            const changeColor = change > 0 ? 'var(--danger)' : change < 0 ? 'var(--success)' : 'var(--text-muted)';
            statsEl.innerHTML = `
        <div style="display:flex;gap:20px;flex-wrap:wrap;font-size:13px">
          <div><span style="color:var(--text-muted)">${t('sys_ph_data_count')}</span> <strong>${hist.length}</strong></div>
          <div><span style="color:var(--text-muted)">${t('sys_ph_min')}</span> <strong style="color:var(--success)">${formatPrice(min)}</strong></div>
          <div><span style="color:var(--text-muted)">${t('sys_ph_max')}</span> <strong style="color:var(--danger)">${formatPrice(max)}</strong></div>
          <div><span style="color:var(--text-muted)">${t('sys_ph_current')}</span> <strong style="color:var(--primary)">${formatPrice(last)}</strong></div>
          ${change !== null ? `<div><span style="color:var(--text-muted)">${t('sys_ph_change')}</span> <strong style="color:${changeColor}">${change > 0 ? '+' : ''}${change}%</strong></div>` : ''}
        </div>`;
        } else if (statsEl) {
            statsEl.innerHTML = '';
        }
    }

    // Render main layout
    container.innerHTML = `
    <div class="page-header">
      <div><div class="page-title">${t('sys_price_history_title')}</div><div class="page-subtitle">${t('sys_price_history_sub')}</div></div>
      <div style="display:flex;gap:10px;align-items:center">
        <button class="btn btn-secondary" onclick="phSnapshotAll()" id="phSnapBtn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
          ${t('sys_save_all_prices')}
        </button>
      </div>
    </div>

    <!-- Ingredient filter pills -->
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;align-items:center">
      <span style="font-size:12px;color:var(--text-muted);white-space:nowrap">${t('sys_ph_select_ing')}</span>
      <button class="ph-ing-btn filter-tab active" data-id="0" onclick="phSelectIng(0)">${t('ing_group_all')}</button>
      ${ings.map(i => `<button class="ph-ing-btn filter-tab" data-id="${i.id}" onclick="phSelectIng(${i.id})">${i.name}</button>`).join('')}
    </div>

    <!-- Stats bar -->
    <div id="phStats" style="margin-bottom:16px;padding:10px 16px;background:var(--surface);border-radius:var(--r-md);border:1px solid var(--border)"></div>

    <!-- Chart -->
    <div class="card" style="margin-bottom:24px">
      <div class="card-header"><div class="card-title">${t('sys_ph_chart_title')}</div></div>
      <div style="position:relative;height:360px;padding:8px 0">
        <canvas id="phChart"></canvas>
        <div id="phNoData" style="display:none;position:absolute;inset:0;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:var(--text-muted)">
          <span style="font-size:48px">📭</span>
          <div style="font-size:14px">${t('sys_ph_no_data')}</div>
          <button class="btn btn-primary btn-sm" onclick="phSnapshotAll()">${t('sys_ph_snapshot')}</button>
        </div>
      </div>
    </div>

    <!-- History Table -->
    <div class="card">
      <div class="card-header"><div class="card-title">${t('sys_ph_table_title')}</div></div>
      <div style="overflow-x:auto">
        <table style="width:100%">
          <thead><tr>
            <th>${t('sys_ph_col_date')}</th><th>${t('sys_ph_col_ing')}</th><th>${t('sys_ph_col_price')}</th><th>${t('sys_ph_col_src')}</th>
          </tr></thead>
          <tbody id="phTableBody"></tbody>
        </table>
      </div>
    </div>`;

    // Wire up events
    window.phSelectIng = function (ingId) {
        selectedIngId = ingId === 0 ? null : ingId;
        redraw();
    };

    window.phSnapshotAll = function () {
        const btn = document.getElementById('phSnapBtn');
        if (btn) { btn.disabled = true; btn.textContent = '⌛ กำลังบันทึก...'; }
        const count = DB.snapshotAllPrices('snapshot');
        Toast.show(`📸 บันทึกราคา ${count} รายการแล้ว`, 'success');
        setTimeout(() => {
            if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg> 📸 บันทึกราคาทั้งหมด'; }
            redraw();
        }, 300);
    };

    // Initial render (wait for Chart.js to be available)
    function tryRender() {
        if (typeof Chart === 'undefined') { setTimeout(tryRender, 200); return; }
        redraw();
    }
    setTimeout(tryRender, 80);
}
