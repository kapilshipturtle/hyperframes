# Run log — orion-news-report

## Run-shape decisions
- Title/end card: NEITHER (cold open straight into news-anchor scene)
- Captions: OFF
- Transition style: mixed-cuts
- Sound design: ambience+foley ON (sparse), transition whooshes OFF-by-default (only where it truly earns it), overlay-entrance cues OFF-by-default (only where it truly earns it), loudness normalize ON
- Color grade: OFF
- Special requirement: first scene must be a news clip / news anchor broadcast shot (cold open)

### Step 2 — beats.mjs
Segmented transcript into 93 beat(s)
  - **words in:** 1737
  - **total duration:** 617.9s
  - **min/max beat duration:** 3s / 6.5s
  - **shortest beat:** 3.1s
  - **longest beat:** 9.7s

## Step 2 — beats + queries
- 93 real beats from transcript + 1 synthetic beat "00" (news-anchor cold open, no narration, silent under start of beat 01)
- sections.json: 7 acts (cold-open-hook, the-lost-ecosystem, the-plan-and-rebuild, the-release, the-surprise-cascade, caveats-and-stakes, resolution)
- queries.json: 94 entries (00-93), see file

### Step 3 — fetch-clips
beat 00: query "news anchor broadcast studio"
  - **script-level pick:** pexels/pexels-v3433789 [video] 1920x1080, 20s
  - **candidates (scored/raw):** 18/18
  - **top 3 by score:** pexels/pexels-v3433789(16), pexels/pexels-v14367163(15), pexels/pexels-p10464787(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 01: query "ranger wading through tall reeds wetland"
  - **script-level pick:** pexels/pexels-v9846351 [video] 1920x1080, 66s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v9846351(16), pexels/pexels-v31859478(14), pexels/pexels-p35425539(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 02: query "man photographing wildlife camera reeds"
  - **script-level pick:** pexels/pexels-v11214443 [video] 1920x1080, 61s
  - **candidates (scored/raw):** 11/11
  - **top 3 by score:** pexels/pexels-v11214443(16), pexels/pexels-v11454232(14), pexels/pexels-p22036850(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 03: query "tiger taxidermy museum display"
  - **script-level pick:** pexels/pexels-v7378625 [video] 1920x1080, 41s
  - **candidates (scored/raw):** 18/18
  - **top 3 by score:** pexels/pexels-v7378625(14), pexels/pexels-p4162719(14), pexels/pexels-v5427520(13)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 04: query "dry cracked wetland overgrazed scrubland"
  - **script-level pick:** pexels/pexels-v37533724 [video] 1920x1080, 48s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v37533724(16), pexels/pexels-v36034914(14), pexels/pexels-p6915305(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 05: query "researcher looking at dried wetland field notes"
  - **script-level pick:** pexels/pexels-v6132816 [video] 1366x720, 23s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v6132816(16), pexels/pexels-v8514703(14), pexels/pexels-p16629768(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 06: query "animal transport crate opening release"
  - **script-level pick:** pexels/pexels-v7337446 [video] 1920x1080, 16s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v7337446(17), pexels/pexels-v13925460(14), pexels/pexels-p28380854(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 07: query "tiger walking out of crate slow motion"
  - **script-level pick:** pexels/pexels-v7246228 [video] 1920x1080, 27s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v7246228(16), pexels/pexels-v6989257(14), pexels/pexels-p6218953(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 08: query "ecologist walking through reed marsh"
  - **script-level pick:** pexels/pexels-v16639723 [video] 1920x1080, 26s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v16639723(17), pexels/pexels-p19011345(14), pexels/pexels-p9052981(12)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 09: query "river delta aerial drone mountains"
  - **script-level pick:** pexels/pexels-v4275176 [video] 1920x1080, 28s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v4275176(17), pexels/pexels-v4275467(14), pexels/pexels-p4338097(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 10: query "large lake aerial split colors"
  - **script-level pick:** pexels/pexels-v8415422 [video] 1920x1080, 9s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v8415422(17), pexels/pexels-v37092733(15), pexels/pexels-p8414034(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 11: query "riverside forest delta aerial wetland trees"
  - **script-level pick:** pexels/pexels-v39129487 [video] 1920x1080, 22s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v39129487(16), pexels/pexels-v32740676(14), pexels/pexels-p31283196(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 12: query "tall reeds wetland channel willow trees"
  - **script-level pick:** pexels/pexels-v39300396 [video] 1920x1080, 50s
  - **candidates (scored/raw):** 10/10
  - **top 3 by score:** pexels/pexels-v39300396(16), pexels/pexels-v1444839(14), pexels/pexels-p37894974(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 13: query "tiger walking through reeds"
  - **script-level pick:** pexels/pexels-v39018600 [video] 1920x1440, 10s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v39018600(15), pexels/pexels-p16878229(14), pexels/pexels-v39005165(13)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 14: query "tiger close up fur pattern"
  - **script-level pick:** pexels/pexels-v29640886 [video] 1920x1080, 9s
  - **candidates (scored/raw):** 14/14
  - **top 3 by score:** pexels/pexels-v29640886(17), pexels/pexels-p13421656(14), openverse/openverse-2f319a36-5815-4d5e-94ee-38280ab11cf1(13)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 15: query "tiger stalking prey water"
  - **script-level pick:** pexels/pexels-v7492891 [video] 1920x1080, 20s
  - **candidates (scored/raw):** 15/15
  - **top 3 by score:** pexels/pexels-v7492891(16), pexels/pexels-v39005165(15), pexels/pexels-p21618359(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 16: query "desert steppe landscape central asia"
  - **script-level pick:** pexels/pexels-v14381270 [video] 1920x1080, 36s
  - **candidates (scored/raw):** 17/17
  - **top 3 by score:** pexels/pexels-v14381270(16), pexels/pexels-p5110972(14), pexels/pexels-v37984596(13)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 17: query "old black and white archival wildlife survey"
  - **script-level pick:** pexels/pexels-v31966138 [video] 1920x1080, 14s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v31966138(16), pexels/pexels-v31811331(15), pexels/pexels-p38666630(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 18: query "vintage hunting trap pelt old photograph"
  - **script-level pick:** pexels/pexels-v39116266 [video] 1920x1080, 25s
  - **candidates (scored/raw):** 11/11
  - **top 3 by score:** pexels/pexels-v39116266(16), pexels/pexels-v8532654(14), pexels/pexels-p12072265(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 19: query "old fur pelt trade market vintage"
  - **script-level pick:** pexels/pexels-v34569883 [video] 1920x1080, 18s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v34569883(16), pexels/pexels-v37685507(15), pexels/pexels-p14605084(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 20: query "irrigation canal cotton field aerial"
  - **script-level pick:** pexels/pexels-v9985196 [video] 1920x1080, 30s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v9985196(16), pexels/pexels-v9977366(14), pexels/pexels-p31454647(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 21: query "deer herd grazing open field"
  - **script-level pick:** pexels/pexels-v12208388 [video] 1920x1080, 17s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v12208388(17), pexels/pexels-v34778319(15), pexels/pexels-p3282584(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 22: query "old paper wildlife survey record document"
  - **script-level pick:** pexels/pexels-v10639709 [video] 1920x1080, 10s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v10639709(17), pexels/pexels-v30117908(14), pexels/pexels-p12983110(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 23: query "extinction stamp red endangered list document"
  - **script-level pick:** pexels/pexels-v6657754 [video] 1366x720, 17s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v6657754(17), pexels/pexels-v6657751(15), pexels/pexels-p6661042(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 24: query "empty grassland no predator wide shot"
  - **script-level pick:** pexels/pexels-v3204057 [video] 1920x1080, 17s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v3204057(17), pexels/pexels-v6338334(14), pexels/pexels-p11623289(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 25: query "wetland flooding retreating aerial timelapse"
  - **script-level pick:** pexels/pexels-v35035433 [video] 1920x1080, 16s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v35035433(17), pexels/pexels-v35002646(15), pexels/pexels-p36210444(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 26: query "researcher looking worried at data reports"
  - **script-level pick:** pexels/pexels-v8134768 [video] 1366x720, 15s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v8134768(16), pexels/pexels-v9034510(15), pexels/pexels-p7580704(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 27: query "tiger in enclosure cage reserve"
  - **script-level pick:** pexels/pexels-v5495322 [video] 1920x1080, 116s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v5495322(16), pexels/pexels-v5669112(14), pexels/pexels-p31114594(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 28: query "conservation team meeting planning reserve"
  - **script-level pick:** pexels/pexels-v3246669 [video] 1920x1080, 15s
  - **candidates (scored/raw):** 14/14
  - **top 3 by score:** pexels/pexels-v3246669(17), pexels/pexels-p3662370(14), pexels/pexels-v7668952(13)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 29: query "dna lab testing sample scientist"
  - **script-level pick:** pexels/pexels-v9573572 [video] 1366x720, 13s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v9573572(15), pexels/pexels-p9574332(14), pexels/pexels-v3735748(13)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 30: query "amur tiger russia forest snow"
  - **script-level pick:** pexels/pexels-v29640886 [video] 1920x1080, 9s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v29640886(15), pexels/pexels-p31686993(14), pexels/pexels-v39005165(13)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 31: query "two tigers comparison side by side"
  - **script-level pick:** pexels/pexels-v7492891 [video] 1920x1080, 20s
  - **candidates (scored/raw):** 17/17
  - **top 3 by score:** pexels/pexels-v7492891(17), pexels/pexels-v29640886(15), pexels/pexels-p37439513(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 32: query "tiger walking confident forward"
  - **script-level pick:** pexels/pexels-v31691426 [video] 1366x720, 18s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v31691426(16), pexels/pexels-v39005165(15), pexels/pexels-p37339203(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 33: query "conservation biologist reviewing map"
  - **script-level pick:** pexels/pexels-v3010400 [video] 1920x1080, 55s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v3010400(16), pexels/pexels-v34573375(15), pexels/pexels-p11602248(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 34: query "wildlife reserve fence protected area sign"
  - **script-level pick:** pexels/pexels-v4169060 [video] 1920x1080, 10s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v4169060(17), pexels/pexels-v4252060(15), pexels/pexels-p12119665(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 35: query "empty prey habitat degraded land"
  - **script-level pick:** pexels/pexels-v17286856 [video] 1920x1080, 26s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v17286856(16), pexels/pexels-v16486651(14), pexels/pexels-p35279538(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 36: query "vast protected nature reserve aerial"
  - **script-level pick:** pexels/pexels-v26841435 [video] 1920x1080, 13s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v26841435(17), pexels/pexels-v15184666(14), pexels/pexels-p15512976(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 37: query "large protected wilderness landscape aerial"
  - **script-level pick:** pexels/pexels-v31482891 [video] 1920x1080, 14s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v31482891(17), pexels/pexels-v26841435(15), pexels/pexels-p27776676(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 38: query "water flowing irrigation dam release"
  - **script-level pick:** pexels/pexels-v3820576 [video] 1920x1080, 14s
  - **candidates (scored/raw):** 18/18
  - **top 3 by score:** pexels/pexels-v3820576(17), pexels/pexels-v32540253(15), pexels/pexels-p29759329(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 39: query "reforestation planting trees volunteers"
  - **script-level pick:** pexels/pexels-v31972591 [video] 1920x1080, 53s
  - **candidates (scored/raw):** 18/18
  - **top 3 by score:** pexels/pexels-v31972591(16), pexels/pexels-v31972553(14), pexels/pexels-p28662953(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 40: query "years passing time lapse forest growth"
  - **script-level pick:** pexels/pexels-v6093235 [video] 1920x1080, 24s
  - **candidates (scored/raw):** 11/11
  - **top 3 by score:** pexels/pexels-v6093235(16), pexels/pexels-v6093248(14), pexels/pexels-p30017149(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 41: query "deer breeding enclosure release wild"
  - **script-level pick:** pexels/pexels-v2968031 [video] 1920x1080, 10s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v2968031(17), pexels/pexels-p37107318(14), pexels/pexels-v5946237(13)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 42: query "deer herd released into wild running"
  - **script-level pick:** pexels/pexels-v34903876 [video] 1920x1080, 20s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v34903876(16), pexels/pexels-v35015125(14), pexels/pexels-p30574311(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 43: query "wild boar rooting ground forest"
  - **script-level pick:** pexels/pexels-v26775351 [video] 1920x1080, 30s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v26775351(16), pexels/pexels-v16023597(14), pexels/pexels-p31331823(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 44: query "boar damaged soil ground rooting"
  - **script-level pick:** pexels/pexels-v16023597 [video] 1920x1080, 34s
  - **candidates (scored/raw):** 11/11
  - **top 3 by score:** pexels/pexels-v16023597(16), pexels/pexels-v3171929(15), pexels/pexels-p14298652(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 45: query "ecologist counting wildlife camera trap"
  - **script-level pick:** pexels/pexels-v10384142 [video] 1366x720, 34s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v10384142(16), pexels/pexels-v39060971(14), pexels/pexels-p11749416(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 46: query "deer grazing calm no fear open field"
  - **script-level pick:** pexels/pexels-v30006732 [video] 1920x1080, 22s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v30006732(16), pexels/pexels-v10780284(14), pexels/pexels-p9524991(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 47: query "tiger cub raised breeding facility"
  - **script-level pick:** pexels/pexels-v5795116 [video] 1920x1080, 22s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v5795116(17), pexels/pexels-v37156664(15), pexels/pexels-p27834722(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 48: query "tiger hunting instinct training enclosure"
  - **script-level pick:** pexels/pexels-v37885533 [video] 1920x1080, 25s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v37885533(17), pexels/pexels-v5669238(14), pexels/pexels-p16878227(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 49: query "tiger soft release enclosure large fenced"
  - **script-level pick:** pexels/pexels-v37156664 [video] 1920x1080, 16s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v37156664(17), pexels/pexels-v36209937(14), pexels/pexels-p31098210(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 50: query "tiger hunting deer enclosure fence"
  - **script-level pick:** pexels/pexels-v2968031 [video] 1920x1080, 10s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v2968031(15), pexels/pexels-p3736482(14), pexels/pexels-v30853101(13)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 51: query "gps collar wildlife tracking device"
  - **script-level pick:** pexels/pexels-v5607552 [video] 1920x1080, 7s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v5607552(17), pexels/pexels-v10775090(14), pexels/pexels-p36620924(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 52: query "remote gate opening release mechanism"
  - **script-level pick:** pexels/pexels-v9792637 [video] 1920x1080, 11s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v9792637(17), pexels/pexels-v8846989(15), pexels/pexels-p30173791(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 53: query "tiger resting near tree line"
  - **script-level pick:** pexels/pexels-v7492891 [video] 1920x1080, 20s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v7492891(16), pexels/pexels-v7722973(14), pexels/pexels-p35220983(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 54: query "tiger in forest shade waiting"
  - **script-level pick:** pexels/pexels-v27683637 [video] 1920x1080, 9s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v27683637(17), pexels/pexels-v39018600(14), pexels/pexels-p2926038(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 55: query "tiger walking into reed channel dusk"
  - **script-level pick:** pexels/pexels-v31691426 [video] 1366x720, 18s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v31691426(17), pexels/pexels-v36470105(15), pexels/pexels-p13877006(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 56: query "tiger walking through wetland reeds hunting"
  - **script-level pick:** pexels/pexels-v31691426 [video] 1366x720, 18s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v31691426(17), pexels/pexels-v36683555(14), pexels/pexels-p35887198(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 57: query "wild tiger walking alone wilderness"
  - **script-level pick:** pexels/pexels-v31691426 [video] 1366x720, 18s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v31691426(17), pexels/pexels-p37339203(14), pexels/pexels-v7492891(13)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 58: query "tiger alone no fence wild landscape"
  - **script-level pick:** pexels/pexels-v7492891 [video] 1920x1080, 20s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v7492891(16), pexels/pexels-v39018600(15), pexels/pexels-p33915079(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 59: query "researcher surprised looking at data screen"
  - **script-level pick:** pexels/pexels-v8091892 [video] 1920x1080, 13s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v8091892(16), pexels/pexels-v7580441(14), pexels/pexels-p3784324(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 60: query "yellowstone wolves predator reintroduction"
  - **script-level pick:** pexels/pexels-v27271989 [video] 1920x1080, 29s
  - **candidates (scored/raw):** 15/15
  - **top 3 by score:** pexels/pexels-v27271989(16), pexels/pexels-v8138139(15), pexels/pexels-p32473280(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 61: query "prey animal alert scared predator"
  - **script-level pick:** pexels/pexels-v12709558 [video] 1920x1080, 17s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v12709558(16), pexels/pexels-v12709245(14), pexels/pexels-p10948200(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 62: query "deer herd running away fear predator"
  - **script-level pick:** pexels/pexels-v34903876 [video] 1920x1080, 20s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v34903876(17), pexels/pexels-v35015125(15), pexels/pexels-p10836915(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 63: query "deer grazing near open ground cautious"
  - **script-level pick:** pexels/pexels-v9398864 [video] 1920x1080, 15s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v9398864(16), pexels/pexels-v36883725(14), pexels/pexels-p16926662(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 64: query "scientist monitoring data graph slow"
  - **script-level pick:** pexels/pexels-v8091892 [video] 1920x1080, 13s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v8091892(16), pexels/pexels-v36393983(15), pexels/pexels-p3912469(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 65: query "gps collar data tracking map screen"
  - **script-level pick:** pexels/pexels-v4762418 [video] 1366x720, 14s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v4762418(17), pexels/pexels-v29978419(15), pexels/pexels-p30403062(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 66: query "deer collar tracking wildlife researcher"
  - **script-level pick:** pexels/pexels-v8552292 [video] 1920x1080, 13s
  - **candidates (scored/raw):** 13/13
  - **top 3 by score:** pexels/pexels-v8552292(17), pexels/pexels-v10780284(14), pexels/pexels-p37324232(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 67: query "tiger hunting successfully forest"
  - **script-level pick:** pexels/pexels-v31691426 [video] 1366x720, 18s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v31691426(16), pexels/pexels-v37885532(14), pexels/pexels-p30658165(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 68: query "deer herd clustering together forest cover"
  - **script-level pick:** pexels/pexels-v36462695 [video] 1920x1080, 11s
  - **candidates (scored/raw):** 11/11
  - **top 3 by score:** pexels/pexels-v36462695(17), pexels/pexels-p139639(14), pexels/pexels-p139640(12)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 69: query "deer near water alert nervous"
  - **script-level pick:** pexels/pexels-v37243803 [video] 1920x1080, 20s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v37243803(16), pexels/pexels-v18048807(14), pexels/pexels-p31683285(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 70: query "deer sniffing air alert scent"
  - **script-level pick:** pexels/pexels-v37243803 [video] 1920x1080, 20s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v37243803(17), pexels/pexels-v37243802(15), pexels/pexels-p8777048(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 71: query "tiger territorial marking scent tree"
  - **script-level pick:** pexels/pexels-v7492891 [video] 1920x1080, 20s
  - **candidates (scored/raw):** 14/14
  - **top 3 by score:** pexels/pexels-v7492891(16), pexels/pexels-v5692954(15), pexels/pexels-p36852051(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 72: query "fear spreading through herd animals running"
  - **script-level pick:** pexels/pexels-v27979821 [video] 1920x1080, 14s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v27979821(17), pexels/pexels-v32536719(15), pexels/pexels-p20263242(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 73: query "dormant instinct animal alert nature"
  - **script-level pick:** pexels/pexels-v7577203 [video] 1920x1080, 13s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v7577203(16), pexels/pexels-v853757(14), pexels/pexels-p35578245(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 74: query "deer pulling back from riverbank"
  - **script-level pick:** pexels/pexels-v852338 [video] 1920x1080, 17s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v852338(17), pexels/pexels-v11276238(14), pexels/pexels-p11249981(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 75: query "willow poplar shoots growing riverbank"
  - **script-level pick:** pexels/pexels-v36840330 [video] 1920x1080, 22s
  - **candidates (scored/raw):** 11/11
  - **top 3 by score:** pexels/pexels-v36840330(17), pexels/pexels-v4189065(15), pexels/pexels-p14836963(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 76: query "plant growth timelapse riverbank recovery"
  - **script-level pick:** pexels/pexels-v32163824 [video] 1920x1080, 61s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v32163824(16), pexels/pexels-v1384687(15), pexels/pexels-p19461442(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 77: query "ecosystem recovery data chart nature"
  - **script-level pick:** pexels/pexels-v39262255 [video] 1920x1080, 39s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v39262255(16), pexels/pexels-v38358369(15), pexels/pexels-p39262369(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 78: query "wetland delta aerial partial recovery"
  - **script-level pick:** pexels/pexels-v32740676 [video] 1920x1080, 25s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v32740676(16), pexels/pexels-v5319415(15), pexels/pexels-p9338938(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 79: query "tiger walking reserve landscape wide"
  - **script-level pick:** pexels/pexels-v6989257 [video] 1280x720, 195s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v6989257(16), pexels/pexels-v6035932(15), pexels/pexels-p36530920(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 80: query "herder livestock conflict wildlife reserve"
  - **script-level pick:** pexels/pexels-v18853785 [video] 1920x1080, 14s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v18853785(17), pexels/pexels-v29814740(15), pexels/pexels-p24896186(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 81: query "single tiger alone in vast wilderness"
  - **script-level pick:** pexels/pexels-v30040139 [video] 1920x1080, 14s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v30040139(17), pexels/pexels-v5692954(15), pexels/pexels-p16878320(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 82: query "shrinking lake aerial satellite view"
  - **script-level pick:** pexels/pexels-v9310412 [video] 1920x1080, 36s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v9310412(16), pexels/pexels-v36034914(14), pexels/pexels-p26771539(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 83: query "dried lake bed cracked earth central asia"
  - **script-level pick:** pexels/pexels-v18990795 [video] 1920x1080, 18s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v18990795(17), pexels/pexels-v37533724(14), pexels/pexels-p35888557(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 84: query "aral sea shipwreck sand desert"
  - **script-level pick:** pexels/pexels-v12842757 [video] 1920x1080, 43s
  - **candidates (scored/raw):** 13/13
  - **top 3 by score:** pexels/pexels-v12842757(16), pexels/pexels-p36429294(14), openverse/openverse-380ceca1-e878-4669-80f6-c329347b41f4(13)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 85: query "rusted fishing boat sand desert lake"
  - **script-level pick:** pexels/pexels-v5835615 [video] 1920x1080, 9s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v5835615(17), pexels/pexels-p33256540(14), pexels/pexels-v36931944(13)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 86: query "river flowing delta water politics"
  - **script-level pick:** pexels/pexels-v5887831 [video] 1920x1080, 38s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v5887831(16), pexels/pexels-v30124668(14), pexels/pexels-p12756665(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 87: query "researcher writing notes field journal"
  - **script-level pick:** pexels/pexels-v6132816 [video] 1366x720, 23s
  - **candidates (scored/raw):** 13/13
  - **top 3 by score:** pexels/pexels-v6132816(16), pexels/pexels-v6550131(15), pexels/pexels-p7609011(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 88: query "ecosystem wetland thriving wildlife"
  - **script-level pick:** pexels/pexels-v34380684 [video] 1920x1080, 26s
  - **candidates (scored/raw):** 18/18
  - **top 3 by score:** pexels/pexels-v34380684(16), pexels/pexels-v11841031(15), pexels/pexels-p12950623(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 89: query "reed channels delta aerial wide"
  - **script-level pick:** pexels/pexels-v39300396 [video] 1920x1080, 50s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v39300396(16), pexels/pexels-v10069767(14), pexels/pexels-p27564096(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 90: query "shrinking lake feeding river delta aerial"
  - **script-level pick:** pexels/pexels-v4275467 [video] 1920x1080, 39s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v4275467(16), pexels/pexels-v10069769(14), pexels/pexels-p32395648(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 91: query "conservation team preparing next release"
  - **script-level pick:** pexels/pexels-v5538262 [video] 1920x1080, 15s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v5538262(16), pexels/pexels-v38992380(15), pexels/pexels-p33336297(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 92: query "tiger crossing delta landscape wild"
  - **script-level pick:** pexels/pexels-v6989257 [video] 1280x720, 195s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v6989257(16), pexels/pexels-v39018600(15), pexels/pexels-p37723242(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 93: query "wetland delta sunset landscape wide"
  - **script-level pick:** pexels/pexels-v5887831 [video] 1920x1080, 38s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v5887831(16), pexels/pexels-v10069767(14), pexels/pexels-p14316203(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

## Step 3 — semantic media review (editorial pass)
- 94 beats fetched (00 synthetic news-anchor cold open + 01-93 real narration beats), all from Pexels (only configured provider) + Openverse pool, no Pixabay/Videvo keys configured
- 28 beats overridden from script's keyword-rank default to a real semantic pick: 13,14,15,17,18,19,22,23,27,30,31,32,47,48,49,50,53,54,55,56,57,58,67,71,79,81,84,85,92 — see media-choices.json for per-beat reasoning (mostly: diversifying the thin "wild tiger" stock pool across ~20 tiger beats so it doesn't loop on the same 2-3 clips, plus real Aral Sea photos found for beats 84/85, real ledger/stamp document photos for 22/23)
- video/photo split: majority video, several photo overrides chosen where a still frame read stronger than the pooled video (close-ups, document beats)
- provider split: 100% Pexels-sourced (only PEXELS_API_KEY configured; Openverse candidates appeared in pools but were rarely the best semantic match for this nature/wildlife topic)
- 2 invented-scene beats: 10 (Lake Balkash fresh/salt split — abstract geographic fact, no real photo shows this), 68 ("cutting exposed time by more than half" — a real before/after percentage the point hinges on, no real footage depicts the actual measured change)
- flagged weak pools (used best available, no strong alternative existed): beat 18 (three-things-ended-it/bounty era), beat 19 (pelt trade) — genuinely thin stock coverage for historical Soviet-era hunting bounty imagery

### Step 4 — download-clip
beat 00: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v3433789
  - **grade:** none
  - **output:** .media/broll/beat-00.mp4

### Step 4 — download-clip
beat 01: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v9846351
  - **grade:** none
  - **output:** .media/broll/beat-01.mp4

### Step 4 — download-clip
beat 02: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v11214443
  - **grade:** none
  - **output:** .media/broll/beat-02.mp4

### Step 4 — download-clip
beat 03: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v7378625
  - **grade:** none
  - **output:** .media/broll/beat-03.mp4

### Step 4 — download-clip
beat 04: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v37533724
  - **grade:** none
  - **output:** .media/broll/beat-04.mp4

### Step 4 — download-clip
beat 05: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v6132816
  - **grade:** none
  - **output:** .media/broll/beat-05.mp4

### Step 4 — download-clip
beat 06: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v7337446
  - **grade:** none
  - **output:** .media/broll/beat-06.mp4

### Step 4 — download-clip
beat 07: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v7246228
  - **grade:** none
  - **output:** .media/broll/beat-07.mp4

### Step 4 — download-clip
beat 08: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v16639723
  - **grade:** none
  - **output:** .media/broll/beat-08.mp4

### Step 4 — download-clip
beat 09: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v4275176
  - **grade:** none
  - **output:** .media/broll/beat-09.mp4

### Step 4 — download-clip
beat 11: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v39129487
  - **grade:** none
  - **output:** .media/broll/beat-11.mp4

### Step 4 — download-clip
beat 12: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v39300396
  - **grade:** none
  - **output:** .media/broll/beat-12.mp4

### Step 4 — download-clip
beat 13: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v39005165
  - **grade:** none
  - **output:** .media/broll/beat-13.mp4

### Step 4 — download-clip
beat 14: downloaded/processed
  - **mediaType:** photo
  - **source:** pexels/pexels-p3704
  - **grade:** none
  - **output:** .media/broll/beat-14.jpg

### Step 4 — download-clip
beat 15: downloaded/processed
  - **mediaType:** photo
  - **source:** pexels/pexels-p21618359
  - **grade:** none
  - **output:** .media/broll/beat-15.jpg

### Step 4 — download-clip
beat 16: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v14381270
  - **grade:** none
  - **output:** .media/broll/beat-16.mp4

### Step 4 — download-clip
beat 17: downloaded/processed
  - **mediaType:** photo
  - **source:** pexels/pexels-p38666630
  - **grade:** none
  - **output:** .media/broll/beat-17.jpg

### Step 4 — download-clip
beat 18: downloaded/processed
  - **mediaType:** photo
  - **source:** pexels/pexels-p12072265
  - **grade:** none
  - **output:** .media/broll/beat-18.jpg

### Step 4 — download-clip
beat 19: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v39116266
  - **grade:** none
  - **output:** .media/broll/beat-19.mp4

### Step 4 — download-clip
beat 20: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v9985196
  - **grade:** none
  - **output:** .media/broll/beat-20.mp4

### Step 4 — download-clip
beat 21: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v12208388
  - **grade:** none
  - **output:** .media/broll/beat-21.mp4

### Step 4 — download-clip
beat 22: downloaded/processed
  - **mediaType:** photo
  - **source:** pexels/pexels-p12983110
  - **grade:** none
  - **output:** .media/broll/beat-22.jpg

### Step 4 — download-clip
beat 23: downloaded/processed
  - **mediaType:** photo
  - **source:** pexels/pexels-p9858904
  - **grade:** none
  - **output:** .media/broll/beat-23.jpg

### Step 4 — download-clip
beat 24: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v3204057
  - **grade:** none
  - **output:** .media/broll/beat-24.mp4

### Step 4 — download-clip
beat 25: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v35035433
  - **grade:** none
  - **output:** .media/broll/beat-25.mp4

### Step 4 — download-clip
beat 26: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v8134768
  - **grade:** none
  - **output:** .media/broll/beat-26.mp4

### Step 4 — download-clip
beat 27: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v7246228
  - **grade:** none
  - **output:** .media/broll/beat-27.mp4

### Step 4 — download-clip
beat 28: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v3246669
  - **grade:** none
  - **output:** .media/broll/beat-28.mp4

### Step 4 — download-clip
beat 29: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v9573572
  - **grade:** none
  - **output:** .media/broll/beat-29.mp4

### Step 4 — download-clip
beat 30: downloaded/processed
  - **mediaType:** photo
  - **source:** pexels/pexels-p302304
  - **grade:** none
  - **output:** .media/broll/beat-30.jpg

### Step 4 — download-clip
beat 31: downloaded/processed
  - **mediaType:** photo
  - **source:** pexels/pexels-p13056749
  - **grade:** none
  - **output:** .media/broll/beat-31.jpg

### Step 4 — download-clip
beat 32: downloaded/processed
  - **mediaType:** photo
  - **source:** pexels/pexels-p30889521
  - **grade:** none
  - **output:** .media/broll/beat-32.jpg

### Step 4 — download-clip
beat 33: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v3010400
  - **grade:** none
  - **output:** .media/broll/beat-33.mp4

### Step 4 — download-clip
beat 34: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v4169060
  - **grade:** none
  - **output:** .media/broll/beat-34.mp4

### Step 4 — download-clip
beat 35: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v17286856
  - **grade:** none
  - **output:** .media/broll/beat-35.mp4

### Step 4 — download-clip
beat 36: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v26841435
  - **grade:** none
  - **output:** .media/broll/beat-36.mp4

### Step 4 — download-clip
beat 37: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v31482891
  - **grade:** none
  - **output:** .media/broll/beat-37.mp4

### Step 4 — download-clip
beat 38: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v3820576
  - **grade:** none
  - **output:** .media/broll/beat-38.mp4

### Step 4 — download-clip
beat 39: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v31972591
  - **grade:** none
  - **output:** .media/broll/beat-39.mp4

### Step 4 — download-clip
beat 40: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v6093235
  - **grade:** none
  - **output:** .media/broll/beat-40.mp4

### Step 4 — download-clip
beat 41: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v2968031
  - **grade:** none
  - **output:** .media/broll/beat-41.mp4

### Step 4 — download-clip
beat 42: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v34903876
  - **grade:** none
  - **output:** .media/broll/beat-42.mp4

### Step 4 — download-clip
beat 43: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v26775351
  - **grade:** none
  - **output:** .media/broll/beat-43.mp4

### Step 4 — download-clip
beat 44: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v16023597
  - **grade:** none
  - **output:** .media/broll/beat-44.mp4

### Step 4 — download-clip
beat 45: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v10384142
  - **grade:** none
  - **output:** .media/broll/beat-45.mp4

### Step 4 — download-clip
beat 46: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v30006732
  - **grade:** none
  - **output:** .media/broll/beat-46.mp4

### Step 4 — download-clip
beat 47: downloaded/processed
  - **mediaType:** photo
  - **source:** pexels/pexels-p28386917
  - **grade:** none
  - **output:** .media/broll/beat-47.jpg

### Step 4 — download-clip
beat 48: downloaded/processed
  - **mediaType:** photo
  - **source:** pexels/pexels-p16878227
  - **grade:** none
  - **output:** .media/broll/beat-48.jpg

### Step 4 — download-clip
beat 49: downloaded/processed
  - **mediaType:** photo
  - **source:** pexels/pexels-p33915079
  - **grade:** none
  - **output:** .media/broll/beat-49.jpg

### Step 4 — download-clip
beat 50: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v9983869
  - **grade:** none
  - **output:** .media/broll/beat-50.mp4

### Step 4 — download-clip
beat 51: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v5607552
  - **grade:** none
  - **output:** .media/broll/beat-51.mp4

### Step 4 — download-clip
beat 52: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v9792637
  - **grade:** none
  - **output:** .media/broll/beat-52.mp4

### Step 4 — download-clip
beat 53: downloaded/processed
  - **mediaType:** photo
  - **source:** pexels/pexels-p35220983
  - **grade:** none
  - **output:** .media/broll/beat-53.jpg

### Step 4 — download-clip
beat 54: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v27683637
  - **grade:** none
  - **output:** .media/broll/beat-54.mp4

### Step 4 — download-clip
beat 55: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v27722639
  - **grade:** none
  - **output:** .media/broll/beat-55.mp4

### Step 4 — download-clip
beat 56: downloaded/processed
  - **mediaType:** photo
  - **source:** pexels/pexels-p35902757
  - **grade:** none
  - **output:** .media/broll/beat-56.jpg

### Step 4 — download-clip
beat 57: downloaded/processed
  - **mediaType:** photo
  - **source:** pexels/pexels-p16878229
  - **grade:** none
  - **output:** .media/broll/beat-57.jpg

### Step 4 — download-clip
beat 58: downloaded/processed
  - **mediaType:** photo
  - **source:** pexels/pexels-p16878320
  - **grade:** none
  - **output:** .media/broll/beat-58.jpg

### Step 4 — download-clip
beat 59: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v8091892
  - **grade:** none
  - **output:** .media/broll/beat-59.mp4

### Step 4 — download-clip
beat 60: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v27271989
  - **grade:** none
  - **output:** .media/broll/beat-60.mp4

### Step 4 — download-clip
beat 61: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v12709558
  - **grade:** none
  - **output:** .media/broll/beat-61.mp4

### Step 4 — download-clip
beat 62: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v34903876
  - **grade:** none
  - **output:** .media/broll/beat-62.mp4

### Step 4 — download-clip
beat 63: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v9398864
  - **grade:** none
  - **output:** .media/broll/beat-63.mp4

### Step 4 — download-clip
beat 64: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v8091892
  - **grade:** none
  - **output:** .media/broll/beat-64.mp4

### Step 4 — download-clip
beat 65: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v4762418
  - **grade:** none
  - **output:** .media/broll/beat-65.mp4

### Step 4 — download-clip
beat 66: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v8552292
  - **grade:** none
  - **output:** .media/broll/beat-66.mp4

### Step 4 — download-clip
beat 67: downloaded/processed
  - **mediaType:** photo
  - **source:** pexels/pexels-p37573898
  - **grade:** none
  - **output:** .media/broll/beat-67.jpg

### Step 4 — download-clip
beat 69: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v37243803
  - **grade:** none
  - **output:** .media/broll/beat-69.mp4

### Step 4 — download-clip
beat 70: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v37243803
  - **grade:** none
  - **output:** .media/broll/beat-70.mp4

### Step 4 — download-clip
beat 71: downloaded/processed
  - **mediaType:** photo
  - **source:** pexels/pexels-p36852051
  - **grade:** none
  - **output:** .media/broll/beat-71.jpg

### Step 4 — download-clip
beat 72: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v27979821
  - **grade:** none
  - **output:** .media/broll/beat-72.mp4

### Step 4 — download-clip
beat 73: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v7577203
  - **grade:** none
  - **output:** .media/broll/beat-73.mp4

### Step 4 — download-clip
beat 74: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v852338
  - **grade:** none
  - **output:** .media/broll/beat-74.mp4

### Step 4 — download-clip
beat 75: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v36840330
  - **grade:** none
  - **output:** .media/broll/beat-75.mp4

### Step 4 — download-clip
beat 76: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v32163824
  - **grade:** none
  - **output:** .media/broll/beat-76.mp4

### Step 4 — download-clip
beat 77: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v39262255
  - **grade:** none
  - **output:** .media/broll/beat-77.mp4

### Step 4 — download-clip
beat 78: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v32740676
  - **grade:** none
  - **output:** .media/broll/beat-78.mp4

### Step 4 — download-clip
beat 79: downloaded/processed
  - **mediaType:** photo
  - **source:** pexels/pexels-p19695694
  - **grade:** none
  - **output:** .media/broll/beat-79.jpg

### Step 4 — download-clip
beat 80: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v18853785
  - **grade:** none
  - **output:** .media/broll/beat-80.mp4

### Step 4 — download-clip
beat 81: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v39018600
  - **grade:** none
  - **output:** .media/broll/beat-81.mp4

### Step 4 — download-clip
beat 82: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v9310412
  - **grade:** none
  - **output:** .media/broll/beat-82.mp4

### Step 4 — download-clip
beat 83: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v18990795
  - **grade:** none
  - **output:** .media/broll/beat-83.mp4

### Step 4 — download-clip
beat 84: downloaded/processed
  - **mediaType:** photo
  - **source:** pexels/pexels-p36429294
  - **grade:** none
  - **output:** .media/broll/beat-84.jpg

### Step 4 — download-clip
beat 85: downloaded/processed
  - **mediaType:** photo
  - **source:** pexels/pexels-p36429280
  - **grade:** none
  - **output:** .media/broll/beat-85.jpg

### Step 4 — download-clip
beat 86: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v5887831
  - **grade:** none
  - **output:** .media/broll/beat-86.mp4

### Step 4 — download-clip
beat 87: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v6132816
  - **grade:** none
  - **output:** .media/broll/beat-87.mp4

### Step 4 — download-clip
beat 88: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v34380684
  - **grade:** none
  - **output:** .media/broll/beat-88.mp4

### Step 4 — download-clip
beat 89: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v39300396
  - **grade:** none
  - **output:** .media/broll/beat-89.mp4

### Step 4 — download-clip
beat 90: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v4275467
  - **grade:** none
  - **output:** .media/broll/beat-90.mp4

### Step 4 — download-clip
beat 91: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v5538262
  - **grade:** none
  - **output:** .media/broll/beat-91.mp4

### Step 4 — download-clip
beat 92: downloaded/processed
  - **mediaType:** photo
  - **source:** pexels/pexels-p16878710
  - **grade:** none
  - **output:** .media/broll/beat-92.jpg

### Step 4 — download-clip
beat 93: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v5887831
  - **grade:** none
  - **output:** .media/broll/beat-93.mp4

### Step 4 — build-credits
92 beat(s) consolidated into CREDITS.json
  - **beats with real footage:** 92
  - **attribution required:** 0

## Step 4 — download + process
- All 92 real-footage beats downloaded successfully (70 video, 22 photo — split emerged naturally from semantic picks, several close-up/document beats chosen as photos)
- CREDITS.json consolidated via build-credits.mjs
- Skipped optional probe-motion.mjs pass (no known locked-off clips flagged during review; default static-frame behavior is correct for all video beats)
- Skipped optional probe-clip-technical.mjs (single-provider run, color grade already off per run-shape answer)

### Step 5 — pick-transitions
Picked transition sequence for 1 beat(s)
  - **style:** mixed-cuts
  - **intensity:** calm
  - **sfx cues:** off
  - **pool:** crossfade 1.4s, blur-crossfade 1.6s, push-slide LEFT 1.2s, push-slide RIGHT 1.2s, push-slide UP 1.2s, push-slide DOWN 1.2s, squeeze 1.1s
  - **sequence:** cut

### Step 5 — pick-transitions
Picked transition sequence for 7 beat(s) (start-index 1)
  - **style:** mixed-cuts
  - **intensity:** moderate
  - **sfx cues:** off
  - **pool:** crossfade 1.4s, blur-crossfade 1.6s, push-slide LEFT 1.2s, push-slide RIGHT 1.2s, push-slide UP 1.2s, push-slide DOWN 1.2s, squeeze 1.1s
  - **sequence:** hard-cut 0s, push-slide LEFT 1.2s, push-slide RIGHT 1.2s, hard-cut 0s, push-slide DOWN 1.2s, squeeze 1.1s, hard-cut 0s

### Step 5 — pick-transitions
Picked transition sequence for 19 beat(s) (start-index 8)
  - **style:** mixed-cuts
  - **intensity:** calm
  - **sfx cues:** off
  - **pool:** crossfade 1.4s, blur-crossfade 1.6s, push-slide LEFT 1.2s, push-slide RIGHT 1.2s, push-slide UP 1.2s, push-slide DOWN 1.2s, squeeze 1.1s
  - **sequence:** blur-crossfade 1.6s, push-slide LEFT 1.2s, hard-cut 0s, push-slide UP 1.2s, push-slide DOWN 1.2s, hard-cut 0s, crossfade 1.4s, blur-crossfade 1.6s, hard-cut 0s, push-slide RIGHT 1.2s, push-slide UP 1.2s, hard-cut 0s, squeeze 1.1s, crossfade 1.4s, hard-cut 0s, push-slide LEFT 1.2s, push-slide RIGHT 1…(truncated)

### Step 5 — pick-transitions
Picked transition sequence for 25 beat(s) (start-index 27)
  - **style:** mixed-cuts
  - **intensity:** moderate
  - **sfx cues:** off
  - **pool:** crossfade 1.4s, blur-crossfade 1.6s, push-slide LEFT 1.2s, push-slide RIGHT 1.2s, push-slide UP 1.2s, push-slide DOWN 1.2s, squeeze 1.1s
  - **sequence:** squeeze 1.1s, hard-cut 0s, blur-crossfade 1.6s, push-slide LEFT 1.2s, hard-cut 0s, push-slide UP 1.2s, push-slide DOWN 1.2s, hard-cut 0s, crossfade 1.4s, blur-crossfade 1.6s, hard-cut 0s, push-slide RIGHT 1.2s, push-slide UP 1.2s, hard-cut 0s, squeeze 1.1s, crossfade 1.4s, hard-cut 0s, push-slide LE…(truncated)

### Step 5 — pick-transitions
Picked transition sequence for 7 beat(s) (start-index 52)
  - **style:** mixed-cuts
  - **intensity:** energetic
  - **sfx cues:** off
  - **pool:** crossfade 1.4s, blur-crossfade 1.6s, push-slide LEFT 1.2s, push-slide RIGHT 1.2s, push-slide UP 1.2s, push-slide DOWN 1.2s, squeeze 1.1s
  - **sequence:** hard-cut 0s, push-slide UP 1.2s, push-slide DOWN 1.2s, hard-cut 0s, crossfade 1.4s, blur-crossfade 1.6s, hard-cut 0s

### Step 5 — pick-transitions
Picked transition sequence for 19 beat(s) (start-index 59)
  - **style:** mixed-cuts
  - **intensity:** energetic
  - **sfx cues:** off
  - **pool:** crossfade 1.4s, blur-crossfade 1.6s, push-slide LEFT 1.2s, push-slide RIGHT 1.2s, push-slide UP 1.2s, push-slide DOWN 1.2s, squeeze 1.1s
  - **sequence:** push-slide RIGHT 1.2s, push-slide UP 1.2s, hard-cut 0s, squeeze 1.1s, crossfade 1.4s, hard-cut 0s, push-slide LEFT 1.2s, push-slide RIGHT 1.2s, hard-cut 0s, push-slide DOWN 1.2s, squeeze 1.1s, hard-cut 0s, blur-crossfade 1.6s, push-slide LEFT 1.2s, hard-cut 0s, push-slide UP 1.2s, push-slide DOWN 1.…(truncated)

### Step 5 — pick-transitions
Picked transition sequence for 9 beat(s) (start-index 78)
  - **style:** mixed-cuts
  - **intensity:** moderate
  - **sfx cues:** off
  - **pool:** crossfade 1.4s, blur-crossfade 1.6s, push-slide LEFT 1.2s, push-slide RIGHT 1.2s, push-slide UP 1.2s, push-slide DOWN 1.2s, squeeze 1.1s
  - **sequence:** blur-crossfade 1.6s, hard-cut 0s, push-slide RIGHT 1.2s, push-slide UP 1.2s, hard-cut 0s, squeeze 1.1s, crossfade 1.4s, hard-cut 0s, push-slide LEFT 1.2s

### Step 5 — pick-transitions
Picked transition sequence for 7 beat(s) (start-index 87)
  - **style:** mixed-cuts
  - **intensity:** calm
  - **sfx cues:** off
  - **pool:** crossfade 1.4s, blur-crossfade 1.6s, push-slide LEFT 1.2s, push-slide RIGHT 1.2s, push-slide UP 1.2s, push-slide DOWN 1.2s, squeeze 1.1s
  - **sequence:** push-slide RIGHT 1.2s, hard-cut 0s, push-slide DOWN 1.2s, squeeze 1.1s, hard-cut 0s, blur-crossfade 1.6s, push-slide LEFT 1.2s

### Step 5 — verify-overlays
FAILED — 1 issue(s) found
  - **archetype tally:** none:75, stat-callout:6, key-phrase:4, lower-third:3, center-statement:2, chapter-title:1, icon-accent:1, quote-card:1
  - **stat-callout placement:** 2/6 center
  - **failures:** beat 09 (stat-callout): value=1000 does not appear anywhere in the beat's own narration text ("The Illy River doesn't end in an ocean. It runs close to a thousand kilometers o…") — verify this is the real, correct number, not a typo or stale value.

### Step 5 — verify-overlays
PASSED — 18/93 beats have an overlay
  - **archetype tally:** none:75, key-phrase:5, stat-callout:5, lower-third:3, center-statement:2, chapter-title:1, icon-accent:1, quote-card:1
  - **stat-callout placement:** 2/5 center
  - **dominant-archetype share:** 28%

### Step 5 — check-editorial-conflicts
4 conflict(s) found
  - **conflict types:** hard-cut-vs-slow-overlay, section-tone-mismatch

### Step 5 — check-editorial-conflicts
0 conflict(s) found
  - **conflict types:** none

## Step 5 — transitions + overlays + editorial conflict scan
- transitions.json: 94 entries built via 8 pick-transitions.mjs calls (--start-index per section), style=mixed-cuts, intensity varied by section arc (calm/moderate/energetic mapped from sections.json's arc field), concatenation verified against no repeats at seams
- hook-signals.json: 93 beats classified, 30/93 (32%) initially flagged non-none
- overlays.json: 18/93 non-none (19.4%, between light and moderate target) after selective Pass 2 — deliberately kept sparse for a 93-beat/10-min film; avoided back-to-back stat-callouts and repeat numbers (24/57/73 all reference the same "50/70 years" theme, only used once as center-placement, twice as corner echo)
- verify-overlays.mjs: passed clean after fixing beat 09 (spelled-out "a thousand kilometers" tripped the digit-extraction check — switched stat-callout to key-phrase since the value is real but not written as digits in narration)
- check-editorial-conflicts.mjs: found 4 real conflicts (3x hard-cut-vs-slow-overlay at beats 34/82/88, 1x section-tone-mismatch on caveats-and-stakes). Resolved per priority order (content > rhythm > variety): kept all 3 overlays (chapter-title, lower-third, quote-card all carry real narrative weight), changed their transitions to have real duration instead (crossfade/push-slide/blur-crossfade) rather than dropping the overlays. Reconciled sections.json's caveats-and-stakes arc from "settling" to "rising" — the section's actual content (population vulnerability, dying lake) genuinely re-raises tension before the true resolution section, the mismatch was a real tagging error, not the overlay tones being wrong.
- Second pass: check-editorial-conflicts.mjs now returns 0 conflicts.

### Step 5 — build-frame
beat 00: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/00-beat.html

### Step 5 — build-frame
beat 01: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/01-beat.html

### Step 5 — build-frame
beat 02: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/02-beat.html

### Step 5 — build-frame
beat 03: frame built [video, kenburns=none]
  - **overlay:** stat-callout
  - **overlay params:** {"text":"","value":"70","prefix":"","suffix":" years","label":"since anyone photographed one here","icon":"info","max":null,"tone":"solemn","placement":"corner"}
  - **overlay enterAt:** 0.3s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/03-beat.html

### Step 5 — build-frame
beat 04: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/04-beat.html

### Step 5 — build-frame
beat 05: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/05-beat.html

### Step 5 — build-frame
beat 06: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/06-beat.html

### Step 5 — build-frame
beat 07: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/07-beat.html

### Step 5 — build-frame
beat 08: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/08-beat.html

### Step 5 — build-frame
beat 09: frame built [video, kenburns=none]
  - **overlay:** key-phrase
  - **overlay params:** {"text":"a thousand kilometers","value":"0","prefix":"","suffix":"","label":"","icon":"info","max":null,"tone":"neutral","placement":null}
  - **overlay enterAt:** 3s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/09-beat.html

### Step 5 — build-frame
beat 11: frame built [video, kenburns=none]
  - **overlay:** lower-third
  - **overlay params:** {"text":"The Ili Delta","value":"0","prefix":"","suffix":"","label":"","icon":"info","max":null,"tone":"neutral","placement":null}
  - **overlay enterAt:** 0.5s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/11-beat.html

### Step 5 — build-frame
beat 12: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/12-beat.html

### Step 5 — build-frame
beat 13: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/13-beat.html

### Step 5 — build-frame
beat 14: frame built [photo, kenburns=out]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/14-beat.html

### Step 5 — build-frame
beat 15: frame built [photo, kenburns=pan-left]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/15-beat.html

### Step 5 — build-frame
beat 16: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/16-beat.html

### Step 5 — build-frame
beat 17: frame built [photo, kenburns=in]
  - **overlay:** key-phrase
  - **overlay params:** {"text":"the Caspian tiger","value":"0","prefix":"","suffix":"","label":"","icon":"info","max":null,"tone":"solemn","placement":null}
  - **overlay enterAt:** 0.2s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/17-beat.html

### Step 5 — build-frame
beat 18: frame built [photo, kenburns=out]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/18-beat.html

### Step 5 — build-frame
beat 19: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/19-beat.html

### Step 5 — build-frame
beat 20: frame built [video, kenburns=none]
  - **overlay:** stat-callout
  - **overlay params:** {"text":"","value":"1960","prefix":"","suffix":"s","label":"irrigation canals cut through the region","icon":"info","max":null,"tone":"urgent","placement":"corner"}
  - **overlay enterAt:** 0.2s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/20-beat.html

### Step 5 — build-frame
beat 21: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/21-beat.html

### Step 5 — build-frame
beat 22: frame built [photo, kenburns=in]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/22-beat.html

### Step 5 — build-frame
beat 23: frame built [photo, kenburns=out]
  - **overlay:** key-phrase
  - **overlay params:** {"text":"listed as gone","value":"0","prefix":"","suffix":"","label":"","icon":"info","max":null,"tone":"solemn","placement":null}
  - **overlay enterAt:** 2s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/23-beat.html

### Step 5 — build-frame
beat 24: frame built [video, kenburns=none]
  - **overlay:** stat-callout
  - **overlay params:** {"text":"","value":"50","prefix":"","suffix":" years","label":"with nothing at the top of the food chain","icon":"info","max":null,"tone":"solemn","placement":"center"}
  - **overlay enterAt:** 1.5s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/24-beat.html

### Step 5 — build-frame
beat 25: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/25-beat.html

### Step 5 — build-frame
beat 26: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/26-beat.html

### Step 5 — build-frame
beat 27: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/27-beat.html

### Step 5 — build-frame
beat 28: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/28-beat.html

### Step 5 — build-frame
beat 29: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/29-beat.html

### Step 5 — build-frame
beat 30: frame built [photo, kenburns=pan-right]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/30-beat.html

### Step 5 — build-frame
beat 31: frame built [photo, kenburns=in]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/31-beat.html

### Step 5 — build-frame
beat 32: frame built [photo, kenburns=out]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/32-beat.html

### Step 5 — build-frame
beat 33: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/33-beat.html

### Step 5 — build-frame
beat 34: frame built [video, kenburns=none]
  - **overlay:** chapter-title
  - **overlay params:** {"text":"Rebuilding the Ecosystem","value":"0","prefix":"","suffix":"","label":"","icon":"info","max":null,"tone":"neutral","placement":null}
  - **overlay enterAt:** 0.3s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/34-beat.html

### Step 5 — build-frame
beat 35: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/35-beat.html

### Step 5 — build-frame
beat 36: frame built [video, kenburns=none]
  - **overlay:** stat-callout
  - **overlay params:** {"text":"","value":"4000","prefix":"","suffix":" km²","label":"protected zone set aside for the project","icon":"info","max":null,"tone":"neutral","placement":"center"}
  - **overlay enterAt:** 3.5s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/36-beat.html

### Step 5 — build-frame
beat 37: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/37-beat.html

### Step 5 — build-frame
beat 38: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/38-beat.html

### Step 5 — build-frame
beat 39: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/39-beat.html

### Step 5 — build-frame
beat 40: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/40-beat.html

### Step 5 — build-frame
beat 41: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/41-beat.html

### Step 5 — build-frame
beat 42: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/42-beat.html

### Step 5 — build-frame
beat 43: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/43-beat.html

### Step 5 — build-frame
beat 44: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/44-beat.html

### Step 5 — build-frame
beat 45: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/45-beat.html

### Step 5 — build-frame
beat 46: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/46-beat.html

### Step 5 — build-frame
beat 47: frame built [photo, kenburns=pan-right]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/47-beat.html

### Step 5 — build-frame
beat 48: frame built [photo, kenburns=in]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/48-beat.html

### Step 5 — build-frame
beat 49: frame built [photo, kenburns=out]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/49-beat.html

### Step 5 — build-frame
beat 50: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/50-beat.html

### Step 5 — build-frame
beat 51: frame built [video, kenburns=none]
  - **overlay:** icon-accent
  - **overlay params:** {"text":"GPS collar","value":"0","prefix":"","suffix":"","label":"","icon":"info","max":null,"tone":"neutral","placement":null}
  - **overlay enterAt:** 0.3s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/51-beat.html

### Step 5 — build-frame
beat 52: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/52-beat.html

### Step 5 — build-frame
beat 53: frame built [photo, kenburns=in]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/53-beat.html

### Step 5 — build-frame
beat 54: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/54-beat.html

### Step 5 — build-frame
beat 55: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/55-beat.html

### Step 5 — build-frame
beat 56: frame built [photo, kenburns=pan-right]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/56-beat.html

### Step 5 — build-frame
beat 57: frame built [photo, kenburns=in]
  - **overlay:** stat-callout
  - **overlay params:** {"text":"","value":"70","prefix":"","suffix":" years","label":"since this decision was made alone here","icon":"info","max":null,"tone":"urgent","placement":"corner"}
  - **overlay enterAt:** 0.2s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/57-beat.html

### Step 5 — build-frame
beat 58: frame built [photo, kenburns=out]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/58-beat.html

### Step 5 — build-frame
beat 59: frame built [video, kenburns=none]
  - **overlay:** center-statement
  - **overlay params:** {"text":"Here is where the story stopped matching anyone's expectations.","value":"0","prefix":"","suffix":"","label":"","icon":"info","max":null,"tone":"urgent","placement":null}
  - **overlay enterAt:** 0.3s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/59-beat.html

### Step 5 — build-frame
beat 60: frame built [video, kenburns=none]
  - **overlay:** lower-third
  - **overlay params:** {"text":"The Standard Model","value":"0","prefix":"","suffix":"","label":"","icon":"info","max":null,"tone":"neutral","placement":null}
  - **overlay enterAt:** 0.3s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/60-beat.html

### Step 5 — build-frame
beat 61: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/61-beat.html

### Step 5 — build-frame
beat 62: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/62-beat.html

### Step 5 — build-frame
beat 63: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/63-beat.html

### Step 5 — build-frame
beat 64: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/64-beat.html

### Step 5 — build-frame
beat 65: frame built [video, kenburns=none]
  - **overlay:** key-phrase
  - **overlay params:** {"text":"six weeks","value":"0","prefix":"","suffix":"","label":"","icon":"info","max":null,"tone":"urgent","placement":null}
  - **overlay enterAt:** 2.5s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/65-beat.html

### Step 5 — build-frame
beat 66: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/66-beat.html

### Step 5 — build-frame
beat 67: frame built [photo, kenburns=out]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/67-beat.html

### Step 5 — build-frame
beat 69: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/69-beat.html

### Step 5 — build-frame
beat 70: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/70-beat.html

### Step 5 — build-frame
beat 71: frame built [photo, kenburns=in]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/71-beat.html

### Step 5 — build-frame
beat 72: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/72-beat.html

### Step 5 — build-frame
beat 73: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/73-beat.html

### Step 5 — build-frame
beat 74: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/74-beat.html

### Step 5 — build-frame
beat 75: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/75-beat.html

### Step 5 — build-frame
beat 76: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/76-beat.html

### Step 5 — build-frame
beat 77: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/77-beat.html

### Step 5 — build-frame
beat 78: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/78-beat.html

### Step 5 — build-frame
beat 79: frame built [photo, kenburns=in]
  - **overlay:** key-phrase
  - **overlay params:** {"text":"a population of one","value":"0","prefix":"","suffix":"","label":"","icon":"info","max":null,"tone":"urgent","placement":null}
  - **overlay enterAt:** 5.5s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/79-beat.html

### Step 5 — build-frame
beat 80: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/80-beat.html

### Step 5 — build-frame
beat 81: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/81-beat.html

### Step 5 — build-frame
beat 82: frame built [video, kenburns=none]
  - **overlay:** lower-third
  - **overlay params:** {"text":"Lake Balkash","value":"0","prefix":"","suffix":"","label":"","icon":"info","max":null,"tone":"urgent","placement":null}
  - **overlay enterAt:** 0.5s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/82-beat.html

### Step 5 — build-frame
beat 83: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/83-beat.html

### Step 5 — build-frame
beat 84: frame built [photo, kenburns=in]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/84-beat.html

### Step 5 — build-frame
beat 85: frame built [photo, kenburns=out]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/85-beat.html

### Step 5 — build-frame
beat 86: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/86-beat.html

### Step 5 — build-frame
beat 87: frame built [video, kenburns=none]
  - **overlay:** center-statement
  - **overlay params:** {"text":"What the first six weeks did answer was smaller, and in its own way stranger.","value":"0","prefix":"","suffix":"","label":"","icon":"info","max":null,"tone":"warm","placement":null}
  - **overlay enterAt:** 0.3s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/87-beat.html

### Step 5 — build-frame
beat 88: frame built [video, kenburns=none]
  - **overlay:** quote-card
  - **overlay params:** {"text":"An ecosystem can remember how to be afraid faster than anyone studying it thought it could.","attribution":""}
  - **overlay enterAt:** 0.2s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/88-beat.html

### Step 5 — build-frame
beat 89: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/89-beat.html

### Step 5 — build-frame
beat 90: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/90-beat.html

### Step 5 — build-frame
beat 91: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/91-beat.html

### Step 5 — build-frame
beat 92: frame built [photo, kenburns=pan-right]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/92-beat.html

### Step 5 — build-frame
beat 93: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/93-beat.html

## Step 5 — storyboard + frames
- STORYBOARD.md written: 94 frames (00 news cold-open + 01-93 real narration beats)
- 92 real-footage frames built via build-frame.mjs (Ken Burns with --kenburns-focus applied to every photo beat based on Step 3's candidate description read)
- 2 invented-scene frames (10-beat: lake fresh/salt split map; 68-beat: before/after exposure-time bar chart) built via 2 parallel sub-agent dispatches per invented-scene-worker.md, both self-checked clean (template contract, no GSAP re-load, #root by ID, deterministic, reveal spread across full duration, no exit tween)
- All 94 frame src files verified present

### Step 6 — slice-narration
93 beat(s) sliced (reference-only, no re-encode)
  - **narration:** assets/audio/narration.mp3
  - **audio-meta:** ./audio_meta.json

### Step 6 — build-scene-ambience
94 segments stitched with 1.8s crossfades
  - **classes:** neutral → water → water → interior → water → interior → forest → forest → water → water → water → water → water → forest → forest → water → neutral → interior → interior → interior → water → forest → interior → interior → neutral → water → interior → interior → interior → interior → forest → forest …(truncated)
  - **duration:** 617.1

### Step 6 — set-sfx-offsets
4 cue(s) patched, 0 left at default
  - **patched (offset/volume set from editorial pass):** 4
  - **left at fetch-sfx default (offset 0 / volume 0.35):** none

### Step 6 — slice-narration
93 beat(s) sliced (reference-only, no re-encode)
  - **narration:** assets/audio/narration.mp3
  - **audio-meta:** ./audio_meta.json

### Step 6 — heal-media-start
93 patched, 0 already correct, 0 had no mediaStart on record
  - **patched frame ids:** 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 7…(truncated)
  - **note:** assemble-index.mjs's own fix was missing this run — self-heal applied

## Step 6 — audio slicing, sound design, assembly
- slice-narration.mjs: 93 beats referencing narration.mp3 non-destructively (no re-encode); had to re-run AFTER fetch-sfx since fetch-sfx overwrote audio_meta.json's voices array to empty — re-running slice-narration.mjs merged cleanly and restored it
- Captions: skipped entirely (run-shape answer: off)
- Scene-aware ambience: built via scene-map.json (94 segments classified water/forest/interior/neutral from beat content) + build-scene-ambience.mjs, 1.8s crossfades between scene classes
- Sparse SFX (per explicit user ask: "very few places", confirmed via follow-up question — all 3 offered): riser-short on beat 06 (crate-opening reveal, offset 3.5s to land at the open), impact-soft on beat 07 (animal walks out), riser-short on beat 59 (thesis-pivot "story stopped matching expectations"), soft pop on beat 88 (the film's key pull-quote card entrance). All volumes kept low (0.08-0.16) per the graphic-cue band. No transition whooshes and no routine overlay-entrance cues elsewhere — deliberately rare per user's explicit request.
- assemble-index.mjs: 94 frames, 93 voices, 4 sfx, no bgm/captions, total duration 617.14s
- heal-media-start.mjs: confirmed the known skills-update regression (assemble-index.mjs's own data-media-start emit did not fire) and patched all 93 frames
- transitions inject + verify: 94 transitions injected; verify flagged 28 "no overlap" boundaries which are the intentional hard-cuts (29 in transitions.json) by design, not real breakage

### Step 6 — inject-cinematic-layers
mounted ambience bed only (--no-grain)
  - **ambience volume:** 0.05
  - **grain opacity:** skipped
  - **ambience source:** .hyperframes/cinematic-assets/ambience-bed.mp3
  - **grain source:** null

## Step 6 — cinematic layers + final gate
- inject-cinematic-layers.mjs: ambience-bed mounted (vol 0.05), grain SKIPPED via --no-grain (94-frame video-heavy composition, avoiding the ~2.6x render-speed penalty)
- lint fixed: beat-68 invented-scene frame had a real gsap_non_transform_motion error (GSAP tween on `left` instead of transform) — fixed by switching #f68-pct to width:100%/left:0 static positioning + xPercent tween instead of animating `left` directly; also added missing stable ids (id="f68-bg", id="f68-stage") for the studio_missing_editable_id warnings
- npx hyperframes check: PASSED — 0 lint errors, 0 runtime errors, 0 motion errors, 5/5 contrast checks pass WCAG AA, only 9 info-level container_overflow notices (all expected Ken Burns pan-wrapper overflow on photo beats, intentional not a bug)
