// bgm.mjs — CI-vendored shim, NOT a copy of the real media-use skill's
// scripts/lib/bgm.mjs. That file pulls in a much deeper dependency chain
// (heygen.mjs, python.mjs, an MLmusic-generation Python probe) that exists
// to actually GENERATE/fetch BGM — none of which assemble-index.mjs needs.
// assemble-index.mjs only ever calls the one pure constant-lookup function
// below (bgmDefaultVolume), and only on the branch where audio_meta.json's
// "bgm" field is non-null. This file exists purely so that top-level import
// doesn't crash when bgm is null (the common case for a documentary-broll
// replay run) — copied verbatim from the real file's own definition, not
// reimplemented/guessed. If the real bgm.mjs's BGM_BED_VOLUME/
// BGM_SILENT_VOLUME constants ever change, update this file to match.
export const BGM_BED_VOLUME = 0.12;
export const BGM_SILENT_VOLUME = 0.9;
export const bgmDefaultVolume = (hasVoice) => (hasVoice ? BGM_BED_VOLUME : BGM_SILENT_VOLUME);
