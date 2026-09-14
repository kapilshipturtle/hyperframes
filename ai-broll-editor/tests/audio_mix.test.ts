import { describe, expect, it } from "vitest";
import { buildPremix, buildSfxStems, framesToMs, musicFilter, resolveAudioTracks, sfxFilter } from "../scripts/ts/lib/audio_graph.js";
import type { MusicItem, SfxItem, Timeline } from "../scripts/ts/types.js";

const sfx = (from: number, i = 1): SfxItem => ({ id: `s_${i}`, from, src: `sfx/whoosh-${i}.mp3`, volume: 0.35, tag: "whoosh-soft", reason: "t" });
const music = (o: Partial<MusicItem> = {}): MusicItem => ({ id: "m_1", from: 0, durationInFrames: 2850, src: "music/a.mp3", volume: 0.14, fadeInFrames: 30, fadeOutFrames: 45, sectionIds: ["sec_01"], tag: "upbeat-corporate", ...o });
const resolve = (s: string) => `/abs/${s}`;

describe("audio graph", () => {
  it("adelay ms = round(from / 30 * 1000)", () => {
    expect(framesToMs(104)).toBe(3467);
    expect(framesToMs(40)).toBe(1333);
    expect(sfxFilter(sfx(104), 2, "[s1]")).toBe("[2:a]aresample=48000,aformat=channel_layouts=stereo,adelay=3467|3467,volume=0.35[s1]");
  });

  it("batches sfx into stems of 60", () => {
    const list = Array.from({ length: 130 }, (_, i) => sfx(i * 60, i));
    const stems = buildSfxStems(list, resolve, 9000);
    expect(stems.map((s) => s.inputs.length)).toEqual([60, 60, 10]);
    expect(stems[0].filterComplex).toContain("amix=inputs=60:normalize=0:dropout_transition=0");
    expect(stems[0].inputs[3]).toEqual(["-i", "/abs/sfx/whoosh-3.mp3"]);
    expect(buildSfxStems([], resolve, 100)).toEqual([]);
  });

  it("music: trim, fades, volume, loops, negative from", () => {
    const f = musicFilter(music({ from: -30, loopAtFrames: [1200] }), 1, "[m0]");
    expect(f).toContain("aloop=loop=2:size=1920000");
    expect(f).toContain("atrim=0:95.0");
    expect(f).toContain("afade=t=in:st=0:d=1.0");
    expect(f).toContain("afade=t=out:st=93.5:d=1.5");
    expect(f).toContain("volume=0.14");
    expect(f).toContain("atrim=start=1.0");
    expect(musicFilter(music({ from: 90 }), 1, "[m0]")).toContain("adelay=3000|3000");
  });

  it("premix: voice split feeds sidechaincompress, amix normalize=0, alimiter", () => {
    const t = { narration: { src: "narration_norm.m4a", startFrame: 0 }, durationInFrames: 3000, tracks: { music: [music()], sfx: [sfx(10)] } } as unknown as Timeline;
    const a = resolveAudioTracks(t, null);
    const g = buildPremix(a, resolve, ["/abs/stem1.wav"], 3000);
    expect(g.inputs[0]).toEqual(["-i", "/abs/narration_norm.m4a"]);
    expect(g.filterComplex).toContain("asplit=2[voice][sc]");
    expect(g.filterComplex).toContain("[m0][sc]sidechaincompress=threshold=0.02:ratio=8:attack=20:release=400[mduck]");
    expect(g.filterComplex).toContain("[voice][mduck][st0]amix=inputs=3:normalize=0:dropout_transition=0:duration=first,alimiter=limit=0.95[out]");
  });

  it("audio-mix.json overrides win over timeline tracks", () => {
    const t = { narration: { src: "n.m4a", startFrame: 0 }, tracks: { music: [music()], sfx: [] } } as unknown as Timeline;
    const a = resolveAudioTracks(t, { music: [], duckRatio: 4 });
    expect(a.music).toEqual([]);
    expect(a.duckRatio).toBe(4);
    const g = buildPremix(a, resolve, [], 300);
    expect(g.filterComplex).not.toContain("sidechaincompress");
    expect(g.filterComplex).toContain("[voice]alimiter=limit=0.95[out]");
  });
});
