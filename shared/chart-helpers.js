/* ================================================================
   TinyHumanMD | Chart.js Helper Utilities
   Common configuration and helpers for growth/bilirubin charts.
   ================================================================ */
var ChartHelpers = (function () {
  'use strict';

  var PERCENTILE_COLORS = {
    3:  'rgba(220, 38, 38, 0.25)',
    10: 'rgba(217, 119, 6, 0.25)',
    25: 'rgba(37, 99, 235, 0.2)',
    50: 'rgba(37, 99, 235, 0.6)',
    75: 'rgba(37, 99, 235, 0.2)',
    90: 'rgba(217, 119, 6, 0.25)',
    97: 'rgba(220, 38, 38, 0.25)'
  };

  var PERCENTILE_WIDTHS = {
    3: 1, 10: 1, 25: 1.5, 50: 2.5, 75: 1.5, 90: 1, 97: 1
  };

  var PERCENTILE_DASHES = {
    3: [4, 4], 10: [4, 4], 25: [2, 2], 50: [], 75: [2, 2], 90: [4, 4], 97: [4, 4]
  };

  function percentileDataset(label, data, pct) {
    return {
      label: label,
      data: data,
      borderColor: PERCENTILE_COLORS[pct] || 'rgba(37,99,235,0.3)',
      borderWidth: PERCENTILE_WIDTHS[pct] || 1,
      borderDash: PERCENTILE_DASHES[pct] || [],
      pointRadius: 0,
      pointHoverRadius: 0,
      fill: false,
      tension: 0.3
    };
  }

  function patientPointDataset(label, data) {
    return {
      label: label,
      data: data,
      borderColor: '#2563eb',
      backgroundColor: '#2563eb',
      pointRadius: 6,
      pointHoverRadius: 8,
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      showLine: true,
      borderWidth: 2,
      fill: false,
      tension: 0.1,
      order: -1 /* draw on top */
    };
  }

  function baseChartConfig(xLabel, yLabel) {
    return {
      type: 'line',
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'nearest', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#111827',
            titleFont: { family: "'Inter', sans-serif", size: 13, weight: '600' },
            bodyFont: { family: "'Inter', sans-serif", size: 12 },
            padding: 10,
            cornerRadius: 8,
            displayColors: false
          }
        },
        scales: {
          x: {
            title: { display: true, text: xLabel, font: { family: "'Inter', sans-serif", size: 12, weight: '600' }, color: '#6b7280' },
            grid: { color: 'rgba(0,0,0,.04)' },
            ticks: { font: { family: "'Inter', sans-serif", size: 11 }, color: '#9ca3af' }
          },
          y: {
            title: { display: true, text: yLabel, font: { family: "'Inter', sans-serif", size: 12, weight: '600' }, color: '#6b7280' },
            grid: { color: 'rgba(0,0,0,.04)' },
            ticks: { font: { family: "'Inter', sans-serif", size: 11 }, color: '#9ca3af' }
          }
        }
      }
    };
  }

  return {
    PERCENTILE_COLORS: PERCENTILE_COLORS,
    percentileDataset: percentileDataset,
    patientPointDataset: patientPointDataset,
    baseChartConfig: baseChartConfig
  };
})();
