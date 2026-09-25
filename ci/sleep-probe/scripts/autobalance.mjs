// autobalance.mjs -- decide how many render workers may run RIGHT NOW, from live system
// state. Imported by render-all.mjs and fog-pass.mjs; also runnable directly to inspect.
//
// WHY THIS EXISTS: a fixed `--jobs N` is wrong in both directions on a desktop machine.
// Too high and it starves Chrome / VS Code / a competing job and the laptop freezes (which
// has happened here before). Too low and a 2-hour render takes 4 hours while 5 GB of RAM
// and 4 cores sit idle. The right number changes minute to minute as other apps come and go,
// so it has to be re-evaluated between clips rather than chosen once at launch.
//
// MEASURED INPUTS (this machine, 2026-09-17, during a real 467-clip render):
//   one render-clip worker  = ~0.52 GB RSS, ~1.1 cores, 35 threads
//   Chrome 4.74 GB / VS Code 2.00 GB / java 1.43 GB resident -- must never be squeezed
//   8 cores, 15.4 GB total
//
// THE RULES
//  1. RAM is a hard constraint, CPU is a soft one. Running out of RAM swaps and freezes the
//     desktop; running out of CPU just makes everything slower. So RAM sets the ceiling and
//     load only trims it.
//  2. Always keep a RESERVE free for the apps the user is actually using. Workers may only
//     consume (available - reserve).
//  3. Read MemAvailable, never MemFree. MemFree excludes reclaimable page cache and badly
//     understates what is usable on Linux -- the old guard passed a 1.8 GB situation as fine.
//  4. Never scale to 0: that would deadlock the pump loop. The floor is 1, and if even one
//     worker does not fit we still run one (the alternative is never finishing) but say so.
//  5. RATCHET DOWN FAST, UP SLOW. Pressure is an emergency; spare capacity is not. Dropping
//     immediately protects the desktop, while requiring several consecutive healthy samples
//     before adding a worker stops it oscillating every time a Chrome tab allocates.

import { readFileSync } from "node:fs";
import { cpus, freemem, totalmem, loadavg } from "node:os";

export const DEFAULTS = {
  perWorkerGB: 0.6,     // measured 0.52, rounded up for headroom
  perWorkerCores: 1.1,  // measured ~110% CPU per worker
  reserveGB: 3.0,       // left free for Chrome/VS Code/etc so they never swap
  reserveCores: 2.0,    // left free so the UI stays responsive
  maxJobs: 6,
  minJobs: 1,
  upAfter: 3,           // consecutive healthy samples before adding a worker
};

export function availableGB() {
  try {
    const m = readFileSync("/proc/meminfo", "utf8").match(/^MemAvailable:\s+(\d+) kB/m);
    if (m) return parseInt(m[1], 10) / 1e6;
  } catch { /* non-linux */ }
  return freemem() / 1e9;   // fallback: understates on Linux, fine elsewhere
}

// CPU PRESSURE FROM /proc/stat, NOT loadavg. Measured on this machine while the CPU was
// genuinely saturated: /proc/stat showed 99.3% busy (7.9 of 8 cores) while loadavg[0] read
// **16.8**. loadavg counts runnable AND blocked tasks and decays over a minute, so it is
// neither instantaneous nor bounded by the core count -- feeding it into a core budget gave
// `byCpu: -8` and pinned the balancer at 1 worker forever. /proc/stat deltas give a true
// 0..cores utilisation over a short window.
//
// `busyCores()` samples twice `ms` apart. Callers between clips can afford 300ms.
let lastStat = null;
function readStat() {
  try {
    const v = readFileSync("/proc/stat", "utf8").split("\n")[0].trim().split(/\s+/).slice(1).map(Number);
    return { total: v.slice(0, 8).reduce((a, b) => a + b, 0), idle: v[3] + v[4] };
  } catch { return null; }
}
export function busyCores(cores = cpus().length) {
  const now = readStat();
  if (!now) return Math.min(cores, loadavg()[0]);     // non-linux fallback, clamped
  if (!lastStat) { lastStat = now; return 0; }        // first call: assume idle, corrected next tick
  const dt = now.total - lastStat.total, di = now.idle - lastStat.idle;
  lastStat = now;
  if (dt <= 0) return 0;
  return Math.max(0, Math.min(cores, cores * (1 - di / dt)));
}

// Our own workers are part of that busy figure, so subtract their cost to get everyone
// else's demand. Without this the balancer reads its own load as external pressure.
export function foreignCores(activeWorkers, o = DEFAULTS) {
  return Math.max(0, busyCores() - activeWorkers * o.perWorkerCores);
}

/**
 * How many workers may run now.
 * @param {number} active  workers currently running (so their own cost is not double-counted)
 * @param {object} o       overrides for DEFAULTS
 */
export function targetJobs(active = 0, o = {}) {
  const c = { ...DEFAULTS, ...o };
  const cores = cpus().length;
  const avail = availableGB();

  // RAM ceiling: the memory our workers already hold is part of `avail`'s absence, so add it
  // back before dividing -- otherwise the target shrinks as we scale up, which is unstable.
  const usableGB = avail + active * c.perWorkerGB - c.reserveGB;
  const byRam = Math.floor(usableGB / c.perWorkerGB);

  // CPU ceiling from everyone else's measured utilisation
  const foreign = foreignCores(active, c);
  const usableCores = cores - c.reserveCores - foreign;
  const byCpu = Math.floor(usableCores / c.perWorkerCores);

  const n = Math.min(byRam, byCpu, c.maxJobs);
  return {
    jobs: Math.max(c.minJobs, n),
    byRam, byCpu, availGB: +avail.toFixed(2),
    foreign: +foreign.toFixed(2),
    starved: n < c.minJobs,   // even one worker does not fit; we run one anyway
  };
}

/**
 * Stateful controller: ratchets down immediately, up only after `upAfter` healthy samples.
 * Call `.decide(active)` between clips; it returns the worker count to use next.
 */
export function makeBalancer(o = {}) {
  const c = { ...DEFAULTS, ...o };
  let current = c.minJobs, healthy = 0, lastLog = 0;
  return {
    get current() { return current; },
    decide(active) {
      const t = targetJobs(active, c);
      let changed = null;

      // DISTRESS OVERRIDE. `targetJobs` adds our own workers' memory back before dividing,
      // which is correct for sizing from scratch but HIDES real pressure: measured in a
      // deterministic test, Chrome ballooning to leave 3.5 GB available with 3 workers
      // running produced byRam=3 -- exactly the current level -- so nothing scaled down
      // even though only 0.5 GB of slack remained above the reserve. Scale-down must be
      // judged on RAW headroom, not on the add-back figure.
      const slack = t.availGB - c.reserveGB;
      if (slack < c.perWorkerGB && current > c.minJobs) {
        current -= 1; healthy = 0; changed = "down (distress)";
        console.error(`  [autobalance] DISTRESS: only ${t.availGB.toFixed(2)}GB available, ` +
          `${slack.toFixed(2)}GB above the ${c.reserveGB}GB reserve -- shedding a worker`);
        return current;
      }

      if (t.jobs < current) {
        current = t.jobs; healthy = 0; changed = "down";   // pressure: act at once
      } else if (t.jobs > current) {
        if (++healthy >= c.upAfter) { current += 1; healthy = 0; changed = "up"; }
      } else healthy = 0;
      // log a change, or a heartbeat at most every 2 minutes
      const now = Date.now();
      if (changed || now - lastLog > 120000) {
        lastLog = now;
        console.error(`  [autobalance] jobs=${current}${changed ? ` (${changed})` : ""}` +
          ` | avail ${t.availGB}GB | ram-cap ${t.byRam} cpu-cap ${t.byCpu} | foreign load ${t.foreign}` +
          (t.starved ? " | STARVED: running 1 anyway" : ""));
      }
      return current;
    },
  };
}

// direct invocation: print the decision and exit. Two samples 400ms apart, because
// busyCores() needs a prior reading to compute a delta -- a single call always reports 0.
if (import.meta.url === `file://${process.argv[1]}`) {
  const a = parseInt((process.argv.find((x) => x.startsWith("--active=")) || "--active=0").split("=")[1], 10);
  busyCores();
  await new Promise((r) => setTimeout(r, 400));
  const t = targetJobs(a);
  console.log(JSON.stringify({ ...t, cores: cpus().length, totalGB: +(totalmem() / 1e9).toFixed(1) }, null, 1));
}
