function computeDayMinutes({ shiftStart, shiftEnd, timeIn, timeOut }) {
  const s = toMinutes(shiftStart);
  const e0 = toMinutes(shiftEnd);
  if (s == null || e0 == null) return { late: 0, under: 0 };

  const overnight = e0 <= s;
  const e = overnight ? e0 + 1440 : e0;
  const shiftLen = e - s;

  let late = 0;
  let under = 0;

  const tin = toMinutes(timeIn);
  const tout = toMinutes(timeOut);

  // LATE
  if (tin != null) {
    // Overnight: time-in sa madaling-araw (bago mag-end) ay kinabukasan na ng shift start
    const tinAbs = overnight && tin < e0 ? tin + 1440 : tin;
    if (tinAbs > s) {
      late = Math.min(tinAbs - s, shiftLen);
      if (late <= LATE_GRACE_MINUTES) late = 0;
    }
  }

  // UNDERTIME
  const singlePunch = tin != null && tout === tin;
  if (tout != null && !singlePunch) {
    let toutAbs = tout;

    if (overnight) {
      if (tout < e0) {
        toutAbs = tout + 1440;        // madaling-araw, loob pa ng shift (e.g. 05:00)
      } else if (tout < s) {
        return { late, under: shiftLen }; // umalis BAGO mag-start ang shift (e.g. 21:02) = buong shift
      }
      // else: tout >= s (e.g. 23:00), same day
    } else if (tin != null && tout < tin) {
      toutAbs = tout + 1440;
    }

    under = Math.min(Math.max(0, e - toutAbs), shiftLen);
  }

  return { late, under };
}