/* ================================================================
   TinyHumanMD | LMS Z-Score & Percentile Engine
   Implements the Lambda-Mu-Sigma method used by WHO and CDC for
   pediatric anthropometric calculations.
   ================================================================ */
var LMS = (function () {
  'use strict';

  /* ── Standard normal CDF (Abramowitz & Stegun approximation) ── */
  function normCDF(z) {
    if (z < -6) return 0;
    if (z > 6) return 1;
    var a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    var a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    var sign = z < 0 ? -1 : 1;
    z = Math.abs(z) / Math.sqrt(2);
    var t = 1.0 / (1.0 + p * z);
    var y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
    return 0.5 * (1.0 + sign * y);
  }

  /* ── Inverse normal CDF (rational approximation) ──────────── */
  function normInv(p) {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    if (p === 0.5) return 0;
    var a = [-3.969683028665376e+01, 2.209460984245205e+02,
             -2.759285104469687e+02, 1.383577518672690e+02,
             -3.066479806614716e+01, 2.506628277459239e+00];
    var b = [-5.447609879822406e+01, 1.615858368580409e+02,
             -1.556989798598866e+02, 6.680131188771972e+01,
             -1.328068155288572e+01];
    var c = [-7.784894002430293e-03, -3.223964580411365e-01,
             -2.400758277161838e+00, -2.549732539343734e+00,
              4.374664141464968e+00, 2.938163982698783e+00];
    var d = [7.784695709041462e-03, 3.224671290700398e-01,
             2.445134137142996e+00, 3.754408661907416e+00];
    var pLow = 0.02425, pHigh = 1 - pLow;
    var q, r;
    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
             ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
    } else if (p <= pHigh) {
      q = p - 0.5; r = q * q;
      return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5]) * q /
             (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
              ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
    }
  }

  /* ── Interpolate LMS parameters at a given age ───────────── */
  function interpolateLMS(table, age) {
    if (!table || table.length === 0) return null;
    /* Clamp to range */
    if (age <= table[0].age) return { L: table[0].L, M: table[0].M, S: table[0].S };
    if (age >= table[table.length - 1].age) {
      var last = table[table.length - 1];
      return { L: last.L, M: last.M, S: last.S };
    }
    /* Find surrounding points */
    for (var i = 0; i < table.length - 1; i++) {
      if (age >= table[i].age && age <= table[i + 1].age) {
        var frac = (age - table[i].age) / (table[i + 1].age - table[i].age);
        return {
          L: table[i].L + frac * (table[i + 1].L - table[i].L),
          M: table[i].M + frac * (table[i + 1].M - table[i].M),
          S: table[i].S + frac * (table[i + 1].S - table[i].S)
        };
      }
    }
    return null;
  }

  /* ── Calculate Z-score from value + LMS parameters ────────── */
  function zScore(value, L, M, S) {
    if (M <= 0 || S <= 0 || value <= 0) return null;
    if (Math.abs(L) < 0.001) {
      /* When L ≈ 0, use logarithmic form */
      return Math.log(value / M) / S;
    }
    return (Math.pow(value / M, L) - 1) / (L * S);
  }

  /* ── Calculate value from Z-score + LMS parameters ────────── */
  function valueFromZ(z, L, M, S) {
    if (Math.abs(L) < 0.001) {
      return M * Math.exp(S * z);
    }
    return M * Math.pow(1 + L * S * z, 1 / L);
  }

  /* ── Public API ──────────────────────────────────────────── */
  return {
    /**
     * Calculate Z-score and percentile for a measurement.
     * @param {Array} table - LMS reference data [{age, L, M, S}, ...]
     * @param {number} age - Age in the table's unit (months, days, etc.)
     * @param {number} value - Measured value
     * @returns {Object|null} {z, percentile, lms} or null if invalid
     */
    calculate: function (table, age, value) {
      var lms = interpolateLMS(table, age);
      if (!lms) return null;
      var z = zScore(value, lms.L, lms.M, lms.S);
      if (z === null) return null;
      /* Clamp extreme Z-scores */
      z = Math.max(-5, Math.min(5, z));
      return {
        z: Math.round(z * 100) / 100,
        percentile: Math.round(normCDF(z) * 10000) / 100,
        lms: lms
      };
    },

    /**
     * Get the value at a given percentile for a given age.
     * @param {Array} table - LMS reference data
     * @param {number} age - Age in table's unit
     * @param {number} percentile - Percentile (0-100)
     * @returns {number|null}
     */
    valueAtPercentile: function (table, age, percentile) {
      var lms = interpolateLMS(table, age);
      if (!lms) return null;
      var z = normInv(percentile / 100);
      return Math.round(valueFromZ(z, lms.L, lms.M, lms.S) * 100) / 100;
    },

    /**
     * Generate percentile curve data for charting.
     * @param {Array} table - LMS reference data
     * @param {number} percentile - e.g. 50, 97
     * @param {number} [step] - Age step (default: 1)
     * @returns {Array} [{age, value}, ...]
     */
    percentileCurve: function (table, percentile, step) {
      if (!table || table.length === 0) return [];
      step = step || 1;
      var minAge = table[0].age;
      var maxAge = table[table.length - 1].age;
      var points = [];
      for (var a = minAge; a <= maxAge; a += step) {
        var val = this.valueAtPercentile(table, a, percentile);
        if (val !== null) points.push({ age: a, value: val });
      }
      return points;
    },

    /* Expose utility functions */
    normCDF: normCDF,
    normInv: normInv,
    interpolateLMS: interpolateLMS
  };
})();
