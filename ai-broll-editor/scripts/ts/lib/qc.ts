// Spec 15.3 vision-review vocabulary, shared by qc_stills.ts and qc_apply.ts (kept out of the CLIs so importing never runs a main()).
export const QC_ISSUES = ["none", "off-topic", "watermark", "text-cut", "unreadable", "black", "duplicate", "letterbox", "credit-missing"] as const;
export const QC_ACTIONS = ["ok", "swap-alternate", "move-text", "drop-text", "change-layout"] as const;
