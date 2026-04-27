// ===================================================
// p_price_history.js — Ingredient Price History & Chart
// ===================================================

function renderPriceHistory(container) {
    const ings = DB.getAll('ingredients');
    const groups = [...new Set(ings.map(i => i.group || 'อื่นๆ'))].sort();
    
    // State
    let selectedIngId = null; // null = all
    let filterSearch = '';
    let filterGroup = 'all';
    let showTop5Only = true;

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

    // Helper: calculate volatility (max - min) / min
    function getVolatility(hist) {
        if (!hist || hist.length < 2) return 0;
        const prices = hist.map(h => h.price);
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        return min > 0 ? (max - min) / min : 0;
    }

    function getFilteredIngs() {
        return ings.filter(i => {
            const matchSearch = i.name.toLowerCase().includes(filterSearch.toLowerCase());
            const matchGroup = filterGroup === 'all' || (i.group || 'อื่นๆ') === filterGroup;
            return matchSearch && matchGroup;
        }).sort((a,b) => a.name.localeCompare(b.name));
    }

    function getChartData() {
        if (selectedIngId) {
            const ing = ings.find(i => i.id === selectedIngId);
            if (!ing) return { labels: [], datasets: [] };
            const hist = DB.getPriceHistory(selectedIngId);
            
            const canvas = document.getElementById('phChart');
            let gradient = PALETTE[0] + '44';
            if (canvas) {
                const ctx = canvas.getContext('2d');
                gradient = ctx.createLinearGradient(0, 0, 0, 400);
                gradient.addColorStop(0, PALETTE[0] + '88'); // Opaque at top
                gradient.addColorStop(1, PALETTE[0] + '00'); // Transparent at bottom
            }

            return {
                labels: hist.map(h => fmtDate(h.timestamp)),
                datasets: [{
                    label: ing.name,
                    data: hist.map(h => h.price),
                    borderColor: PALETTE[0],
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.35,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: PALETTE[0],
                    pointBorderColor: '#1e293b',
                    pointBorderWidth: 2,
                }]
            };
        } else {
            // Aggregate mode
            const allHist = DB.getPriceHistory(null);
            
            // Calculate volatility for all ingredients to find top 5
            const ingVolatilities = [];
            const ingIdsWithHist = [...new Set(allHist.map(h => h.ingredientId))];
            
            ingIdsWithHist.forEach(iid => {
                const hist = allHist.filter(h => h.ingredientId === iid);
                ingVolatilities.push({ id: iid, vol: getVolatility(hist) });
            });
            
            ingVolatilities.sort((a, b) => b.vol - a.vol); // highest volatility first
            
            let targetIngIds = ingIdsWithHist;
            if (showTop5Only) {
                targetIngIds = ingVolatilities.slice(0, 5).map(v => v.id);
            } else {
                targetIngIds = targetIngIds.slice(0, 15); // Hard cap at 15 to prevent absolute chaos
            }

            // Collect all unique dates across targeted ingredients
            const targetedHist = allHist.filter(h => targetIngIds.includes(h.ingredientId));
            const allTs = [...new Set(targetedHist.map(h => h.timestamp))].sort((a, b) => a - b);
            
            // Use 1 label per day date string (group by day)
            const dayMap = {};
            targetedHist.forEach(h => {
                const day = new Date(h.timestamp).toDateString();
                if (!dayMap[day]) dayMap[day] = { ts: h.timestamp, day };
            });
            const days = Object.values(dayMap).sort((a, b) => a.ts - b.ts);
            const labels = days.map(d => fmtDate(d.ts));

            const datasets = targetIngIds.map((iid, idx) => {
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
                    label: ing ? ing.name : \`ID:\${iid}\`,
                    data,
                    borderColor: PALETTE[idx % PALETTE.length],
                    backgroundColor: 'transparent',
                    tension: 0.3,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: PALETTE[idx % PALETTE.length],
                    pointBorderColor: '#1e293b',
                    pointBorderWidth: 1.5,
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
        if (!data.labels || !data.labels.length || !data.datasets.length) {
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
                        labels: { color: 'rgba(255,255,255,0.8)', font: { size: 12 }, padding: 16, usePointStyle: true }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15,20,35,0.95)',
                        titleColor: '#fff', 
                        bodyColor: 'rgba(255,255,255,0.9)',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        padding: 12,
                        boxPadding: 6,
                        callbacks: {
                            label: ctx => \` \${ctx.dataset.label}: \${formatPrice(ctx.parsed.y)}\`
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: 'rgba(255,255,255,0.5)', maxTicksLimit: 10, font: {size: 11} },
                        grid: { color: 'rgba(255,255,255,0.03)' }
                    },
                    y: {
                        beginAtZero: false,
                        ticks: {
                            color: 'rgba(255,255,255,0.5)',
                            font: {size: 11},
                            callback: v => formatPrice(v),
                            padding: 8
                        },
                        grid: { color: 'rgba(255,255,255,0.06)', borderDash: [5, 5] }
                    }
                }
            }
        });
    }

    function renderTable() {
        const histRaw = selectedIngId
            ? DB.getPriceHistory(selectedIngId)
            : DB.getPriceHistory(null);
            
        // Process trends chronologically
        const histGrouped = {};
        histRaw.forEach(h => {
            if(!histGrouped[h.ingredientId]) histGrouped[h.ingredientId] = [];
            histGrouped[h.ingredientId].push(h);
        });
        
        let histProcessed = [];
        Object.keys(histGrouped).forEach(iid => {
            const arr = histGrouped[iid].sort((a,b) => a.timestamp - b.timestamp);
            for(let i=0; i<arr.length; i++) {
                const current = arr[i];
                let trend = 'same';
                let trendVal = 0;
                if(i > 0) {
                    const prev = arr[i-1];
                    if(current.price > prev.price) trend = 'up';
                    else if(current.price < prev.price) trend = 'down';
                    trendVal = prev.price > 0 ? ((current.price - prev.price) / prev.price * 100) : 0;
                }
                histProcessed.push({...current, trend, trendVal});
            }
        });
        
        // Sort descending by timestamp for display
        histProcessed.sort((a,b) => b.timestamp - a.timestamp);
        histProcessed = histProcessed.slice(0, 200);

        const tbody = document.getElementById('phTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = histProcessed.map(h => {
            const ing = ings.find(i => i.id === h.ingredientId);
            const noteColor = h.note === 'snapshot' ? '#0ea5e9' : h.note === 'auto' ? '#22c55e' : '#f59e0b';
            const noteLabel = h.note === 'snapshot' ? '📸 Snapshot' : h.note === 'auto' ? '✏️ Edit' : h.note || '-';
            
            // Trend Icon
            let trendHtml = \`<span style="color:var(--text-faint)">➖</span>\`;
            if (h.trend === 'up') trendHtml = \`<span style="color:var(--danger);font-weight:600" title="+\${h.trendVal.toFixed(1)}%">↗️ <small>+\${h.trendVal.toFixed(1)}%</small></span>\`;
            if (h.trend === 'down') trendHtml = \`<span style="color:var(--success);font-weight:600" title="\${h.trendVal.toFixed(1)}%">↘️ <small>\${h.trendVal.toFixed(1)}%</small></span>\`;
            
            return \`<tr style="border-bottom:1px solid var(--border-light)">
                <td style="font-size:12px;color:var(--text-muted);padding:12px 8px">\${fmtDateTime(h.timestamp)}</td>
                <td style="padding:12px 8px">
                    <div style="font-weight:600">\${ing ? ing.name : \`ID:\${h.ingredientId}\`}</div>
                    \${ing ? \`<div style="font-size:11px;color:var(--text-muted)">\${ing.group || ''}</div>\` : ''}
                </td>
                <td style="padding:12px 8px"><span style="font-weight:700;color:var(--primary);font-size:15px">\${formatPrice(h.price)}</span><small style="color:var(--text-muted)"> /\${ing ? (ing.recipeUnit || ing.buyUnit) : ''}</small></td>
                <td style="padding:12px 8px;text-align:center">\${trendHtml}</td>
                <td style="padding:12px 8px;text-align:right"><span style="font-size:11px;padding:3px 8px;border-radius:99px;background:\${noteColor}15;color:\${noteColor};border:1px solid \${noteColor}44">\${noteLabel}</span></td>
            </tr>\`;
        }).join('') || \`<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text-muted)"><div style="font-size:32px;margin-bottom:8px">📭</div>\${t('sys_ph_no_data')}</td></tr>\`;
    }

    function renderStats() {
        const statsEl = document.getElementById('phStatsContainer');
        if (!statsEl) return;
        
        const hist = DB.getPriceHistory(selectedIngId);
        if (hist.length === 0) {
            statsEl.style.display = 'none';
            return;
        }
        statsEl.style.display = 'grid';
        
        const prices = hist.map(h => h.price);
        const min = Math.min(...prices), max = Math.max(...prices);
        
        // Sort chronological
        const sortedHist = hist.slice().sort((a,b) => a.timestamp - b.timestamp);
        const first = sortedHist[0].price, last = sortedHist[sortedHist.length - 1].price;
        const change = first > 0 ? (((last - first) / first) * 100).toFixed(1) : null;
        
        const isUp = change > 0;
        const isDown = change < 0;
        const changeColor = isUp ? 'var(--danger)' : isDown ? 'var(--success)' : 'var(--text-muted)';
        const changeIcon = isUp ? '↗️' : isDown ? '↘️' : '➖';
        const changeBg = isUp ? 'rgba(239, 68, 68, 0.05)' : isDown ? 'rgba(34, 197, 94, 0.05)' : 'rgba(100, 116, 139, 0.05)';

        const minRec = sortedHist.find(h => h.price === min);
        const maxRec = sortedHist.find(h => h.price === max);

        const kpiCard = (title, value, subtitle, icon, color) => \`
            <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r-md);padding:16px;display:flex;flex-direction:column;justify-content:center;position:relative;overflow:hidden;">
                <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;font-weight:600;display:flex;justify-content:space-between">
                    \${title} <span style="opacity:0.5">\${icon}</span>
                </div>
                <div style="font-size:24px;font-weight:800;color:\${color};line-height:1.2">\${value}</div>
                \${subtitle ? \`<div style="font-size:11px;color:var(--text-faint);margin-top:6px">\${subtitle}</div>\` : ''}
            </div>
        \`;

        statsEl.innerHTML = \`
            \${kpiCard(t('sys_ph_data_count'), hist.length, 'บันทึกประวัติทั้งหมด', '📊', 'var(--text)')}
            \${kpiCard(t('sys_ph_min'), formatPrice(min), minRec ? fmtDate(minRec.timestamp) : '', '📉', 'var(--success)')}
            \${kpiCard(t('sys_ph_max'), formatPrice(max), maxRec ? fmtDate(maxRec.timestamp) : '', '📈', 'var(--danger)')}
            \${kpiCard(t('sys_ph_current'), formatPrice(last), sortedHist.length > 0 ? fmtDate(sortedHist[sortedHist.length-1].timestamp) : '', '💰', 'var(--primary)')}
            <div style="background:\${changeBg};border:1px solid \${changeColor}44;border-radius:var(--r-md);padding:16px;display:flex;flex-direction:column;justify-content:center;">
                <div style="font-size:12px;color:\${changeColor};margin-bottom:8px;font-weight:600;opacity:0.8">\${t('sys_ph_change')}</div>
                <div style="font-size:24px;font-weight:800;color:\${changeColor};line-height:1.2;display:flex;align-items:center;gap:6px">
                    \${changeIcon} \${change !== null ? Math.abs(change) + '%' : '-'}
                </div>
                <div style="font-size:11px;color:\${changeColor};margin-top:6px;opacity:0.7">เทียบกับจุดเริ่มต้นแรกสุด</div>
            </div>
        \`;
    }

    function renderFiltersAndPills() {
        const filteredIngs = getFilteredIngs();
        
        // Render Filters
        const filterHtml = \`
            <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
                <div style="flex:1;min-width:200px;position:relative;">
                    <span style="position:absolute;left:12px;top:10px;opacity:0.5">🔍</span>
                    <input type="text" class="form-input" id="phSearchInput" placeholder="ค้นหาชื่อวัตถุดิบ..." value="\${filterSearch}" style="padding-left:36px;width:100%" autocomplete="off">
                </div>
                <div style="width:160px">
                    <select class="form-select" id="phGroupSelect">
                        <option value="all">📁 ทุกหมวดหมู่</option>
                        \${groups.map(g => \`<option value="\${g}" \${filterGroup === g ? 'selected' : ''}>\${g}</option>\`).join('')}
                    </select>
                </div>
                \${selectedIngId === null ? \`
                <div style="display:flex;align-items:center;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-md);padding:4px;overflow:hidden">
                    <button class="btn btn-sm \${showTop5Only ? 'btn-primary' : 'btn-ghost'}" style="border-radius:4px;box-shadow:none" onclick="phToggleShowAll(false)">🔥 แกว่งสุด 5 อันดับ</button>
                    <button class="btn btn-sm \${!showTop5Only ? 'btn-primary' : 'btn-ghost'}" style="border-radius:4px;box-shadow:none" onclick="phToggleShowAll(true)">📊 ดูทั้งหมด</button>
                </div>
                \` : ''}
            </div>
        \`;
        document.getElementById('phFilterArea').innerHTML = filterHtml;

        // Re-attach listeners because innerHTML replaced elements
        document.getElementById('phSearchInput')?.addEventListener('input', (e) => {
            filterSearch = e.target.value;
            renderPills();
        });
        document.getElementById('phGroupSelect')?.addEventListener('change', (e) => {
            filterGroup = e.target.value;
            renderPills();
        });

        renderPills(filteredIngs);
    }

    function renderPills(ingsToRender) {
        const targetIngs = ingsToRender || getFilteredIngs();
        const pillsHtml = \`
            <button class="ph-ing-btn filter-tab \${selectedIngId === null ? 'active' : ''}" style="margin-bottom:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1)" onclick="phSelectIng(0)">
                \${t('ing_group_all')}
            </button>
            \${targetIngs.map(i => \`
                <button class="ph-ing-btn filter-tab \${selectedIngId === i.id ? 'active' : ''}" style="margin-bottom:8px" onclick="phSelectIng(\${i.id})">
                    \${i.name}
                </button>
            \`).join('')}
            \${targetIngs.length === 0 ? \`<span style="font-size:13px;color:var(--text-faint);padding:6px 12px">ไม่พบวัตถุดิบ</span>\` : ''}
        \`;
        const pillsContainer = document.getElementById('phPillsArea');
        if(pillsContainer) pillsContainer.innerHTML = pillsHtml;
    }

    function redraw() {
        renderFiltersAndPills();
        renderStats();
        renderChart();
        renderTable();
    }

    // Render main layout structure
    container.innerHTML = \`
    <div class="page-header">
      <div>
        <div class="page-title" style="display:flex;align-items:center;gap:8px">📈 \${t('sys_price_history_title')}</div>
        <div class="page-subtitle">\${t('sys_price_history_sub')}</div>
      </div>
      <div style="display:flex;gap:10px;align-items:center">
        <button class="btn btn-secondary" style="background:var(--primary);color:white;border-color:var(--primary)" onclick="phSnapshotAll()" id="phSnapBtn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
          \${t('sys_save_all_prices')}
        </button>
      </div>
    </div>

    <!-- Filters Area -->
    <div id="phFilterArea"></div>

    <!-- Ingredient Pills -->
    <div id="phPillsArea" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px;max-height:140px;overflow-y:auto;padding-right:8px;align-items:flex-start;scrollbar-width:thin"></div>

    <!-- Stats Grid -->
    <div id="phStatsContainer" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(160px, 1fr));gap:16px;margin-bottom:24px"></div>

    <!-- Chart -->
    <div class="card" style="margin-bottom:24px;overflow:hidden">
      <div class="card-header" style="border-bottom:1px solid var(--border-light);background:var(--surface)"><div class="card-title" style="font-size:15px">📊 \${t('sys_ph_chart_title')}</div></div>
      <div style="position:relative;height:400px;padding:16px">
        <canvas id="phChart"></canvas>
        <div id="phNoData" style="display:none;position:absolute;inset:0;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:var(--text-muted);background:var(--bg);z-index:10">
          <span style="font-size:48px">📭</span>
          <div style="font-size:14px">\${t('sys_ph_no_data')}</div>
          <button class="btn btn-primary btn-sm" onclick="phSnapshotAll()">\${t('sys_ph_snapshot')}</button>
        </div>
      </div>
    </div>

    <!-- History Table -->
    <div class="card" style="overflow:hidden">
      <div class="card-header" style="border-bottom:1px solid var(--border-light);background:var(--surface)"><div class="card-title" style="font-size:15px">🗓️ \${t('sys_ph_table_title')}</div></div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead>
            <tr style="background:var(--bg);border-bottom:1px solid var(--border)">
              <th style="padding:12px 8px;text-align:left;color:var(--text-muted);font-weight:600">\${t('sys_ph_col_date')}</th>
              <th style="padding:12px 8px;text-align:left;color:var(--text-muted);font-weight:600">\${t('sys_ph_col_ing')}</th>
              <th style="padding:12px 8px;text-align:left;color:var(--text-muted);font-weight:600">\${t('sys_ph_col_price')}</th>
              <th style="padding:12px 8px;text-align:center;color:var(--text-muted);font-weight:600">Trend</th>
              <th style="padding:12px 8px;text-align:right;color:var(--text-muted);font-weight:600">\${t('sys_ph_col_src')}</th>
            </tr>
          </thead>
          <tbody id="phTableBody"></tbody>
        </table>
      </div>
    </div>\`;

    // Wire up events
    window.phSelectIng = function (ingId) {
        selectedIngId = ingId === 0 ? null : ingId;
        redraw();
    };

    window.phToggleShowAll = function(showAll) {
        showTop5Only = !showAll;
        redraw();
    }

    window.phSnapshotAll = function () {
        const btn = document.getElementById('phSnapBtn');
        if (btn) { btn.disabled = true; btn.textContent = '⌛ กำลังบันทึก...'; }
        const count = DB.snapshotAllPrices('snapshot');
        Toast.show(\`📸 บันทึกราคา \${count} รายการแล้ว\`, 'success');
        setTimeout(() => {
            if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg> ' + t('sys_save_all_prices'); }
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
