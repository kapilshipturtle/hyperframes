# Run log — altair-doc (documentary-broll)

Source audio: ~/Downloads/tts-altair-1788583268741.mp3 (774.14s / 12:54)

## Run-shape decisions (user, asked once up front)
- Captions: **OFF** — no on-screen caption text at all (overlays still allowed)
- Transition style: **mixed-cuts** — varied rotation + real hard cuts ~every 3rd boundary
- Sound design: user said "only logical not in entire video very few" →
  - scene ambience + foley: ON but SPARSE — foley only where the beat's actual chosen footage
    shows an obvious sound-producing action; no blanket per-beat cues
  - transition whooshes: OFF
  - overlay entrance cues: OFF
  - BGM: not requested → OFF
- Overlay density: **moderate** (~25% of beats)
- Title sequence / end card: pending (ask after reading transcript)
- Color grading: pending (decide from provider spread + probe-clip-technical)
- Loudness normalization: pending (ask)

## Step 1 — Transcript
- `npx hyperframes transcribe assets/audio/narration.mp3 --model small.en --json` (running)

### Step 2 — beats.mjs
Segmented transcript into 145 beat(s)
  - **words in:** 2239
  - **total duration:** 773.8s
  - **min/max beat duration:** 3s / 6.5s
  - **shortest beat:** 3.0s
  - **longest beat:** 10.7s

## Step 2 — sections + queries (editorial pass)
- 145 beats, 8 sections (calm/calm/rising/rising/settling/rising/peak/settling)
- Film: consumer-advocacy countdown of 14 electric-bill charges, framed by grandmother Ruth's 1929-39 ledger
- Register: warm, plain-spoken, trustworthy ('neighbor'); NOT alarmist
- queries.json (beat -> query):
  10: vintage 1930s account book pages
  11: antique electric meter dial
  12: woman putting on coat doorway
  13: grandmother and child walking together
  14: elderly woman reading calmly
  15: man talking to camera kitchen
  16: checklist being marked off
  17: hand crossing out list items
  18: frustrated person on phone call
  19: sorting papers into piles
  20: family around dining table talking
  21: courthouse regulatory building exterior
  22: person listening attentively
  23: paper bill envelope mailbox
  24: magnifying glass over invoice
  25: laptop email inbox screen
  26: hand tapping smartphone quickly
  27: coins stacked on table
  28: close up envelope stamp
  29: smart electricity meter house wall
  30: electric meter box outdoor
  31: utility worker reading meter
  32: checkbox on printed form
  33: old analog utility meter
  34: person dialing landline phone
  35: wall calendar pages turning
  36: overdue notice red stamp
  37: customer service representative headset
  38: two people talking calmly phone
  39: circling date on calendar
  40: paycheck direct deposit bank app
  41: person counting money worried
  42: calendar date circled red
  43: signing account paperwork
  44: cash bills counted hand
  45: twelve month calendar wall
  46: bank vault safe deposit
  47: hand reaching out receiving money
  48: unopened refund check envelope
  49: suburban house front porch
  50: ledger column handwritten numbers
  51: fountain pen writing ledger
  52: closing old book slowly
  53: water heater basement utility
  54: invoice line item close up
  55: home water heater tank
  56: signing contract clipboard
  57: old rusty water heater basement
  58: reading fine print contract
  59: person making phone call kitchen
  60: power lines over city street
  61: man shrugging honest gesture
  62: utility poles wires neighborhood
  63: electricity transmission tower
  64: percentage calculation calculator
  65: shrinking stack of coins
  66: government tax office building
  67: tax form paperwork desk
  68: person hanging up phone frustrated
  69: angry customer on telephone
  70: walking away from clutter
  71: energy efficiency light bulb
  72: utility bill small print rider
  73: different bill formats comparison
  74: home insulation installation attic
  75: worker installing weather stripping
  76: led light bulb replacement
  77: person on phone taking notes
  78: storm damaged power lines
  79: utility crew repairing power line storm
  80: lightning storm over houses
  81: calendar end date circled
  82: person sleeping peacefully night
  83: power plant smokestacks
  84: fuel gauge industrial dial
  85: electricity generation turbine
  86: rising line graph chart
  87: clock on kitchen wall
  88: monthly bill statement close up
  89: empty dark house interior
  90: light switch turned off
  91: person surprised reading document
  92: filing cabinet folders rows
  93: row of mailboxes apartment
  94: dusty old file folder archive
  95: highlighting text on document
  96: hand writing notes notepad
  97: pen and notepad ready
  98: customer service phone conversation
  99: spreadsheet data on monitor
  100: office worker at computer screen
  101: home medical equipment oxygen
  102: modest family home kitchen
  103: clock and calendar together
  104: counting dollar bills hand
  105: phone call quick simple
  106: evening city lights houses
  107: electric meter spinning fast
  108: dishwasher loading kitchen night
  109: laundry machine morning light
  110: family cooking dinner kitchen
  111: vintage laundry hanging line
  112: old washing machine 1930s
  113: electricity bill supply section
  114: reading bill under lamp light
  115: salesperson knocking on door
  116: power lines into house
  117: man speaking sincerely camera
  118: government report document official
  119: state capitol building exterior
  120: rising costs graph upward
  121: stopwatch counting seconds
  122: electricity rate printed bill
  123: utility website on laptop
  124: comparing two documents side by side
  125: surprised person looking at bill
  126: honest conversation face to face
  127: person shaking head no
  128: three items on a list
  129: tidy organized paperwork desk
  130: power plant at dusk
  131: sincere man talking camera
  132: many houses neighborhood aerial
  133: list of questions notepad
  134: person asking question phone
  135: phone call notes writing
  136: checking boxes on list
  137: hand receiving refund money
  138: clock twelve minutes timer
  139: reading from paper calmly
  140: friendly phone conversation home
  141: single task focused hand
  142: turning over paper bill
  143: morning sunrise kitchen window
  144: typing comment on phone
  145: person reading messages smiling
  01: hands opening mail envelope
  02: utility bill on kitchen table
  03: close up printed invoice text
  04: finger tracing document lines
  05: air conditioner unit summer heat
  06: worried woman reading paperwork
  07: stack of paper documents desk
  08: empty kitchen table morning light
  09: old handwritten ledger book

### Step 3 — fetch-clips
beat 10: query "vintage 1930s account book pages"
  - **script-level pick:** pexels/pexels-v38265989 [video] 1920x1080, 11s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v38265989(17), pexels/pexels-v27981993(14), pexels/pexels-p12983110(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 06: query "worried woman reading paperwork"
  - **script-level pick:** pexels/pexels-v6963972 [video] 1920x1080, 26s
  - **candidates (scored/raw):** 24/24
  - **top 3 by score:** pexels/pexels-v6963972(16), pexels/pexels-v5981347(14), pexels/pexels-p9052476(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 04: query "finger tracing document lines"
  - **script-level pick:** pexels/pexels-v5871855 [video] 1366x720, 8s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v5871855(17), pexels/pexels-v7710490(14), pexels/pexels-p10140835(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 02: query "utility bill on kitchen table"
  - **script-level pick:** pexels/pexels-v6962835 [video] 1920x1080, 11s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v6962835(16), pexels/pexels-v35402336(15), pexels/pexels-p6964111(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 08: query "empty kitchen table morning light"
  - **script-level pick:** pexels/pexels-v2996079 [video] 1920x1080, 65s
  - **candidates (scored/raw):** 24/24
  - **top 3 by score:** pexels/pexels-v2996079(16), pexels/pexels-v30763463(15), pexels/pexels-p904503(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 03: query "close up printed invoice text"
  - **script-level pick:** pexels/pexels-v5283813 [video] 1366x720, 33s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v5283813(16), pexels/pexels-v5283823(15), pexels/pexels-p7651555(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 12: query "woman putting on coat doorway"
  - **script-level pick:** pexels/pexels-v6565087 [video] 1366x720, 20s
  - **candidates (scored/raw):** 24/24
  - **top 3 by score:** pexels/pexels-v6565087(17), pexels/pexels-v35768262(15), pexels/pexels-p4473094(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 09: query "old handwritten ledger book"
  - **script-level pick:** pexels/pexels-v6979935 [video] 1920x1080, 30s
  - **candidates (scored/raw):** 25/25
  - **top 3 by score:** pexels/pexels-v6979935(16), pexels/pexels-v6566559(15), pexels/pexels-p12983110(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 05: query "air conditioner unit summer heat"
  - **script-level pick:** pexels/pexels-v39004009 [video] 1920x1080, 11s
  - **candidates (scored/raw):** 14/14
  - **top 3 by score:** pexels/pexels-v39004009(17), pexels/pexels-v28697145(14), pexels/pexels-p24828656(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 07: query "stack of paper documents desk"
  - **script-level pick:** pexels/pexels-v7054942 [video] 1920x1080, 8s
  - **candidates (scored/raw):** 18/18
  - **top 3 by score:** pexels/pexels-v7054942(17), pexels/pexels-v7710495(14), pexels/pexels-p34369598(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 01: query "hands opening mail envelope"
  - **script-level pick:** pexels/pexels-v5916730 [video] 1920x1080, 18s
  - **candidates (scored/raw):** 13/13
  - **top 3 by score:** pexels/pexels-v5916730(16), pexels/pexels-v7308158(15), pexels/pexels-p7821490(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 11: query "antique electric meter dial"
  - **script-level pick:** pexels/pexels-v4941365 [video] 1920x1080, 9s
  - **candidates (scored/raw):** 13/13
  - **top 3 by score:** pexels/pexels-v4941365(17), pexels/pexels-v8322039(15), pexels/pexels-p27862196(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 18: query "frustrated person on phone call"
  - **script-level pick:** pexels/pexels-v7597573 [video] 1366x720, 48s
  - **candidates (scored/raw):** 24/24
  - **top 3 by score:** pexels/pexels-v7597573(14), pexels/pexels-p7964504(14), pexels/pexels-v6024753(13)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 15: query "man talking to camera kitchen"
  - **script-level pick:** pexels/pexels-v12691783 [video] 1920x1080, 15s
  - **candidates (scored/raw):** 24/24
  - **top 3 by score:** pexels/pexels-v12691783(17), pexels/pexels-v8779928(15), pexels/pexels-p20459081(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 16: query "checklist being marked off"
  - **script-level pick:** pexels/pexels-v32089998 [video] 1920x1080, 18s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v32089998(16), pexels/pexels-v33314951(14), pexels/pexels-p33349191(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 17: query "hand crossing out list items"
  - **script-level pick:** pexels/pexels-v10797880 [video] 1920x1080, 5s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v10797880(17), pexels/pexels-v33439135(14), pexels/pexels-p416322(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 21: query "courthouse regulatory building exterior"
  - **script-level pick:** pexels/pexels-v29188239 [video] 1920x1080, 20s
  - **candidates (scored/raw):** 24/24
  - **top 3 by score:** pexels/pexels-v29188239(17), pexels/pexels-p15452110(14), pexels/pexels-v16935891(13)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 23: query "paper bill envelope mailbox"
  - **script-level pick:** pexels/pexels-v5849607 [video] 1920x1080, 20s
  - **candidates (scored/raw):** 24/24
  - **top 3 by score:** pexels/pexels-v5849607(16), pexels/pexels-v6994417(15), pexels/pexels-p7054717(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 24: query "magnifying glass over invoice"
  - **script-level pick:** pexels/pexels-v5849607 [video] 1920x1080, 20s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v5849607(16), pexels/pexels-v6970650(14), pexels/pexels-p5849566(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 14: query "elderly woman reading calmly"
  - **script-level pick:** pexels/pexels-v7545722 [video] 1920x1080, 13s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v7545722(16), pexels/pexels-v5798905(15), pexels/pexels-p5790739(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 13: query "grandmother and child walking together"
  - **script-level pick:** pexels/pexels-v5642850 [video] 1920x1080, 9s
  - **candidates (scored/raw):** 11/11
  - **top 3 by score:** pexels/pexels-v5642850(17), pexels/pexels-v7085110(14), pexels/pexels-p33562953(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 502 Bad Gateway for https://api.openverse.org/v1/images/?q=grandmother+and+child+walking+together&page_size=6&license_type=comm…(truncated)

### Step 3 — fetch-clips
beat 20: query "family around dining table talking"
  - **script-level pick:** pexels/pexels-v4298650 [video] 1920x1080, 11s
  - **candidates (scored/raw):** 24/24
  - **top 3 by score:** pexels/pexels-v4298650(17), pexels/pexels-v6948637(15), pexels/pexels-p8841608(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=family+around+dining+table+talking&page_size=12&license_type=com…(truncated)

### Step 3 — fetch-clips
beat 22: query "person listening attentively"
  - **script-level pick:** pexels/pexels-v6339820 [video] 1920x1080, 7s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v6339820(17), pexels/pexels-v8108270(14), pexels/pexels-p11045735(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=person+listening+attentively&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 19: query "sorting papers into piles"
  - **script-level pick:** pexels/pexels-v7710497 [video] 1366x720, 18s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v7710497(16), pexels/pexels-v7710489(14), pexels/pexels-p6636338(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=sorting+papers+into+piles&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 30: query "electric meter box outdoor"
  - **script-level pick:** pexels/pexels-v4776104 [video] 1920x1080, 22s
  - **candidates (scored/raw):** 23/23
  - **top 3 by score:** pexels/pexels-v4776104(17), pexels/pexels-p30144993(14), pexels/pexels-p10065200(12)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 403 Forbidden for https://api.openverse.org/v1/images/?q=electric+meter+box+outdoor&page_size=12&license_type=commercial

### Step 3 — fetch-clips
beat 32: query "checkbox on printed form"
  - **script-level pick:** pexels/pexels-v7841584 [video] 1920x1080, 9s
  - **candidates (scored/raw):** 24/24
  - **top 3 by score:** pexels/pexels-v7841584(17), pexels/pexels-v7841600(15), pexels/pexels-p8850709(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 31: query "utility worker reading meter"
  - **script-level pick:** pexels/pexels-v34091414 [video] 1920x1080, 7s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v34091414(17), pexels/pexels-v4334561(14), pexels/pexels-p16752780(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 33: query "old analog utility meter"
  - **script-level pick:** pexels/pexels-v3958753 [video] 1920x1080, 50s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v3958753(16), pexels/pexels-v5499030(14), pexels/pexels-p31996522(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 36: query "overdue notice red stamp"
  - **script-level pick:** pexels/pexels-v39277406 [video] 1920x1080, 7s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v39277406(17), pexels/pexels-v5961724(15), pexels/pexels-p7926955(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 34: query "person dialing landline phone"
  - **script-level pick:** pexels/pexels-v10302785 [video] 1366x720, 54s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v10302785(16), pexels/pexels-v7592179(15), pexels/pexels-p10397356(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 26: query "hand tapping smartphone quickly"
  - **script-level pick:** pexels/pexels-v5743130 [video] 1366x720, 9s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v5743130(17), pexels/pexels-v4671883(14), pexels/pexels-p11594551(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 29: query "smart electricity meter house wall"
  - **script-level pick:** pexels/pexels-v18780266 [video] 1920x1080, 9s
  - **candidates (scored/raw):** 13/13
  - **top 3 by score:** pexels/pexels-v18780266(17), pexels/pexels-v4873239(15), pexels/pexels-p35107502(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 27: query "coins stacked on table"
  - **script-level pick:** pexels/pexels-v8661806 [video] 1920x1080, 23s
  - **candidates (scored/raw):** 25/25
  - **top 3 by score:** pexels/pexels-v8661806(14), pexels/pexels-p4755123(14), pexels/pexels-v8369980(13)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 25: query "laptop email inbox screen"
  - **script-level pick:** pexels/pexels-v7252673 [video] 1920x1080, 12s
  - **candidates (scored/raw):** 15/15
  - **top 3 by score:** pexels/pexels-v7252673(17), pexels/pexels-v20065494(15), pexels/pexels-p7821760(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 28: query "close up envelope stamp"
  - **script-level pick:** pexels/pexels-v5916730 [video] 1920x1080, 18s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v5916730(16), pexels/pexels-v6424125(15), pexels/pexels-p35575354(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 500 Internal Server Error for https://api.openverse.org/v1/images/?q=close+up+envelope+stamp&page_size=6&license_type=commercia…(truncated)

### Step 3 — fetch-clips
beat 35: query "wall calendar pages turning"
  - **script-level pick:** pexels/pexels-v1793371 [video] 1920x1080, 15s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v1793371(16), pexels/pexels-v6143908(14), pexels/pexels-p29509502(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=wall+calendar+pages+turning&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 48: query "unopened refund check envelope"
  - **script-level pick:** pexels/pexels-v6963960 [video] 1920x1080, 26s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v6963960(16), pexels/pexels-v6868424(14), pexels/pexels-p7821490(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 38: query "two people talking calmly phone"
  - **script-level pick:** pexels/pexels-v8902487 [video] 1366x720, 11s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v8902487(16), pexels/pexels-v8298367(14), pexels/pexels-p36799146(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 41: query "person counting money worried"
  - **script-level pick:** pexels/pexels-v5981723 [video] 1366x720, 14s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v5981723(17), pexels/pexels-v6326940(15), pexels/pexels-p5900153(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 37: query "customer service representative headset"
  - **script-level pick:** pexels/pexels-v3986119 [video] 1920x1080, 30s
  - **candidates (scored/raw):** 24/24
  - **top 3 by score:** pexels/pexels-v3986119(16), pexels/pexels-v7682954(14), pexels/pexels-p5239950(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 40: query "paycheck direct deposit bank app"
  - **script-level pick:** pexels/pexels-v5849629 [video] 1920x1080, 20s
  - **candidates (scored/raw):** 24/24
  - **top 3 by score:** pexels/pexels-v5849629(16), pexels/pexels-v9588287(15), pexels/pexels-p39217313(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

## Step 3 — fetch notes
- Providers active: pexels + openverse (pixabay/videvo skipped, no API key — expected, logged as anomalies in each beat file)
- No archiveorg/wikimedia: topic is generic consumer/household b-roll, not history or species — both would return noise
- 6s+ beats fetched with --per-page 12 for cutaway room (45 of 145)

### Step 3 — fetch-clips
beat 45: query "twelve month calendar wall"
  - **script-level pick:** pexels/pexels-v4378032 [video] 1920x1080, 9s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v4378032(17), pexels/pexels-v5368235(15), pexels/pexels-p11706725(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=twelve+month+calendar+wall&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 42: query "calendar date circled red"
  - **script-level pick:** pexels/pexels-v1793371 [video] 1920x1080, 15s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v1793371(16), pexels/pexels-v9057693(15), pexels/pexels-p11773871(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=calendar+date+circled+red&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 47: query "hand reaching out receiving money"
  - **script-level pick:** pexels/pexels-v6693623 [video] 1920x1080, 7s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v6693623(17), pexels/pexels-v3943968(15), pexels/pexels-p15794052(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=hand+reaching+out+receiving+money&page_size=6&license_type=comme…(truncated)

### Step 3 — fetch-clips
beat 46: query "bank vault safe deposit"
  - **script-level pick:** pexels/pexels-v5849641 [video] 1920x1080, 11s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v5849641(17), pexels/pexels-v31750573(15), pexels/pexels-p23322329(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=bank+vault+safe+deposit&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 44: query "cash bills counted hand"
  - **script-level pick:** pexels/pexels-v5466769 [video] 1920x1080, 14s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v5466769(16), pexels/pexels-v6326929(14), pexels/pexels-p4475469(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=cash+bills+counted+hand&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 43: query "signing account paperwork"
  - **script-level pick:** pexels/pexels-v8479061 [video] 1920x1080, 14s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v8479061(16), pexels/pexels-v8298013(14), pexels/pexels-p7821513(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=signing+account+paperwork&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 39: query "circling date on calendar"
  - **script-level pick:** pexels/pexels-v9057559 [video] 1920x1080, 11s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v9057559(17), pexels/pexels-v9057678(15), pexels/pexels-p11773871(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=circling+date+on+calendar&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 50: query "ledger column handwritten numbers"
  - **script-level pick:** pexels/pexels-v7055343 [video] 1920x1080, 7s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v7055343(17), pexels/pexels-v7055350(15), pexels/pexels-p164686(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 56: query "signing contract clipboard"
  - **script-level pick:** pexels/pexels-v7490379 [video] 1920x1080, 15s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v7490379(16), pexels/pexels-v7580442(15), pexels/pexels-p8205060(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 54: query "invoice line item close up"
  - **script-level pick:** pexels/pexels-v7055350 [video] 1920x1080, 8s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v7055350(17), pexels/pexels-v7055344(14), pexels/pexels-p7651555(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 57: query "old rusty water heater basement"
  - **script-level pick:** pexels/pexels-v9200530 [video] 1920x1080, 81s
  - **candidates (scored/raw):** 24/24
  - **top 3 by score:** pexels/pexels-v9200530(16), pexels/pexels-v10664445(15), pexels/pexels-p7718449(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 59: query "person making phone call kitchen"
  - **script-level pick:** pexels/pexels-v10397450 [video] 1366x720, 47s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v10397450(16), pexels/pexels-v4082870(14), pexels/pexels-p6963926(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=person+making+phone+call+kitchen&page_size=6&license_type=commer…(truncated)

### Step 3 — fetch-clips
beat 52: query "closing old book slowly"
  - **script-level pick:** pexels/pexels-v11769112 [video] 1920x1080, 9s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v11769112(17), pexels/pexels-v35828975(15), pexels/pexels-p38374178(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=closing+old+book+slowly&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 53: query "water heater basement utility"
  - **script-level pick:** pexels/pexels-v4061911 [video] 1920x1080, 29s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v4061911(16), pexels/pexels-v13413522(15), pexels/pexels-p10847199(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=water+heater+basement+utility&page_size=6&license_type=commercia…(truncated)

### Step 3 — fetch-clips
beat 58: query "reading fine print contract"
  - **script-level pick:** pexels/pexels-v7841623 [video] 1920x1080, 8s
  - **candidates (scored/raw):** 24/24
  - **top 3 by score:** pexels/pexels-v7841623(17), pexels/pexels-v8960646(15), pexels/pexels-p7821905(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=reading+fine+print+contract&page_size=12&license_type=commercial

### Step 3 — fetch-clips
beat 55: query "home water heater tank"
  - **script-level pick:** pexels/pexels-v5571841 [video] 1920x1080, 15s
  - **candidates (scored/raw):** 24/24
  - **top 3 by score:** pexels/pexels-v5571841(17), pexels/pexels-p8142971(14), pexels/pexels-v5499030(12)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=home+water+heater+tank&page_size=12&license_type=commercial

### Step 3 — fetch-clips
beat 51: query "fountain pen writing ledger"
  - **script-level pick:** pexels/pexels-v7055350 [video] 1920x1080, 8s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v7055350(17), pexels/pexels-v5981346(14), pexels/pexels-p2355408(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=fountain+pen+writing+ledger&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 60: query "power lines over city street"
  - **script-level pick:** pexels/pexels-v2938856 [video] 1366x720, 29s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v2938856(16), pexels/pexels-v4207959(14), pexels/pexels-p20019747(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=power+lines+over+city+street&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 49: query "suburban house front porch"
  - **script-level pick:** pexels/pexels-v5345135 [video] 1366x720, 30s
  - **candidates (scored/raw):** 24/24
  - **top 3 by score:** pexels/pexels-v5345135(16), pexels/pexels-v5437352(15), pexels/pexels-p18326826(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=suburban+house+front+porch&page_size=12&license_type=commercial

### Step 3 — fetch-clips
beat 61: query "man shrugging honest gesture"
  - **script-level pick:** pexels/pexels-v10515012 [video] 1920x1080, 21s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v10515012(16), pexels/pexels-v11194553(14), pexels/pexels-p33715990(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 72: query "utility bill small print rider"
  - **script-level pick:** pexels/pexels-v5849607 [video] 1920x1080, 20s
  - **candidates (scored/raw):** 24/24
  - **top 3 by score:** pexels/pexels-v5849607(14), pexels/pexels-p16752780(14), pexels/pexels-v7545831(13)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 69: query "angry customer on telephone"
  - **script-level pick:** pexels/pexels-v8134512 [video] 1366x720, 16s
  - **candidates (scored/raw):** 24/24
  - **top 3 by score:** pexels/pexels-v8134512(17), pexels/pexels-v8691678(14), pexels/pexels-p1587014(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 67: query "tax form paperwork desk"
  - **script-level pick:** pexels/pexels-v8869637 [video] 1366x720, 23s
  - **candidates (scored/raw):** 24/24
  - **top 3 by score:** pexels/pexels-v8869637(16), pexels/pexels-v7822031(15), pexels/pexels-p7247409(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 68: query "person hanging up phone frustrated"
  - **script-level pick:** pexels/pexels-p7699331 [photo] 5821x3881
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-p7699331(14), pexels/pexels-v6024753(13), pexels/pexels-v7597573(12)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 65: query "shrinking stack of coins"
  - **script-level pick:** pexels/pexels-v8369980 [video] 1920x1080, 7s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v8369980(17), pexels/pexels-v8661806(14), pexels/pexels-p1006060(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 63: query "electricity transmission tower"
  - **script-level pick:** pexels/pexels-v27844418 [video] 1920x1080, 8s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v27844418(17), pexels/pexels-v15357261(14), pexels/pexels-p12657190(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=electricity+transmission+tower&page_size=6&license_type=commerci…(truncated)

### Step 3 — fetch-clips
beat 70: query "walking away from clutter"
  - **script-level pick:** pexels/pexels-v29055706 [video] 1920x1080, 19s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v29055706(16), pexels/pexels-v10566653(14), pexels/pexels-p9159297(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=walking+away+from+clutter&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 71: query "energy efficiency light bulb"
  - **script-level pick:** pexels/pexels-v6996471 [video] 1920x1080, 10s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v6996471(16), pexels/pexels-v853724(14), pexels/pexels-p3946161(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=energy+efficiency+light+bulb&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 64: query "percentage calculation calculator"
  - **script-level pick:** pexels/pexels-v7651768 [video] 1920x1080, 10s
  - **candidates (scored/raw):** 24/24
  - **top 3 by score:** pexels/pexels-v7651768(17), pexels/pexels-v6962710(15), pexels/pexels-p6927335(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=percentage+calculation+calculator&page_size=12&license_type=comm…(truncated)

### Step 3 — fetch-clips
beat 66: query "government tax office building"
  - **script-level pick:** pexels/pexels-v5106698 [video] 1920x1080, 31s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v5106698(16), pexels/pexels-v32790345(15), pexels/pexels-p29947625(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=government+tax+office+building&page_size=6&license_type=commerci…(truncated)

### Step 3 — fetch-clips
beat 62: query "utility poles wires neighborhood"
  - **script-level pick:** pexels/pexels-v4849151 [video] 1920x1080, 8s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v4849151(17), pexels/pexels-v4702191(14), pexels/pexels-p16974649(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=utility+poles+wires+neighborhood&page_size=6&license_type=commer…(truncated)

### Step 3 — fetch-clips
beat 75: query "worker installing weather stripping"
  - **script-level pick:** pexels/pexels-v8853464 [video] 1920x1080, 24s
  - **candidates (scored/raw):** 23/23
  - **top 3 by score:** pexels/pexels-v8853464(16), pexels/pexels-p5691531(14), pexels/pexels-v8853532(13)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 73: query "different bill formats comparison"
  - **script-level pick:** pexels/pexels-v8370141 [video] 1920x1080, 8s
  - **candidates (scored/raw):** 24/24
  - **top 3 by score:** pexels/pexels-v8370141(17), pexels/pexels-v5849607(14), pexels/pexels-p10356910(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 79: query "utility crew repairing power line storm"
  - **script-level pick:** pexels/pexels-v30567549 [video] 1920x1080, 11s
  - **candidates (scored/raw):** 24/24
  - **top 3 by score:** pexels/pexels-v30567549(17), pexels/pexels-v30567734(15), pexels/pexels-p34610697(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 81: query "calendar end date circled"
  - **script-level pick:** pexels/pexels-v9057559 [video] 1920x1080, 11s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v9057559(17), pexels/pexels-v1793371(15), pexels/pexels-p11773871(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=calendar+end+date+circled&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 80: query "lightning storm over houses"
  - **script-level pick:** pexels/pexels-v13205825 [video] 1920x1080, 27s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v13205825(16), pexels/pexels-v32410927(14), pexels/pexels-p27196413(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=lightning+storm+over+houses&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 83: query "power plant smokestacks"
  - **script-level pick:** pexels/pexels-v5669738 [video] 1920x1080, 29s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v5669738(16), pexels/pexels-v19950817(14), pexels/pexels-p21419322(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=power+plant+smokestacks&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 77: query "person on phone taking notes"
  - **script-level pick:** pexels/pexels-v6278825 [video] 1920x1080, 15s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v6278825(16), pexels/pexels-v6817055(14), pexels/pexels-p8374337(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=person+on+phone+taking+notes&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 76: query "led light bulb replacement"
  - **script-level pick:** pexels/pexels-v7640933 [video] 1366x720, 42s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v7640933(16), pexels/pexels-v7641514(14), pexels/pexels-p3946163(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=led+light+bulb+replacement&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 82: query "person sleeping peacefully night"
  - **script-level pick:** pexels/pexels-v6941199 [video] 1366x720, 19s
  - **candidates (scored/raw):** 24/24
  - **top 3 by score:** pexels/pexels-v6941199(17), pexels/pexels-p7445144(14), pexels/pexels-v6541396(13)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=person+sleeping+peacefully+night&page_size=12&license_type=comme…(truncated)

### Step 3 — fetch-clips
beat 84: query "fuel gauge industrial dial"
  - **script-level pick:** pexels/pexels-v16943480 [video] 1920x1080, 11s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v16943480(17), pexels/pexels-v5637839(15), pexels/pexels-p1367554(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=fuel+gauge+industrial+dial&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 78: query "storm damaged power lines"
  - **script-level pick:** pexels/pexels-v30567549 [video] 1920x1080, 11s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v30567549(17), pexels/pexels-v4196206(14), pexels/pexels-p5494032(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=storm+damaged+power+lines&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 74: query "home insulation installation attic"
  - **script-level pick:** pexels/pexels-v31466248 [video] 1920x1080, 6s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v31466248(17), pexels/pexels-v7641515(14), pexels/pexels-p6124239(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=home+insulation+installation+attic&page_size=6&license_type=comm…(truncated)

### Step 3 — fetch-clips
beat 94: query "dusty old file folder archive"
  - **script-level pick:** pexels/pexels-v6550424 [video] 1920x1080, 20s
  - **candidates (scored/raw):** 24/24
  - **top 3 by score:** pexels/pexels-v6550424(17), pexels/pexels-v8869625(14), pexels/pexels-p11176866(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 92: query "filing cabinet folders rows"
  - **script-level pick:** pexels/pexels-v8061364 [video] 1920x1080, 16s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v8061364(16), pexels/pexels-v8298391(15), pexels/pexels-p1370294(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 88: query "monthly bill statement close up"
  - **script-level pick:** pexels/pexels-v35402332 [video] 1920x1080, 8s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v35402332(17), pexels/pexels-v7545831(15), pexels/pexels-p7926666(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 96: query "hand writing notes notepad"
  - **script-level pick:** pexels/pexels-v6781562 [video] 1920x1080, 10s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v6781562(17), pexels/pexels-v10797881(14), pexels/pexels-p8123850(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=hand+writing+notes+notepad&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 90: query "light switch turned off"
  - **script-level pick:** pexels/pexels-v853772 [video] 1920x1080, 13s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v853772(16), pexels/pexels-v8746855(14), pexels/pexels-p30641386(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=light+switch+turned+off&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 89: query "empty dark house interior"
  - **script-level pick:** pexels/pexels-v27977654 [video] 1920x1080, 10s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v27977654(17), pexels/pexels-v13724979(14), pexels/pexels-p9198397(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 502 Bad Gateway for https://api.openverse.org/v1/images/?q=empty+dark+house+interior&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 85: query "electricity generation turbine"
  - **script-level pick:** pexels/pexels-v8741102 [video] 1920x1080, 21s
  - **candidates (scored/raw):** 24/24
  - **top 3 by score:** pexels/pexels-v8741102(17), pexels/pexels-v28652588(15), pexels/pexels-p414905(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=electricity+generation+turbine&page_size=12&license_type=commerc…(truncated)

### Step 3 — fetch-clips
beat 93: query "row of mailboxes apartment"
  - **script-level pick:** pexels/pexels-v7317625 [video] 1920x1080, 18s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v7317625(16), pexels/pexels-v39003902(15), pexels/pexels-p13209666(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=row+of+mailboxes+apartment&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 87: query "clock on kitchen wall"
  - **script-level pick:** pexels/pexels-v35930423 [video] 1920x1080, 18s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v35930423(16), pexels/pexels-v16641476(14), pexels/pexels-p3257927(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=clock+on+kitchen+wall&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 91: query "person surprised reading document"
  - **script-level pick:** pexels/pexels-v6612066 [video] 1366x720, 23s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v6612066(16), pexels/pexels-v8731555(14), pexels/pexels-p37476741(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=person+surprised+reading+document&page_size=6&license_type=comme…(truncated)

### Step 3 — fetch-clips
beat 86: query "rising line graph chart"
  - **script-level pick:** pexels/pexels-v8478942 [video] 1920x1080, 11s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v8478942(17), pexels/pexels-v38736274(14), pexels/pexels-p39212619(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=rising+line+graph+chart&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 95: query "highlighting text on document"
  - **script-level pick:** pexels/pexels-v7841616 [video] 1920x1080, 12s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v7841616(16), pexels/pexels-v7841611(15), pexels/pexels-p7841451(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=highlighting+text+on+document&page_size=6&license_type=commercia…(truncated)

### Step 3 — fetch-clips
beat 101: query "home medical equipment oxygen"
  - **script-level pick:** pexels/pexels-v7580482 [video] 1366x720, 12s
  - **candidates (scored/raw):** 24/24
  - **top 3 by score:** pexels/pexels-v7580482(17), pexels/pexels-v5867940(14), pexels/pexels-p6285400(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 108: query "dishwasher loading kitchen night"
  - **script-level pick:** pexels/pexels-v35999383 [video] 1920x1080, 19s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v35999383(16), pexels/pexels-v4109351(14), pexels/pexels-p3829555(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 97: query "pen and notepad ready"
  - **script-level pick:** pexels/pexels-v10797881 [video] 1920x1080, 20s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v10797881(16), pexels/pexels-v6781562(15), pexels/pexels-p7793191(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 5 — verify-overlays
PASSED — 46/145 beats have an overlay
  - **archetype tally:** none:99, chapter-title:14, stat-callout:8, key-phrase:8, progress-badge:5, quote-card:4, list-reveal:3, icon-accent:1, typewriter:1, comparison-wipe:1, lower-third:1
  - **stat-callout placement:** 7/8 center
  - **dominant-archetype share:** 30%

## Step 5 — overlay archetype decisions (editorial pass)
Two-pass: hook-signals.json (Pass 1 triage) -> overlays.json (Pass 2 archetype+content, every entry carries a reason).
Density: 46/145 = 31.7%. Above the ~25% moderate target; user was asked and chose to KEEP all 14 chapter-title
cards (one per counted charge) because they are what makes a 13-min numbered countdown followable.
Trimmed 8 weakest hooks first (beats 10,33,38,58,65,80,100,107) - mostly repeats of the
'exact bill wording' key-phrase pattern established at beat 24.

### Step 5 — self-checks
- archetype variety: chapter-title 14 (30%), stat-callout 8 (17%), key-phrase 8 (17%), progress-badge 5,
  quote-card 4, list-reveal 3, icon-accent/typewriter/comparison-wipe/lower-third 1 each.
  chapter-title is the only archetype >40%-adjacent and it is STRUCTURAL (the countdown spine), not habit. OK
- stat-callout placement: 7/8 center. Each re-checked against the lower placement bar - beats 06/21/26/35/104/118/119
  are each built entirely around their number with no competing action; beat 05 ($214 setup figure) correctly stays corner. OK
- typewriter/split-screen: typewriter at beat 98 (narrator literally says 'write these words down' - the exact
  use case); comparison-wipe at beat 124 ('put the two side by side' - stated verbatim). Both genuinely present. OK
- tone tracks emotion: neutral on the 14 chapter cards, warm on the grandmother/good-news beats (09,14,47,75,95,104,112,140),
  urgent on the warnings and the number-one evidence (06,18,21,35,57,70,113,114,118,119,124,142),
  cool on the analytical/instructional beats, solemn on beat 82. Tracks the script's real arc. OK
- map consistency: no real-geo map beats this run (CT/NY are cited as report sources, not places the film visits).
  Trivially passes.

### Step 3 — fetch-clips
beat 107: query "electric meter spinning fast"
  - **script-level pick:** pexels/pexels-v3958753 [video] 1920x1080, 50s
  - **candidates (scored/raw):** 11/11
  - **top 3 by score:** pexels/pexels-v3958753(16), pexels/pexels-p11924298(14), pexels/pexels-v3069096(13)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=electric+meter+spinning+fast&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 102: query "modest family home kitchen"
  - **script-level pick:** pexels/pexels-v8203044 [video] 1920x1080, 17s
  - **candidates (scored/raw):** 24/24
  - **top 3 by score:** pexels/pexels-v8203044(17), pexels/pexels-v4941893(15), pexels/pexels-p29239239(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=modest+family+home+kitchen&page_size=12&license_type=commercial

### Step 3 — fetch-clips
beat 105: query "phone call quick simple"
  - **script-level pick:** pexels/pexels-v7119837 [video] 1366x720, 85s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v7119837(16), pexels/pexels-v30444972(15), pexels/pexels-p7544758(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=phone+call+quick+simple&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 99: query "spreadsheet data on monitor"
  - **script-level pick:** pexels/pexels-v8478748 [video] 1920x1080, 29s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v8478748(16), pexels/pexels-v8212367(14), pexels/pexels-p7691749(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=spreadsheet+data+on+monitor&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 104: query "counting dollar bills hand"
  - **script-level pick:** pexels/pexels-v5466769 [video] 1920x1080, 14s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v5466769(16), pexels/pexels-v6326929(14), pexels/pexels-p4475469(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=counting+dollar+bills+hand&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 100: query "office worker at computer screen"
  - **script-level pick:** pexels/pexels-v3255384 [video] 1920x1080, 24s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v3255384(16), pexels/pexels-v30217948(15), pexels/pexels-p19895883(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=office+worker+at+computer+screen&page_size=6&license_type=commer…(truncated)

### Step 3 — fetch-clips
beat 98: query "customer service phone conversation"
  - **script-level pick:** pexels/pexels-v7963131 [video] 1920x1080, 10s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v7963131(17), pexels/pexels-v8170531(15), pexels/pexels-p8691839(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=customer+service+phone+conversation&page_size=6&license_type=com…(truncated)

### Step 3 — fetch-clips
beat 106: query "evening city lights houses"
  - **script-level pick:** pexels/pexels-v35831448 [video] 1920x1080, 26s
  - **candidates (scored/raw):** 24/24
  - **top 3 by score:** pexels/pexels-v35831448(15), pexels/pexels-p28772693(14), pexels/pexels-v18335495(13)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=evening+city+lights+houses&page_size=12&license_type=commercial

### Step 3 — fetch-clips
beat 103: query "clock and calendar together"
  - **script-level pick:** pexels/pexels-v6890305 [video] 1920x1080, 20s
  - **candidates (scored/raw):** 24/24
  - **top 3 by score:** pexels/pexels-v6890305(14), pexels/pexels-p19055620(14), pexels/pexels-v1034069(13)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=clock+and+calendar+together&page_size=12&license_type=commercial

### Step 3 — fetch-clips
beat 117: query "man speaking sincerely camera"
  - **script-level pick:** pexels/pexels-v8724366 [video] 1366x720, 20s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v8724366(16), pexels/pexels-v6617459(15), pexels/pexels-p36763344(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 112: query "old washing machine 1930s"
  - **script-level pick:** pexels/pexels-v5592719 [video] 1920x1080, 16s
  - **candidates (scored/raw):** 24/24
  - **top 3 by score:** pexels/pexels-v5592719(17), pexels/pexels-p161756(14), pexels/pexels-v8756637(13)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 115: query "salesperson knocking on door"
  - **script-level pick:** pexels/pexels-v6682262 [video] 1920x1080, 13s
  - **candidates (scored/raw):** 24/24
  - **top 3 by score:** pexels/pexels-v6682262(17), pexels/pexels-v6994795(15), pexels/pexels-p6670219(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 109: query "laundry machine morning light"
  - **script-level pick:** pexels/pexels-v6482495 [video] 1920x1080, 59s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v6482495(16), pexels/pexels-v8488661(14), pexels/pexels-p8774509(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 114: query "reading bill under lamp light"
  - **script-level pick:** pexels/pexels-v17487563 [video] 1920x1080, 13s
  - **candidates (scored/raw):** 24/24
  - **top 3 by score:** pexels/pexels-v17487563(17), pexels/pexels-v17487550(15), pexels/pexels-p8872407(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 113: query "electricity bill supply section"
  - **script-level pick:** pexels/pexels-v35168445 [video] 1920x1080, 7s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v35168445(17), pexels/pexels-v35168479(15), pexels/pexels-p13785838(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 118: query "government report document official"
  - **script-level pick:** pexels/pexels-v8371858 [video] 1366x720, 79s
  - **candidates (scored/raw):** 24/24
  - **top 3 by score:** pexels/pexels-v8371858(16), pexels/pexels-v6929599(15), pexels/pexels-p6927565(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=government+report+document+official&page_size=12&license_type=co…(truncated)

### Step 3 — fetch-clips
beat 120: query "rising costs graph upward"
  - **script-level pick:** pexels/pexels-v36455152 [video] 1920x1080, 23s
  - **candidates (scored/raw):** 24/24
  - **top 3 by score:** pexels/pexels-v36455152(16), pexels/pexels-v38736277(15), pexels/pexels-p7054368(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=rising+costs+graph+upward&page_size=12&license_type=commercial

### Step 3 — fetch-clips
beat 116: query "power lines into house"
  - **script-level pick:** pexels/pexels-v28933364 [video] 1920x1080, 28s
  - **candidates (scored/raw):** 24/24
  - **top 3 by score:** pexels/pexels-v28933364(17), pexels/pexels-v15024387(15), pexels/pexels-p18609055(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=power+lines+into+house&page_size=12&license_type=commercial

### Step 3 — fetch-clips
beat 110: query "family cooking dinner kitchen"
  - **script-level pick:** pexels/pexels-v8480934 [video] 1920x1080, 11s
  - **candidates (scored/raw):** 24/24
  - **top 3 by score:** pexels/pexels-v8480934(17), pexels/pexels-v7084975(15), pexels/pexels-p6249032(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=family+cooking+dinner+kitchen&page_size=12&license_type=commerci…(truncated)

### Step 3 — fetch-clips
beat 119: query "state capitol building exterior"
  - **script-level pick:** pexels/pexels-v6599402 [video] 1920x1080, 16s
  - **candidates (scored/raw):** 24/24
  - **top 3 by score:** pexels/pexels-v6599402(17), pexels/pexels-v34779888(15), pexels/pexels-p19238947(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=state+capitol+building+exterior&page_size=12&license_type=commer…(truncated)

### Step 3 — fetch-clips
beat 111: query "vintage laundry hanging line"
  - **script-level pick:** pexels/pexels-v9661806 [video] 1920x1080, 9s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v9661806(17), pexels/pexels-v8296864(14), pexels/pexels-p3215941(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=vintage+laundry+hanging+line&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 125: query "surprised person looking at bill"
  - **script-level pick:** pexels/pexels-v6962835 [video] 1920x1080, 11s
  - **candidates (scored/raw):** 24/24
  - **top 3 by score:** pexels/pexels-v6962835(17), pexels/pexels-p5900072(14), pexels/pexels-v7821650(13)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 129: query "tidy organized paperwork desk"
  - **script-level pick:** pexels/pexels-v10567295 [video] 1366x720, 30s
  - **candidates (scored/raw):** 24/24
  - **top 3 by score:** pexels/pexels-v10567295(16), pexels/pexels-v7054942(15), pexels/pexels-p10347148(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 123: query "utility website on laptop"
  - **script-level pick:** pexels/pexels-v8523640 [video] 1920x1080, 15s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v8523640(16), pexels/pexels-v7308093(15), pexels/pexels-p1181449(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 122: query "electricity rate printed bill"
  - **script-level pick:** pexels/pexels-v7545831 [video] 1920x1080, 5s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v7545831(17), pexels/pexels-v6282375(14), pexels/pexels-p16956699(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 127: query "person shaking head no"
  - **script-level pick:** pexels/pexels-v6277899 [video] 1920x1080, 8s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v6277899(17), pexels/pexels-v10515022(14), pexels/pexels-p32098256(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 502 Bad Gateway for https://api.openverse.org/v1/images/?q=person+shaking+head+no&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 126: query "honest conversation face to face"
  - **script-level pick:** pexels/pexels-v7687706 [video] 1920x1080, 12s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v7687706(15), pexels/pexels-p10029802(14), pexels/pexels-v35004913(13)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=honest+conversation+face+to+face&page_size=6&license_type=commer…(truncated)

### Step 3 — fetch-clips
beat 128: query "three items on a list"
  - **script-level pick:** pexels/pexels-v1793371 [video] 1920x1080, 15s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v1793371(17), pexels/pexels-v5717466(14), pexels/pexels-p8850713(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=three+items+on+a+list&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 124: query "comparing two documents side by side"
  - **script-level pick:** pexels/pexels-v5941021 [video] 1920x1080, 9s
  - **candidates (scored/raw):** 24/24
  - **top 3 by score:** pexels/pexels-v5941021(17), pexels/pexels-v9244098(15), pexels/pexels-p6457522(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=comparing+two+documents+side+by+side&page_size=12&license_type=c…(truncated)

### Step 3 — fetch-clips
beat 130: query "power plant at dusk"
  - **script-level pick:** pexels/pexels-v6216792 [video] 1920x1080, 18s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v6216792(16), pexels/pexels-v5989390(14), pexels/pexels-p5657165(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=power+plant+at+dusk&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 121: query "stopwatch counting seconds"
  - **script-level pick:** pexels/pexels-v856925 [video] 1920x1080, 608s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v856925(16), pexels/pexels-v14470121(14), pexels/pexels-p19730401(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=stopwatch+counting+seconds&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 131: query "sincere man talking camera"
  - **script-level pick:** pexels/pexels-v8724366 [video] 1366x720, 20s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v8724366(16), pexels/pexels-v35762543(15), pexels/pexels-p5055252(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=sincere+man+talking+camera&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 132: query "many houses neighborhood aerial"
  - **script-level pick:** pexels/pexels-v31915241 [video] 1920x1080, 33s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v31915241(16), pexels/pexels-v12240430(14), pexels/pexels-p5712728(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=many+houses+neighborhood+aerial&page_size=6&license_type=commerc…(truncated)

### Step 5 — verify-overlays
PASSED — 43/145 beats have an overlay
  - **archetype tally:** none:102, chapter-title:14, key-phrase:8, stat-callout:6, progress-badge:5, quote-card:4, list-reveal:3, icon-accent:1, typewriter:1, lower-third:1
  - **stat-callout placement:** 5/6 center
  - **dominant-archetype share:** 33%

### Step 3 — fetch-clips
beat 139: query "reading from paper calmly"
  - **script-level pick:** pexels/pexels-v26654076 [video] 1920x1080, 36s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v26654076(16), pexels/pexels-v6787190(15), pexels/pexels-p7927258(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo)

### Step 3 — fetch-clips
beat 133: query "list of questions notepad"
  - **script-level pick:** pexels/pexels-v6186805 [video] 1366x720, 30s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v6186805(16), pexels/pexels-v6962893(15), pexels/pexels-p6991443(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=list+of+questions+notepad&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 136: query "checking boxes on list"
  - **script-level pick:** pexels/pexels-v34225451 [video] 1920x1080, 17s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v34225451(16), pexels/pexels-v29031537(15), pexels/pexels-p8850706(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=checking+boxes+on+list&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 138: query "clock twelve minutes timer"
  - **script-level pick:** pexels/pexels-v29527767 [video] 1920x1080, 10s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v29527767(16), pexels/pexels-v30084927(15), pexels/pexels-p114738(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=clock+twelve+minutes+timer&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 135: query "phone call notes writing"
  - **script-level pick:** pexels/pexels-v7581278 [video] 1920x1080, 9s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v7581278(17), pexels/pexels-v7581272(15), pexels/pexels-p7516540(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=phone+call+notes+writing&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 137: query "hand receiving refund money"
  - **script-level pick:** pexels/pexels-v6693623 [video] 1920x1080, 7s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v6693623(17), pexels/pexels-v3943968(15), pexels/pexels-p15794052(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=hand+receiving+refund+money&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 142: query "turning over paper bill"
  - **script-level pick:** pexels/pexels-v7579336 [video] 1366x720, 49s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v7579336(16), pexels/pexels-v7735915(14), pexels/pexels-p4968499(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=turning+over+paper+bill&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 141: query "single task focused hand"
  - **script-level pick:** pexels/pexels-v4832134 [video] 1920x1080, 5s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v4832134(17), pexels/pexels-v9391663(14), pexels/pexels-p6862840(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=single+task+focused+hand&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 140: query "friendly phone conversation home"
  - **script-level pick:** pexels/pexels-v7189796 [video] 1366x576, 15s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v7189796(16), pexels/pexels-v6209597(14), pexels/pexels-p8279761(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=friendly+phone+conversation+home&page_size=6&license_type=commer…(truncated)

### Step 3 — fetch-clips
beat 143: query "morning sunrise kitchen window"
  - **script-level pick:** pexels/pexels-v26711375 [video] 1920x1080, 46s
  - **candidates (scored/raw):** 24/24
  - **top 3 by score:** pexels/pexels-v26711375(14), pexels/pexels-p11616864(14), pexels/pexels-v38756590(13)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=morning+sunrise+kitchen+window&page_size=12&license_type=commerc…(truncated)

### Step 3 — fetch-clips
beat 134: query "person asking question phone"
  - **script-level pick:** pexels/pexels-v7592179 [video] 1366x658, 11s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v7592179(17), pexels/pexels-v7447930(14), pexels/pexels-p6683468(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=person+asking+question+phone&page_size=6&license_type=commercial

### Step 3 — fetch-clips
beat 144: query "typing comment on phone"
  - **script-level pick:** pexels/pexels-v5075216 [video] 1366x720, 51s
  - **candidates (scored/raw):** 24/24
  - **top 3 by score:** pexels/pexels-v5075216(16), pexels/pexels-v5075215(14), pexels/pexels-p6214965(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=typing+comment+on+phone&page_size=12&license_type=commercial

### Step 3 — fetch-clips
beat 145: query "person reading messages smiling"
  - **script-level pick:** pexels/pexels-v9465064 [video] 1366x720, 44s
  - **candidates (scored/raw):** 12/12
  - **top 3 by score:** pexels/pexels-v9465064(16), pexels/pexels-v7331391(14), pexels/pexels-p35603053(14)
  - **anomalies:** pixabay: PIXABAY_API_KEY not set — skipped (video); videvo: VIDEVO_API_KEY not set — skipped (video); pixabay: PIXABAY_API_KEY not set — skipped (photo); openverse (photo): 504 Gateway Timeout for https://api.openverse.org/v1/images/?q=person+reading+messages+smiling&page_size=6&license_type=commerc…(truncated)

## Step 3 — semantic media matching (editorial pass)
- 129 semantic overrides applied over the script's keyword-rank picks (meaning + emotional register).
  3 of the agent's proposed ids did not exist in their own pools (24/27/29) — caught by a validation
  pass before applying, and re-picked by hand from the real pool.
- Media-type rebalance: the first semantic pass landed 89 photos / 53 videos (63% stills = slideshow feel).
  A second pass switched 74 photo beats to a genuinely-matching video from the same pool.
  Hand-corrected 2 more: beat 55 (solar rooftop heater -> technician servicing home heating)
  and beat 113, the film's climax (South Africa meter box -> twilight power lines).
- FINAL MIX: 128 video / 14 photo / 3 invented-scene. Provider: Pexels only (Openverse returned
  no winning candidate; pixabay/videvo unkeyed).

### Step 3 — invented-scene scan (forced, per skill warning about landing on zero)
Scanned every beat naming a figure the point hinges on, plus every before/after comparison beat.
3 qualified — in each case the best real candidate was topic-adjacent but depicted nothing of the number:
- beat 118 (86% paid more than standard rate): best real footage = 'a person checking documents'. -> proportion grid
- beat 119 ($50M returned to 278,000 households): best real footage = 'Oklahoma State Capitol with a
  Christmas tree'. -> two counting figures joined by a connector
- beat 124 ('put the two side by side'): best real footage = 'two coworkers discussing paperwork'. -> two rate cards
Beats considered and REJECTED for invented-scene (real footage genuinely depicts them): 05, 16, 21, 26, 35, 104.

### Step 4 — download-clip
beat 03: downloaded/processed
  - **mediaType:** photo
  - **source:** pexels/pexels-p7651555
  - **grade:** warm
  - **output:** .media/broll/beat-03.jpg

### Step 4 — download-clip
beat 04: downloaded/processed
  - **mediaType:** photo
  - **source:** pexels/pexels-p590011
  - **grade:** warm
  - **output:** .media/broll/beat-04.jpg

### Step 4 — download-clip
beat 06: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v5971260
  - **grade:** warm
  - **output:** .media/broll/beat-06.mp4

### Step 4 — download-clip
beat 01: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v6851679
  - **grade:** warm
  - **output:** .media/broll/beat-01.mp4

### Step 4 — download-clip
beat 02: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v6963962
  - **grade:** warm
  - **output:** .media/broll/beat-02.mp4

### Step 4 — download-clip
beat 05: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v39004072
  - **grade:** warm
  - **output:** .media/broll/beat-05.mp4

### Step 4 — download-clip
beat 11: downloaded/processed
  - **mediaType:** photo
  - **source:** pexels/pexels-p27862196
  - **grade:** warm
  - **output:** .media/broll/beat-11.jpg

### Step 4 — download-clip
beat 12: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v5970639
  - **grade:** warm
  - **output:** .media/broll/beat-12.mp4

### Step 4 — download-clip
beat 07: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v7054942
  - **grade:** warm
  - **output:** .media/broll/beat-07.mp4

### Step 4 — download-clip
beat 08: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v30763463
  - **grade:** warm
  - **output:** .media/broll/beat-08.mp4

### Step 4 — download-clip
beat 10: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v30117908
  - **grade:** warm
  - **output:** .media/broll/beat-10.mp4

### Step 4 — download-clip
beat 09: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v6566559
  - **grade:** warm
  - **output:** .media/broll/beat-09.mp4

### Step 4 — download-clip
beat 15: downloaded/processed
  - **mediaType:** photo
  - **source:** pexels/pexels-p20459081
  - **grade:** warm
  - **output:** .media/broll/beat-15.jpg

### Step 4 — download-clip
beat 17: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v10797880
  - **grade:** warm
  - **output:** .media/broll/beat-17.mp4

## Step 5 — transitions
- style=mixed-cuts (user choice), built per-section with --start-index so the deterministic sequence
  continues across section boundaries (no spurious leading 'cut', no repeats at seams — verified).
- Per-section intensity followed sections.json arcs: calm on setup/ledger/stuck-column/resolution,
  moderate on the charge countdown, energetic on the number-one climax (beats 113-125).
- Result: 48 hard-cut, 56 push-slide, 14 blur-crossfade, 13 crossfade, 13 squeeze, 1 leading cut.
  Zero back-to-back identical transitions. Zero spurious mid-film cuts.
- NOTE: output is byte-identical to a single whole-film call. Correct, not a bug: --intensity only
  strips zoom-through from the rotation, and mixed-cuts never had zoom-through in its pool.
- No whip-pan/accent transitions used: user asked for restrained sound/effects, and this film's
  pivots are already marked by the 14 chapter-title cards.

### Step 4 — download-clip
beat 16: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v29031537
  - **grade:** warm
  - **output:** .media/broll/beat-16.mp4

### Step 4 — download-clip
beat 14: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v5524280
  - **grade:** warm
  - **output:** .media/broll/beat-14.mp4

### Step 4 — download-clip
beat 13: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v5642850
  - **grade:** warm
  - **output:** .media/broll/beat-13.mp4

### Step 4 — download-clip
beat 18: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v6517587
  - **grade:** warm
  - **output:** .media/broll/beat-18.mp4

### Step 4 — download-clip
beat 24: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v7947467
  - **grade:** warm
  - **output:** .media/broll/beat-24.mp4

### Step 4 — download-clip
beat 19: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v7710497
  - **grade:** warm
  - **output:** .media/broll/beat-19.mp4

### Step 4 — download-clip
beat 23: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v6994417
  - **grade:** warm
  - **output:** .media/broll/beat-23.mp4

### Step 4 — download-clip
beat 22: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v6023018
  - **grade:** warm
  - **output:** .media/broll/beat-22.mp4

### Step 4 — download-clip
beat 20: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v6017622
  - **grade:** warm
  - **output:** .media/broll/beat-20.mp4

### Step 4 — download-clip
beat 21: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v12096351
  - **grade:** warm
  - **output:** .media/broll/beat-21.mp4

### Step 4 — download-clip
beat 29: downloaded/processed
  - **mediaType:** photo
  - **source:** pexels/pexels-p942316
  - **grade:** warm
  - **output:** .media/broll/beat-29.jpg

### Step 4 — download-clip
beat 25: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v7252673
  - **grade:** warm
  - **output:** .media/broll/beat-25.mp4

### Step 4 — download-clip
beat 26: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v5743130
  - **grade:** warm
  - **output:** .media/broll/beat-26.mp4

### Step 4 — download-clip
beat 28: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v5916730
  - **grade:** warm
  - **output:** .media/broll/beat-28.mp4

### Step 4 — download-clip
beat 30: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v34091414
  - **grade:** warm
  - **output:** .media/broll/beat-30.mp4

### Step 4 — download-clip
beat 27: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v8369906
  - **grade:** warm
  - **output:** .media/broll/beat-27.mp4

### Step 4 — download-clip
beat 36: downloaded/processed
  - **mediaType:** photo
  - **source:** pexels/pexels-p7926666
  - **grade:** warm
  - **output:** .media/broll/beat-36.jpg

### Step 4 — download-clip
beat 33: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v3958753
  - **grade:** warm
  - **output:** .media/broll/beat-33.mp4

### Step 4 — download-clip
beat 34: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v10397452
  - **grade:** warm
  - **output:** .media/broll/beat-34.mp4

### Step 4 — download-clip
beat 35: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v5546826
  - **grade:** warm
  - **output:** .media/broll/beat-35.mp4

### Step 4 — download-clip
beat 32: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v7841584
  - **grade:** warm
  - **output:** .media/broll/beat-32.mp4

### Step 4 — download-clip
beat 31: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v30567734
  - **grade:** warm
  - **output:** .media/broll/beat-31.mp4

### Step 4 — download-clip
beat 38: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v7661422
  - **grade:** warm
  - **output:** .media/broll/beat-38.mp4

### Step 4 — download-clip
beat 39: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v9057559
  - **grade:** warm
  - **output:** .media/broll/beat-39.mp4

### Step 4 — download-clip
beat 42: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v9057693
  - **grade:** warm
  - **output:** .media/broll/beat-42.mp4

### Step 4 — download-clip
beat 41: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v5981723
  - **grade:** warm
  - **output:** .media/broll/beat-41.mp4

### Step 4 — download-clip
beat 40: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v6282368
  - **grade:** warm
  - **output:** .media/broll/beat-40.mp4

### Step 4 — download-clip
beat 37: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v7682758
  - **grade:** warm
  - **output:** .media/broll/beat-37.mp4

### Step 4 — download-clip
beat 45: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v9057678
  - **grade:** warm
  - **output:** .media/broll/beat-45.mp4

### Step 4 — download-clip
beat 47: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v6693623
  - **grade:** warm
  - **output:** .media/broll/beat-47.mp4

### Step 4 — download-clip
beat 44: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v5466769
  - **grade:** warm
  - **output:** .media/broll/beat-44.mp4

### Step 4 — download-clip
beat 48: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v6963960
  - **grade:** warm
  - **output:** .media/broll/beat-48.mp4

### Step 4 — download-clip
beat 43: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v7821854
  - **grade:** warm
  - **output:** .media/broll/beat-43.mp4

### Step 4 — download-clip
beat 46: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v39060937
  - **grade:** warm
  - **output:** .media/broll/beat-46.mp4

### Step 4 — download-clip
beat 53: downloaded/processed
  - **mediaType:** photo
  - **source:** pexels/pexels-p19980200
  - **grade:** warm
  - **output:** .media/broll/beat-53.jpg

### Step 4 — download-clip
beat 51: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v32023790
  - **grade:** warm
  - **output:** .media/broll/beat-51.mp4

### Step 4 — download-clip
beat 50: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v7055343
  - **grade:** warm
  - **output:** .media/broll/beat-50.mp4

### Step 4 — download-clip
beat 54: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v7055344
  - **grade:** warm
  - **output:** .media/broll/beat-54.mp4

### Step 4 — download-clip
beat 49: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v5345135
  - **grade:** warm
  - **output:** .media/broll/beat-49.mp4

### Step 4 — download-clip
beat 52: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v35828975
  - **grade:** warm
  - **output:** .media/broll/beat-52.mp4

### Step 4 — download-clip
beat 55: downloaded/processed
  - **mediaType:** photo
  - **source:** pexels/pexels-p34938439
  - **grade:** warm
  - **output:** .media/broll/beat-55.jpg

### Step 4 — download-clip
beat 60: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v2932303
  - **grade:** warm
  - **output:** .media/broll/beat-60.mp4

### Step 4 — download-clip
beat 56: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v7580442
  - **grade:** warm
  - **output:** .media/broll/beat-56.mp4

### Step 4 — download-clip
beat 59: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v5303249
  - **grade:** warm
  - **output:** .media/broll/beat-59.mp4

### Step 4 — download-clip
beat 58: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v7841622
  - **grade:** warm
  - **output:** .media/broll/beat-58.mp4

### Step 4 — download-clip
beat 57: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v30615534
  - **grade:** warm
  - **output:** .media/broll/beat-57.mp4

### Step 4 — download-clip
beat 61: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v10515011
  - **grade:** warm
  - **output:** .media/broll/beat-61.mp4

### Step 4 — download-clip
beat 65: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v7062994
  - **grade:** warm
  - **output:** .media/broll/beat-65.mp4

### Step 4 — download-clip
beat 62: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v15024387
  - **grade:** warm
  - **output:** .media/broll/beat-62.mp4

### Step 4 — download-clip
beat 66: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v32790345
  - **grade:** warm
  - **output:** .media/broll/beat-66.mp4

### Step 4 — download-clip
beat 63: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v4035765
  - **grade:** warm
  - **output:** .media/broll/beat-63.mp4

### Step 4 — download-clip
beat 64: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v8293495
  - **grade:** warm
  - **output:** .media/broll/beat-64.mp4

### Step 4 — download-clip
beat 67: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v11321636
  - **grade:** warm
  - **output:** .media/broll/beat-67.mp4

### Step 4 — download-clip
beat 71: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v7593543
  - **grade:** warm
  - **output:** .media/broll/beat-71.mp4

### Step 4 — download-clip
beat 68: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v6024755
  - **grade:** warm
  - **output:** .media/broll/beat-68.mp4

### Step 4 — download-clip
beat 72: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v7545831
  - **grade:** warm
  - **output:** .media/broll/beat-72.mp4

### Step 4 — download-clip
beat 70: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v29055706
  - **grade:** warm
  - **output:** .media/broll/beat-70.mp4

### Step 4 — download-clip
beat 69: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v6517587
  - **grade:** warm
  - **output:** .media/broll/beat-69.mp4

### Step 4 — download-clip
beat 73: downloaded/processed
  - **mediaType:** photo
  - **source:** pexels/pexels-p33705551
  - **grade:** warm
  - **output:** .media/broll/beat-73.jpg

### Step 4 — download-clip
beat 76: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v7641514
  - **grade:** warm
  - **output:** .media/broll/beat-76.mp4

### Step 4 — download-clip
beat 74: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v31466248
  - **grade:** warm
  - **output:** .media/broll/beat-74.mp4

### Step 4 — download-clip
beat 75: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v34572318
  - **grade:** warm
  - **output:** .media/broll/beat-75.mp4

### Step 4 — download-clip
beat 78: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v30567549
  - **grade:** warm
  - **output:** .media/broll/beat-78.mp4

### Step 4 — download-clip
beat 77: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v6817055
  - **grade:** warm
  - **output:** .media/broll/beat-77.mp4

### Step 4 — build-credits
78 beat(s) consolidated into CREDITS.json
  - **beats with real footage:** 78
  - **attribution required:** 0

### Step 4 — download-clip
beat 80: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v13205825
  - **grade:** warm
  - **output:** .media/broll/beat-80.mp4

### Step 4 — download-clip
beat 84: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v9468765
  - **grade:** warm
  - **output:** .media/broll/beat-84.mp4

### Step 4 — download-clip
beat 81: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v9057559
  - **grade:** warm
  - **output:** .media/broll/beat-81.mp4

### Step 4 — download-clip
beat 83: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v18866539
  - **grade:** warm
  - **output:** .media/broll/beat-83.mp4

### Step 4 — download-clip
beat 82: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v6753381
  - **grade:** warm
  - **output:** .media/broll/beat-82.mp4

### Step 4 — download-clip
beat 79: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v30567549
  - **grade:** warm
  - **output:** .media/broll/beat-79.mp4

### Step 4 — download-clip
beat 89: downloaded/processed
  - **mediaType:** photo
  - **source:** pexels/pexels-p9198397
  - **grade:** warm
  - **output:** .media/broll/beat-89.jpg

### Step 4 — download-clip
beat 90: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v4403890
  - **grade:** warm
  - **output:** .media/broll/beat-90.mp4

### Step 4 — download-clip
beat 88: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v35402332
  - **grade:** warm
  - **output:** .media/broll/beat-88.mp4

### Step 4 — download-clip
beat 87: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v31900938
  - **grade:** warm
  - **output:** .media/broll/beat-87.mp4

### Step 4 — download-clip
beat 85: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v9790230
  - **grade:** warm
  - **output:** .media/broll/beat-85.mp4

### Step 4 — download-clip
beat 86: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v38771102
  - **grade:** warm
  - **output:** .media/broll/beat-86.mp4

### Step 4 — download-clip
beat 93: downloaded/processed
  - **mediaType:** photo
  - **source:** pexels/pexels-p37986075
  - **grade:** warm
  - **output:** .media/broll/beat-93.jpg

### Step 4 — download-clip
beat 96: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v6326847
  - **grade:** warm
  - **output:** .media/broll/beat-96.mp4

### Step 4 — download-clip
beat 95: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v7841616
  - **grade:** warm
  - **output:** .media/broll/beat-95.mp4

### Step 4 — download-clip
beat 92: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v7062984
  - **grade:** warm
  - **output:** .media/broll/beat-92.mp4

### Step 4 — download-clip
beat 94: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v6550424
  - **grade:** warm
  - **output:** .media/broll/beat-94.mp4

### Step 4 — download-clip
beat 91: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v8731555
  - **grade:** warm
  - **output:** .media/broll/beat-91.mp4

### Step 4 — download-clip
beat 100: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v4477798
  - **grade:** warm
  - **output:** .media/broll/beat-100.mp4

### Step 4 — download-clip
beat 98: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v7855745
  - **grade:** warm
  - **output:** .media/broll/beat-98.mp4

### Step 4 — download-clip
beat 99: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v8212367
  - **grade:** warm
  - **output:** .media/broll/beat-99.mp4

### Step 4 — download-clip
beat 97: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v6781562
  - **grade:** warm
  - **output:** .media/broll/beat-97.mp4

### Step 4 — download-clip
beat 101: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v5867940
  - **grade:** warm
  - **output:** .media/broll/beat-101.mp4

### Step 4 — download-clip
beat 102: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v7677136
  - **grade:** warm
  - **output:** .media/broll/beat-102.mp4

### Step 4 — download-clip
beat 107: downloaded/processed
  - **mediaType:** photo
  - **source:** pexels/pexels-p11924298
  - **grade:** warm
  - **output:** .media/broll/beat-107.jpg

### Step 4 — download-clip
beat 103: downloaded/processed
  - **mediaType:** photo
  - **source:** pexels/pexels-p8646392
  - **grade:** warm
  - **output:** .media/broll/beat-103.jpg

### Step 4 — download-clip
beat 104: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v4275306
  - **grade:** warm
  - **output:** .media/broll/beat-104.mp4

### Step 4 — download-clip
beat 105: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v7308187
  - **grade:** warm
  - **output:** .media/broll/beat-105.mp4

### Step 4 — download-clip
beat 108: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v35999383
  - **grade:** warm
  - **output:** .media/broll/beat-108.mp4

### Step 4 — download-clip
beat 106: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v16384314
  - **grade:** warm
  - **output:** .media/broll/beat-106.mp4

### Step 4 — download-clip
beat 114: downloaded/processed
  - **mediaType:** photo
  - **source:** pexels/pexels-p9052774
  - **grade:** warm
  - **output:** .media/broll/beat-114.jpg

### Step 4 — download-clip
beat 113: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v35168445
  - **grade:** warm
  - **output:** .media/broll/beat-113.mp4

### Step 4 — download-clip
beat 109: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v8756884
  - **grade:** warm
  - **output:** .media/broll/beat-109.mp4

### Step 4 — download-clip
beat 110: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v6296956
  - **grade:** warm
  - **output:** .media/broll/beat-110.mp4

### Step 4 — download-clip
beat 112: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v4119968
  - **grade:** warm
  - **output:** .media/broll/beat-112.mp4

### Step 4 — download-clip
beat 111: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v38262425
  - **grade:** warm
  - **output:** .media/broll/beat-111.mp4

### Step 4 — download-clip
beat 122: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v7545831
  - **grade:** warm
  - **output:** .media/broll/beat-122.mp4

### Step 4 — download-clip
beat 116: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v15024387
  - **grade:** warm
  - **output:** .media/broll/beat-116.mp4

### Step 4 — download-clip
beat 120: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v39316223
  - **grade:** warm
  - **output:** .media/broll/beat-120.mp4

### Step 4 — download-clip
beat 117: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v5941016
  - **grade:** warm
  - **output:** .media/broll/beat-117.mp4

### Step 4 — download-clip
beat 121: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v856925
  - **grade:** warm
  - **output:** .media/broll/beat-121.mp4

### Step 4 — download-clip
beat 115: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v6667226
  - **grade:** warm
  - **output:** .media/broll/beat-115.mp4

### Step 4 — download-clip
beat 123: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v8523640
  - **grade:** warm
  - **output:** .media/broll/beat-123.mp4

### Step 4 — download-clip
beat 127: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v6277899
  - **grade:** warm
  - **output:** .media/broll/beat-127.mp4

### Step 4 — download-clip
beat 125: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v7546417
  - **grade:** warm
  - **output:** .media/broll/beat-125.mp4

### Step 4 — download-clip
beat 126: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v8928028
  - **grade:** warm
  - **output:** .media/broll/beat-126.mp4

### Step 4 — download-clip
beat 128: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v29568794
  - **grade:** warm
  - **output:** .media/broll/beat-128.mp4

### Step 4 — download-clip
beat 129: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v10567193
  - **grade:** warm
  - **output:** .media/broll/beat-129.mp4

### Step 4 — download-clip
beat 135: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v7581278
  - **grade:** warm
  - **output:** .media/broll/beat-135.mp4

### Step 4 — download-clip
beat 131: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v7643836
  - **grade:** warm
  - **output:** .media/broll/beat-131.mp4

### Step 4 — download-clip
beat 132: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v38774217
  - **grade:** warm
  - **output:** .media/broll/beat-132.mp4

### Step 4 — download-clip
beat 133: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v6186805
  - **grade:** warm
  - **output:** .media/broll/beat-133.mp4

### Step 4 — download-clip
beat 134: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v32132504
  - **grade:** warm
  - **output:** .media/broll/beat-134.mp4

### Step 4 — download-clip
beat 130: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v5989390
  - **grade:** warm
  - **output:** .media/broll/beat-130.mp4

### Step 4 — download-clip
beat 137: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v6693623
  - **grade:** warm
  - **output:** .media/broll/beat-137.mp4

### Step 4 — download-clip
beat 139: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v7668961
  - **grade:** warm
  - **output:** .media/broll/beat-139.mp4

### Step 4 — download-clip
beat 138: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v30084927
  - **grade:** warm
  - **output:** .media/broll/beat-138.mp4

### Step 4 — download-clip
beat 140: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v6209597
  - **grade:** warm
  - **output:** .media/broll/beat-140.mp4

### Step 4 — download-clip
beat 136: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v29031537
  - **grade:** warm
  - **output:** .media/broll/beat-136.mp4

### Step 4 — download-clip
beat 141: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v7651685
  - **grade:** warm
  - **output:** .media/broll/beat-141.mp4

### Step 4 — download-clip
beat 142: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v35402332
  - **grade:** warm
  - **output:** .media/broll/beat-142.mp4

### Step 4 — download-clip
beat 145: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v7331391
  - **grade:** warm
  - **output:** .media/broll/beat-145.mp4

### Step 4 — download-clip
beat 144: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v6963823
  - **grade:** warm
  - **output:** .media/broll/beat-144.mp4

### Step 4 — download-clip
beat 143: downloaded/processed
  - **mediaType:** video
  - **source:** pexels/pexels-v38756590
  - **grade:** warm
  - **output:** .media/broll/beat-143.mp4

### Step 4 — build-credits
142 beat(s) consolidated into CREDITS.json
  - **beats with real footage:** 142
  - **attribution required:** 0

### Step 4 — probe-motion
.media/broll/beat-02.mp4: active (avgYdif=9.893, 7 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-07.mp4: active (avgYdif=8.182, 10 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-01.mp4: active (avgYdif=12.082, 12 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-05.mp4: active (avgYdif=4.868, 11 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-08.mp4: active (avgYdif=15.349, 12 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-06.mp4: active (avgYdif=11.908, 13 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-105.mp4: active (avgYdif=5.835, 6 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-104.mp4: active (avgYdif=21.593, 7 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-100.mp4: active (avgYdif=12.801, 8 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-101.mp4: active (avgYdif=17.973, 13 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-102.mp4: active (avgYdif=9.906, 13 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-09.mp4: slow (avgYdif=2.093, 16 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-109.mp4: active (avgYdif=5.33, 6 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-10.mp4: active (avgYdif=7.928, 9 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-110.mp4: active (avgYdif=15.31, 13 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-108.mp4: active (avgYdif=2.978, 7 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-106.mp4: active (avgYdif=4.953, 19 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-111.mp4: active (avgYdif=37.156, 12 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-117.mp4: active (avgYdif=3.499, 10 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-113.mp4: active (avgYdif=13.061, 7 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-120.mp4: active (avgYdif=3.575, 15 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-115.mp4: active (avgYdif=16.945, 14 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-112.mp4: active (avgYdif=14.612, 17 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-116.mp4: slow (avgYdif=1.132, 19 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-121.mp4: slow (avgYdif=2.258, 9 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-123.mp4: active (avgYdif=6.275, 8 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-127.mp4: active (avgYdif=4.817, 6 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-122.mp4: active (avgYdif=18.671, 7 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-126.mp4: active (avgYdif=9.857, 10 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-125.mp4: active (avgYdif=24.932, 15 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-131.mp4: active (avgYdif=5.586, 10 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-128.mp4: active (avgYdif=6.732, 10 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-132.mp4: active (avgYdif=15.971, 7 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-129.mp4: active (avgYdif=30.797, 14 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-130.mp4: active (avgYdif=4.106, 11 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-12.mp4: active (avgYdif=10.592, 15 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-138.mp4: static (avgYdif=0.156, 7 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-137.mp4: active (avgYdif=7.915, 7 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-134.mp4: active (avgYdif=13.881, 9 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-136.mp4: active (avgYdif=3.081, 10 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-133.mp4: slow (avgYdif=1.123, 9 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-135.mp4: active (avgYdif=7.111, 9 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-141.mp4: active (avgYdif=14.8, 7 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-139.mp4: active (avgYdif=5.217, 8 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-140.mp4: active (avgYdif=10.162, 9 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-142.mp4: active (avgYdif=14.632, 11 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-13.mp4: active (avgYdif=13.35, 11 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-143.mp4: active (avgYdif=9.448, 17 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-14.mp4: slow (avgYdif=1.646, 8 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-145.mp4: active (avgYdif=14.392, 8 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-16.mp4: active (avgYdif=2.784, 7 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-17.mp4: active (avgYdif=8.264, 8 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-144.mp4: active (avgYdif=8.238, 12 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-18.mp4: active (avgYdif=13.509, 15 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-22.mp4: active (avgYdif=20.159, 8 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-24.mp4: active (avgYdif=7.406, 8 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-19.mp4: active (avgYdif=18.477, 9 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-20.mp4: active (avgYdif=7.489, 15 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-23.mp4: active (avgYdif=14.89, 12 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-21.mp4: active (avgYdif=20.811, 20 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-26.mp4: active (avgYdif=7.235, 7 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-25.mp4: active (avgYdif=2.509, 8 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-28.mp4: active (avgYdif=21.74, 12 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-30.mp4: active (avgYdif=15.698, 15 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-31.mp4: active (avgYdif=9.766, 11 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-27.mp4: active (avgYdif=41.354, 14 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-38.mp4: active (avgYdif=5.389, 6 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-34.mp4: active (avgYdif=14.765, 9 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-35.mp4: active (avgYdif=8.414, 7 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-33.mp4: active (avgYdif=7.284, 12 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-37.mp4: active (avgYdif=14.222, 13 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-32.mp4: active (avgYdif=19.965, 16 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-44.mp4: active (avgYdif=5.479, 6 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-40.mp4: slow (avgYdif=1.529, 13 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-39.mp4: active (avgYdif=8.352, 8 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-42.mp4: active (avgYdif=13.545, 8 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-43.mp4: active (avgYdif=13.885, 8 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-41.mp4: active (avgYdif=7.165, 10 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-46.mp4: active (avgYdif=21.944, 8 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-48.mp4: active (avgYdif=7.006, 6 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-47.mp4: active (avgYdif=6.622, 7 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-45.mp4: active (avgYdif=13.218, 9 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-50.mp4: active (avgYdif=28.231, 9 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-49.mp4: active (avgYdif=14.698, 13 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-56.mp4: active (avgYdif=3.97, 10 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-54.mp4: active (avgYdif=20.247, 8 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-51.mp4: active (avgYdif=7.316, 9 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-58.mp4: active (avgYdif=5.787, 13 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-57.mp4: slow (avgYdif=0.772, 14 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-52.mp4: active (avgYdif=20.375, 9 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-63.mp4: active (avgYdif=8.89, 6 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-59.mp4: active (avgYdif=8.988, 7 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-60.mp4: active (avgYdif=3.466, 7 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-61.mp4: active (avgYdif=9.927, 9 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-62.mp4: slow (avgYdif=1.147, 9 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-64.mp4: active (avgYdif=5.71, 15 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-65.mp4: active (avgYdif=18.026, 9 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-66.mp4: active (avgYdif=16.425, 8 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-68.mp4: active (avgYdif=7.441, 10 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-70.mp4: active (avgYdif=25.39, 7 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-67.mp4: active (avgYdif=14.775, 15 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-69.mp4: active (avgYdif=13.355, 14 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-71.mp4: active (avgYdif=31.586, 6 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-76.mp4: active (avgYdif=7.407, 7 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-77.mp4: active (avgYdif=2.647, 9 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-72.mp4: active (avgYdif=22.416, 12 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-74.mp4: active (avgYdif=9.322, 12 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-75.mp4: active (avgYdif=11.942, 15 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-80.mp4: active (avgYdif=2.824, 7 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-81.mp4: active (avgYdif=7.577, 10 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-78.mp4: active (avgYdif=4.466, 8 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-83.mp4: active (avgYdif=6.011, 7 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-82.mp4: active (avgYdif=6.037, 17 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-79.mp4: active (avgYdif=5.316, 17 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-88.mp4: active (avgYdif=15.079, 9 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-84.mp4: active (avgYdif=6.249, 9 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-90.mp4: active (avgYdif=94.328, 7 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-87.mp4: static (avgYdif=0.469, 10 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-85.mp4: active (avgYdif=4.325, 14 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-86.mp4: slow (avgYdif=1.749, 12 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-95.mp4: active (avgYdif=6.652, 8 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-96.mp4: active (avgYdif=10.555, 7 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-92.mp4: active (avgYdif=9.753, 10 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-91.mp4: active (avgYdif=12.057, 8 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-97.mp4: active (avgYdif=4.526, 9 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-94.mp4: active (avgYdif=7.209, 15 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-98.mp4: active (avgYdif=20.384, 7 frames sampled)

### Step 4 — probe-motion
.media/broll/beat-99.mp4: active (avgYdif=4.707, 8 frames sampled)

### Step 4 — probe-clip-technical
128 clip(s) measured, 42 outlier(s)
  - **median luma:** 112.8
  - **median saturation:** 10.4
  - **outliers:** .media/broll/beat-09.mp4, .media/broll/beat-106.mp4, .media/broll/beat-120.mp4, .media/broll/beat-121.mp4, .media/broll/beat-131.mp4, .media/broll/beat-138.mp4, .media/broll/beat-139.mp4, .media/broll/beat-32.mp4, .media/broll/beat-40.mp4, .media/broll/beat-54.mp4, .media/broll/beat-61.mp4, .media/b…(truncated)

## Step 4 — download + probes
- 142 assets downloaded (128 video / 14 photo), --grade warm on every beat (user choice, one direction whole-film).
- Concurrency capped at 6 per skill guidance (real OOM risk). Zero download errors.
- NOTE: an intermediate wait-loop of mine miscounted -raw.mp4 intermediates as finished outputs and
  briefly reported 'complete' at beat 84. Caught it, cleaned the intermediates, waited on the real
  per-beat asset check instead. All 142 verified present afterward; nothing shipped from that miscount.
- CREDITS.json: 142 entries, all Pexels, attributionRequired=false on every one (crediting still good practice).
- probe-motion: 117 active / 9 slow / 2 static. Only beats 87 and 138 (both clock shots) are genuinely
  locked-off and will get --motion-class static. The other 126 render fully static per the no-synthetic-zoom rule.
- probe-clip-technical: 42/128 clips flagged as outliers vs this run's own median (luma, saturation, temp).
  Real cross-clip variance -> confirms the user's 'warm' grade choice was the right call, not decoration.

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
beat 03: frame built [photo, kenburns=pan-right]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/03-beat.html

### Step 5 — build-frame
beat 04: frame built [photo, kenburns=in]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/04-beat.html

### Step 5 — build-frame
beat 05: frame built [video, kenburns=none]
  - **overlay:** stat-callout
  - **overlay params:** {"text":"","value":"214","prefix":"$","suffix":"","label":"a typical monthly bill","icon":"info","max":null,"tone":"neutral","placement":"corner"}
  - **overlay enterAt:** 1.4s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/05-beat.html

### Step 5 — build-frame
beat 06: frame built [video, kenburns=none]
  - **overlay:** stat-callout
  - **overlay params:** {"text":"","value":"60","prefix":"$","suffix":"","label":"never touched a wire","icon":"info","max":null,"tone":"urgent","placement":"center"}
  - **overlay enterAt:** 2.6s
  - **cutaway:** .media/broll/beat-06-cutaway.mp4 @ 4.07s
  - **parallax:** n/a
  - **out:** compositions/frames/06-beat.html

### Step 5 — build-frame
beat 07: frame built [video, kenburns=none]
  - **overlay:** key-phrase
  - **overlay params:** {"text":"power, or paperwork","value":"0","prefix":"","suffix":"","label":"","icon":"info","max":null,"tone":"cool","placement":null}
  - **overlay enterAt:** 1s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/07-beat.html

### Step 5 — build-frame
beat 08: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-08-cutaway.mp4 @ 3.83s
  - **parallax:** n/a
  - **out:** compositions/frames/08-beat.html

### Step 5 — build-frame
beat 09: frame built [video, kenburns=none]
  - **overlay:** lower-third
  - **overlay params:** {"text":"Ruth's Ledger, 1929-1939","value":"0","prefix":"","suffix":"","label":"","icon":"info","max":null,"tone":"warm","placement":null}
  - **overlay enterAt:** 3.2s
  - **cutaway:** .media/broll/beat-09-cutaway.mp4 @ 4.98s
  - **parallax:** n/a
  - **out:** compositions/frames/09-beat.html

### Step 5 — build-frame
beat 10: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/10-beat.html

### Step 5 — build-frame
beat 11: frame built [photo, kenburns=pan-left]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
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
beat 14: frame built [video, kenburns=none]
  - **overlay:** quote-card
  - **overlay params:** {"text":"She wasn't smarter than you. She just got a bill she could read.","value":"0","prefix":"","suffix":"","label":"","icon":"info","max":null,"tone":"warm","placement":null}
  - **overlay enterAt:** 0.4s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/14-beat.html

### Step 5 — build-frame
beat 15: frame built [photo, kenburns=pan-left]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-15-cutaway.mp4 @ 4.72s
  - **parallax:** n/a
  - **out:** compositions/frames/15-beat.html

### Step 5 — build-frame
beat 16: frame built [video, kenburns=none]
  - **overlay:** list-reveal
  - **overlay params:** {"items":["6 you can kill","5 you can shrink","3 you're stuck with"]}
  - **overlay enterAt:** 0.6s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/16-beat.html

### Step 5 — build-frame
beat 17: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/17-beat.html

### Step 5 — build-frame
beat 18: frame built [video, kenburns=none]
  - **overlay:** icon-accent
  - **overlay params:** {"text":"","value":"0","prefix":"","suffix":"","label":"","icon":"warning","max":null,"tone":"urgent","placement":null}
  - **overlay enterAt:** 1.8s
  - **cutaway:** .media/broll/beat-18-cutaway.mp4 @ 4.53s
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
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-20-cutaway.mp4 @ 4.79s
  - **parallax:** n/a
  - **out:** compositions/frames/20-beat.html

### Step 5 — build-frame
beat 21: frame built [video, kenburns=none]
  - **overlay:** stat-callout
  - **overlay params:** {"text":"","value":"50","prefix":"$","suffix":"M","label":"in refunds, one state, April","icon":"info","max":null,"tone":"urgent","placement":"center"}
  - **overlay enterAt:** 4.2s
  - **cutaway:** .media/broll/beat-21-cutaway.mp4 @ 6.26s
  - **parallax:** n/a
  - **out:** compositions/frames/21-beat.html

### Step 5 — build-frame
beat 22: frame built [video, kenburns=none]
  - **overlay:** chapter-title
  - **overlay params:** {"kicker":"NUMBER 14","title":"The Paper Bill Fee"}
  - **overlay enterAt:** 2.2s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/22-beat.html

### Step 5 — build-frame
beat 23: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-23-cutaway.mp4 @ 3.79s
  - **parallax:** n/a
  - **out:** compositions/frames/23-beat.html

### Step 5 — build-frame
beat 24: frame built [video, kenburns=none]
  - **overlay:** key-phrase
  - **overlay params:** {"text":"paper statement / billing fee / convenience charge","value":"0","prefix":"","suffix":"","label":"","icon":"info","max":null,"tone":"cool","placement":null}
  - **overlay enterAt:** 0.5s
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
  - **overlay:** stat-callout
  - **overlay params:** {"text":"","value":"36","prefix":"$","suffix":"","label":"a year","icon":"info","max":null,"tone":"neutral","placement":"center"}
  - **overlay enterAt:** 1.4s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/26-beat.html

### Step 5 — build-frame
beat 27: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-27-cutaway.mp4 @ 4.42s
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
beat 29: frame built [photo, kenburns=pan-right]
  - **overlay:** chapter-title
  - **overlay params:** {"kicker":"NUMBER 13","title":"Smart Meter Opt-Out"}
  - **overlay enterAt:** 0.8s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/29-beat.html

### Step 5 — build-frame
beat 30: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-30-cutaway.mp4 @ 4.59s
  - **parallax:** n/a
  - **out:** compositions/frames/30-beat.html

### Step 5 — build-frame
beat 31: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/31-beat.html

### Step 5 — build-frame
beat 32: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-32-cutaway.mp4 @ 5.08s
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
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/34-beat.html

### Step 5 — build-frame
beat 35: frame built [video, kenburns=none]
  - **overlay:** stat-callout
  - **overlay params:** {"text":"","value":"180","prefix":"$","suffix":"","label":"a year for a box you don't remember checking","icon":"info","max":null,"tone":"urgent","placement":"center"}
  - **overlay enterAt:** 0.8s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/35-beat.html

### Step 5 — build-frame
beat 36: frame built [photo, kenburns=out]
  - **overlay:** chapter-title
  - **overlay params:** {"kicker":"NUMBER 12","title":"The Late Fee"}
  - **overlay enterAt:** 0.5s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/36-beat.html

### Step 5 — build-frame
beat 37: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-37-cutaway.mp4 @ 3.91s
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
  - **cutaway:** .media/broll/beat-40-cutaway.mp4 @ 4.12s
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
  - **overlay:** chapter-title
  - **overlay params:** {"kicker":"NUMBER 11","title":"The Deposit They're Holding"}
  - **overlay enterAt:** 1.6s
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
beat 47: frame built [video, kenburns=none]
  - **overlay:** key-phrase
  - **overlay params:** {"text":"It comes back when you ask","value":"0","prefix":"","suffix":"","label":"","icon":"info","max":null,"tone":"warm","placement":null}
  - **overlay enterAt:** 1.6s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/47-beat.html

### Step 5 — build-frame
beat 48: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/48-beat.html

### Step 5 — build-frame
beat 49: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-49-cutaway.mp4 @ 4.12s
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
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/51-beat.html

### Step 5 — build-frame
beat 52: frame built [video, kenburns=none]
  - **overlay:** chapter-title
  - **overlay params:** {"kicker":"NUMBER 10","title":"The Equipment Rental"}
  - **overlay enterAt:** 2.6s
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
beat 55: frame built [photo, kenburns=pan-left]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-55-cutaway.mp4 @ 4.01s
  - **parallax:** n/a
  - **out:** compositions/frames/55-beat.html

### Step 5 — build-frame
beat 56: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/56-beat.html

### Step 5 — build-frame
beat 57: frame built [video, kenburns=none]
  - **overlay:** key-phrase
  - **overlay params:** {"text":"bought it four or five times over","value":"0","prefix":"","suffix":"","label":"","icon":"info","max":null,"tone":"urgent","placement":null}
  - **overlay enterAt:** 3.4s
  - **cutaway:** .media/broll/beat-57-cutaway.mp4 @ 4.31s
  - **parallax:** n/a
  - **out:** compositions/frames/57-beat.html

### Step 5 — build-frame
beat 58: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-58-cutaway.mp4 @ 4.05s
  - **parallax:** n/a
  - **out:** compositions/frames/58-beat.html

### Step 5 — build-frame
beat 59: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/59-beat.html

### Step 5 — build-frame
beat 60: frame built [video, kenburns=none]
  - **overlay:** chapter-title
  - **overlay params:** {"kicker":"NUMBER 9","title":"The Franchise Fee"}
  - **overlay enterAt:** 0.6s
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
  - **cutaway:** .media/broll/beat-64-cutaway.mp4 @ 4.64s
  - **parallax:** n/a
  - **out:** compositions/frames/64-beat.html

### Step 5 — build-frame
beat 65: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/65-beat.html

### Step 5 — build-frame
beat 66: frame built [video, kenburns=none]
  - **overlay:** chapter-title
  - **overlay params:** {"kicker":"NUMBER 8","title":"State & Local Utility Tax"}
  - **overlay enterAt:** 0.5s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/66-beat.html

### Step 5 — build-frame
beat 67: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-67-cutaway.mp4 @ 4.58s
  - **parallax:** n/a
  - **out:** compositions/frames/67-beat.html

### Step 5 — build-frame
beat 68: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/68-beat.html

### Step 5 — build-frame
beat 69: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-69-cutaway.mp4 @ 4.21s
  - **parallax:** n/a
  - **out:** compositions/frames/69-beat.html

### Step 5 — build-frame
beat 70: frame built [video, kenburns=none]
  - **overlay:** key-phrase
  - **overlay params:** {"text":"Go where the money is","value":"0","prefix":"","suffix":"","label":"","icon":"info","max":null,"tone":"urgent","placement":null}
  - **overlay enterAt:** 0.9s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/70-beat.html

### Step 5 — build-frame
beat 71: frame built [video, kenburns=none]
  - **overlay:** chapter-title
  - **overlay params:** {"kicker":"NUMBER 7","title":"Energy Efficiency Surcharge"}
  - **overlay enterAt:** 0.4s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/71-beat.html

### Step 5 — build-frame
beat 72: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-72-cutaway.mp4 @ 3.76s
  - **parallax:** n/a
  - **out:** compositions/frames/72-beat.html

### Step 5 — build-frame
beat 73: frame built [photo, kenburns=pan-left]
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
  - **overlay:** list-reveal
  - **overlay params:** {"items":["Free home energy audits","Free insulation & weather stripping","Free LED replacements","Appliance rebates"]}
  - **overlay enterAt:** 0.5s
  - **cutaway:** .media/broll/beat-75-cutaway.mp4 @ 4.51s
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
  - **overlay:** chapter-title
  - **overlay params:** {"kicker":"NUMBER 6","title":"Storm Recovery"}
  - **overlay enterAt:** 1.8s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/78-beat.html

### Step 5 — build-frame
beat 79: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-79-cutaway.mp4 @ 5.4s
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
  - **overlay:** quote-card
  - **overlay params:** {"text":"A charge you understand stops costing you sleep, even when it doesn't stop costing you money.","value":"0","prefix":"","suffix":"","label":"","icon":"info","max":null,"tone":"solemn","placement":null}
  - **overlay enterAt:** 2.8s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/82-beat.html

### Step 5 — build-frame
beat 83: frame built [video, kenburns=none]
  - **overlay:** chapter-title
  - **overlay params:** {"kicker":"NUMBER 5","title":"The Fuel Adjustment"}
  - **overlay enterAt:** 0.4s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/83-beat.html

### Step 5 — build-frame
beat 84: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/84-beat.html

### Step 5 — build-frame
beat 85: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-85-cutaway.mp4 @ 4.37s
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
beat 87: FAILED to build frame
  - **overlay:** key-phrase
  - **error:** overlays.mjs keyPhrase: "emphasisWord" ("when") does not match any word in "undefined" — pass a valid 0-based index or the exact word text.

### Step 5 — build-frame
beat 88: frame built [video, kenburns=none]
  - **overlay:** chapter-title
  - **overlay params:** {"kicker":"NUMBER 4","title":"The Basic Service Charge"}
  - **overlay enterAt:** 1.8s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/88-beat.html

### Step 5 — build-frame
beat 89: frame built [photo, kenburns=out]
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
beat 92: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/92-beat.html

### Step 5 — build-frame
beat 93: frame built [photo, kenburns=in]
  - **overlay:** list-reveal
  - **overlay params:** {"items":["Standard residential","Time of use","Low income","Medical","All-electric home"]}
  - **overlay enterAt:** 0.4s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/93-beat.html

### Step 5 — build-frame
beat 94: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-94-cutaway.mp4 @ 4.53s
  - **parallax:** n/a
  - **out:** compositions/frames/94-beat.html

### Step 5 — build-frame
beat 95: frame built [video, kenburns=none]
  - **overlay:** chapter-title
  - **overlay params:** {"kicker":"NUMBER 3","title":"The Wrong Rate Class"}
  - **overlay enterAt:** 1.4s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/95-beat.html

### Step 5 — build-frame
beat 96: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/96-beat.html

### Step 5 — build-frame
beat 97: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/97-beat.html

### Step 5 — build-frame
beat 98: frame built [video, kenburns=none]
  - **overlay:** typewriter
  - **overlay params:** {"text":"What rate class am I on? What else do I qualify for?","value":"0","prefix":"","suffix":"","label":"","icon":"info","max":null,"tone":"warm","placement":null}
  - **overlay enterAt:** 0.3s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/98-beat.html

### Step 5 — build-frame
beat 99: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/99-beat.html

### Step 5 — build-frame
beat 100: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/100-beat.html

### Step 5 — build-frame
beat 101: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-101-cutaway.mp4 @ 4.07s
  - **parallax:** n/a
  - **out:** compositions/frames/101-beat.html

### Step 5 — build-frame
beat 102: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-102-cutaway.mp4 @ 4.1s
  - **parallax:** n/a
  - **out:** compositions/frames/102-beat.html

### Step 5 — build-frame
beat 103: frame built [photo, kenburns=in]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-103-cutaway.mp4 @ 3.91s
  - **parallax:** n/a
  - **out:** compositions/frames/103-beat.html

### Step 5 — build-frame
beat 104: frame built [video, kenburns=none]
  - **overlay:** stat-callout
  - **overlay params:** {"text":"","value":"60","prefix":"$","suffix":"","label":"a month, for many households","icon":"info","max":null,"tone":"warm","placement":"center"}
  - **overlay enterAt:** 0.6s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/104-beat.html

### Step 5 — build-frame
beat 105: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/105-beat.html

### Step 5 — build-frame
beat 106: frame built [video, kenburns=none]
  - **overlay:** chapter-title
  - **overlay params:** {"kicker":"NUMBER 2","title":"Peak Pricing"}
  - **overlay enterAt:** 0.4s
  - **cutaway:** .media/broll/beat-106-cutaway.mp4 @ 5.86s
  - **parallax:** n/a
  - **out:** compositions/frames/106-beat.html

### Step 5 — build-frame
beat 107: frame built [photo, kenburns=in]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/107-beat.html

### Step 5 — build-frame
beat 108: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/108-beat.html

### Step 5 — build-frame
beat 109: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/109-beat.html

### Step 5 — build-frame
beat 110: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-110-cutaway.mp4 @ 4.08s
  - **parallax:** n/a
  - **out:** compositions/frames/110-beat.html

### Step 5 — build-frame
beat 111: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/111-beat.html

### Step 5 — build-frame
beat 112: frame built [video, kenburns=none]
  - **overlay:** quote-card
  - **overlay params:** {"text":"It wasn't tradition. It was rate structure.","value":"0","prefix":"","suffix":"","label":"","icon":"info","max":null,"tone":"warm","placement":null}
  - **overlay enterAt:** 0.4s
  - **cutaway:** .media/broll/beat-112-cutaway.mp4 @ 5.28s
  - **parallax:** n/a
  - **out:** compositions/frames/112-beat.html

### Step 5 — build-frame
beat 113: frame built [video, kenburns=none]
  - **overlay:** chapter-title
  - **overlay params:** {"kicker":"NUMBER 1","title":"The Third-Party Supplier"}
  - **overlay enterAt:** 0.5s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/113-beat.html

### Step 5 — build-frame
beat 114: frame built [photo, kenburns=pan-left]
  - **overlay:** key-phrase
  - **overlay params:** {"text":"Look at the supply section","value":"0","prefix":"","suffix":"","label":"","icon":"info","max":null,"tone":"urgent","placement":null}
  - **overlay enterAt:** 2.4s
  - **cutaway:** .media/broll/beat-114-cutaway.mp4 @ 4.9s
  - **parallax:** n/a
  - **out:** compositions/frames/114-beat.html

### Step 5 — build-frame
beat 115: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-115-cutaway.mp4 @ 4.36s
  - **parallax:** n/a
  - **out:** compositions/frames/115-beat.html

### Step 5 — build-frame
beat 116: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-116-cutaway.mp4 @ 5.98s
  - **parallax:** n/a
  - **out:** compositions/frames/116-beat.html

### Step 5 — build-frame
beat 117: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/117-beat.html

### Step 5 — build-frame
beat 120: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-120-cutaway.mp4 @ 4.5s
  - **parallax:** n/a
  - **out:** compositions/frames/120-beat.html

### Step 5 — build-frame
beat 121: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/121-beat.html

### Step 5 — build-frame
beat 122: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/122-beat.html

### Step 5 — build-frame
beat 123: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/123-beat.html

### Step 5 — build-frame
beat 125: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-125-cutaway.mp4 @ 4.74s
  - **parallax:** n/a
  - **out:** compositions/frames/125-beat.html

### Step 5 — build-frame
beat 126: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/126-beat.html

### Step 5 — build-frame
beat 127: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/127-beat.html

### Step 5 — build-frame
beat 128: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/128-beat.html

### Step 5 — build-frame
beat 129: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-129-cutaway.mp4 @ 4.4s
  - **parallax:** n/a
  - **out:** compositions/frames/129-beat.html

### Step 5 — build-frame
beat 130: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/130-beat.html

### Step 5 — build-frame
beat 131: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/131-beat.html

### Step 5 — build-frame
beat 132: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/132-beat.html

### Step 5 — build-frame
beat 133: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/133-beat.html

### Step 5 — build-frame
beat 134: frame built [video, kenburns=none]
  - **overlay:** progress-badge
  - **overlay params:** {"step":1,"total":5}
  - **overlay enterAt:** 0.3s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/134-beat.html

### Step 5 — build-frame
beat 135: frame built [video, kenburns=none]
  - **overlay:** progress-badge
  - **overlay params:** {"step":2,"total":5}
  - **overlay enterAt:** 0.3s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/135-beat.html

### Step 5 — build-frame
beat 136: frame built [video, kenburns=none]
  - **overlay:** progress-badge
  - **overlay params:** {"step":3,"total":5}
  - **overlay enterAt:** 0.3s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/136-beat.html

### Step 5 — build-frame
beat 137: frame built [video, kenburns=none]
  - **overlay:** progress-badge
  - **overlay params:** {"step":4,"total":5}
  - **overlay enterAt:** 0.3s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/137-beat.html

### Step 5 — build-frame
beat 138: frame built [video, kenburns=video-push-in]
  - **overlay:** progress-badge
  - **overlay params:** {"step":5,"total":5}
  - **overlay enterAt:** 0.3s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/138-beat.html

### Step 5 — build-frame
beat 139: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/139-beat.html

### Step 5 — build-frame
beat 140: frame built [video, kenburns=none]
  - **overlay:** quote-card
  - **overlay params:** {"text":"You're asking a company what it's charging you. That's the most ordinary question in the world.","value":"0","prefix":"","suffix":"","label":"","icon":"info","max":null,"tone":"warm","placement":null}
  - **overlay enterAt:** 0.5s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/140-beat.html

### Step 5 — build-frame
beat 141: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/141-beat.html

### Step 5 — build-frame
beat 142: frame built [video, kenburns=none]
  - **overlay:** key-phrase
  - **overlay params:** {"text":"Read the company name. Just the name.","value":"0","prefix":"","suffix":"","label":"","icon":"info","max":null,"tone":"urgent","placement":null}
  - **overlay enterAt:** 1s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/142-beat.html

### Step 5 — build-frame
beat 143: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-143-cutaway.mp4 @ 5.18s
  - **parallax:** n/a
  - **out:** compositions/frames/143-beat.html

### Step 5 — build-frame
beat 144: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-144-cutaway.mp4 @ 3.73s
  - **parallax:** n/a
  - **out:** compositions/frames/144-beat.html

### Step 5 — build-frame
beat 145: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/145-beat.html

### Step 5 — build-frame
beat 87: frame built [video, kenburns=video-handheld-drift]
  - **overlay:** key-phrase
  - **overlay params:** {"text":"when you use power, not how much","emphasisWord":"when"}
  - **overlay enterAt:** 1.2s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/87-beat.html

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
beat 03: frame built [photo, kenburns=pan-right]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/03-beat.html

### Step 5 — build-frame
beat 04: frame built [photo, kenburns=in]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/04-beat.html

### Step 5 — build-frame
beat 05: frame built [video, kenburns=none]
  - **overlay:** stat-callout
  - **overlay params:** {"value":214,"prefix":"$","label":"a typical monthly bill","placement":"corner","tone":"neutral"}
  - **overlay enterAt:** 1.4s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/05-beat.html

### Step 5 — build-frame
beat 06: frame built [video, kenburns=none]
  - **overlay:** stat-callout
  - **overlay params:** {"value":60,"prefix":"$","label":"never touched a wire","placement":"center","tone":"urgent"}
  - **overlay enterAt:** 2.6s
  - **cutaway:** .media/broll/beat-06-cutaway.mp4 @ 4.07s
  - **parallax:** n/a
  - **out:** compositions/frames/06-beat.html

### Step 5 — build-frame
beat 07: frame built [video, kenburns=none]
  - **overlay:** key-phrase
  - **overlay params:** {"text":"power, or paperwork","tone":"cool"}
  - **overlay enterAt:** 1s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/07-beat.html

### Step 5 — build-frame
beat 08: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-08-cutaway.mp4 @ 3.83s
  - **parallax:** n/a
  - **out:** compositions/frames/08-beat.html

### Step 5 — build-frame
beat 09: frame built [video, kenburns=none]
  - **overlay:** lower-third
  - **overlay params:** {"text":"Ruth's Ledger, 1929-1939","tone":"warm"}
  - **overlay enterAt:** 3.2s
  - **cutaway:** .media/broll/beat-09-cutaway.mp4 @ 4.98s
  - **parallax:** n/a
  - **out:** compositions/frames/09-beat.html

### Step 5 — build-frame
beat 10: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/10-beat.html

### Step 5 — build-frame
beat 11: frame built [photo, kenburns=pan-left]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
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
beat 14: frame built [video, kenburns=none]
  - **overlay:** quote-card
  - **overlay params:** {"text":"She wasn't smarter than you. She just got a bill she could read.","tone":"warm"}
  - **overlay enterAt:** 0.4s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/14-beat.html

### Step 5 — build-frame
beat 15: frame built [photo, kenburns=pan-left]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-15-cutaway.mp4 @ 4.72s
  - **parallax:** n/a
  - **out:** compositions/frames/15-beat.html

### Step 5 — build-frame
beat 16: frame built [video, kenburns=none]
  - **overlay:** list-reveal
  - **overlay params:** {"items":["6 you can kill","5 you can shrink","3 you're stuck with"],"tone":"cool"}
  - **overlay enterAt:** 0.6s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/16-beat.html

### Step 5 — build-frame
beat 17: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/17-beat.html

### Step 5 — build-frame
beat 18: frame built [video, kenburns=none]
  - **overlay:** icon-accent
  - **overlay params:** {"icon":"warning","tone":"urgent"}
  - **overlay enterAt:** 1.8s
  - **cutaway:** .media/broll/beat-18-cutaway.mp4 @ 4.53s
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
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-20-cutaway.mp4 @ 4.79s
  - **parallax:** n/a
  - **out:** compositions/frames/20-beat.html

### Step 5 — build-frame
beat 21: frame built [video, kenburns=none]
  - **overlay:** stat-callout
  - **overlay params:** {"value":50,"prefix":"$","suffix":"M","label":"in refunds, one state, April","placement":"center","tone":"urgent"}
  - **overlay enterAt:** 4.2s
  - **cutaway:** .media/broll/beat-21-cutaway.mp4 @ 6.26s
  - **parallax:** n/a
  - **out:** compositions/frames/21-beat.html

### Step 5 — build-frame
beat 22: frame built [video, kenburns=none]
  - **overlay:** chapter-title
  - **overlay params:** {"kicker":"NUMBER 14","text":"The Paper Bill Fee","tone":"neutral"}
  - **overlay enterAt:** 2.2s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/22-beat.html

### Step 5 — build-frame
beat 23: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-23-cutaway.mp4 @ 3.79s
  - **parallax:** n/a
  - **out:** compositions/frames/23-beat.html

### Step 5 — build-frame
beat 24: frame built [video, kenburns=none]
  - **overlay:** key-phrase
  - **overlay params:** {"text":"paper statement / billing fee / convenience charge","tone":"cool"}
  - **overlay enterAt:** 0.5s
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
  - **overlay:** stat-callout
  - **overlay params:** {"value":36,"prefix":"$","label":"a year","placement":"center","tone":"neutral"}
  - **overlay enterAt:** 1.4s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/26-beat.html

### Step 5 — build-frame
beat 27: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-27-cutaway.mp4 @ 4.42s
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
beat 29: frame built [photo, kenburns=pan-right]
  - **overlay:** chapter-title
  - **overlay params:** {"kicker":"NUMBER 13","text":"Smart Meter Opt-Out","tone":"neutral"}
  - **overlay enterAt:** 0.8s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/29-beat.html

### Step 5 — build-frame
beat 30: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-30-cutaway.mp4 @ 4.59s
  - **parallax:** n/a
  - **out:** compositions/frames/30-beat.html

### Step 5 — build-frame
beat 31: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/31-beat.html

### Step 5 — build-frame
beat 32: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-32-cutaway.mp4 @ 5.08s
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
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/34-beat.html

### Step 5 — build-frame
beat 35: frame built [video, kenburns=none]
  - **overlay:** stat-callout
  - **overlay params:** {"value":180,"prefix":"$","label":"a year for a box you don't remember checking","placement":"center","tone":"urgent"}
  - **overlay enterAt:** 0.8s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/35-beat.html

### Step 5 — build-frame
beat 36: frame built [photo, kenburns=out]
  - **overlay:** chapter-title
  - **overlay params:** {"kicker":"NUMBER 12","text":"The Late Fee","tone":"neutral"}
  - **overlay enterAt:** 0.5s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/36-beat.html

### Step 5 — build-frame
beat 37: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-37-cutaway.mp4 @ 3.91s
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
  - **cutaway:** .media/broll/beat-40-cutaway.mp4 @ 4.12s
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
  - **overlay:** chapter-title
  - **overlay params:** {"kicker":"NUMBER 11","text":"The Deposit They're Holding","tone":"neutral"}
  - **overlay enterAt:** 1.6s
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
beat 47: frame built [video, kenburns=none]
  - **overlay:** key-phrase
  - **overlay params:** {"text":"It comes back when you ask","tone":"warm"}
  - **overlay enterAt:** 1.6s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/47-beat.html

### Step 5 — build-frame
beat 48: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/48-beat.html

### Step 5 — build-frame
beat 49: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-49-cutaway.mp4 @ 4.12s
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
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/51-beat.html

### Step 5 — build-frame
beat 52: frame built [video, kenburns=none]
  - **overlay:** chapter-title
  - **overlay params:** {"kicker":"NUMBER 10","text":"The Equipment Rental","tone":"neutral"}
  - **overlay enterAt:** 2.6s
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
beat 55: frame built [photo, kenburns=pan-left]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-55-cutaway.mp4 @ 4.01s
  - **parallax:** n/a
  - **out:** compositions/frames/55-beat.html

### Step 5 — build-frame
beat 56: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/56-beat.html

### Step 5 — build-frame
beat 57: frame built [video, kenburns=none]
  - **overlay:** key-phrase
  - **overlay params:** {"text":"bought it four or five times over","tone":"urgent"}
  - **overlay enterAt:** 3.4s
  - **cutaway:** .media/broll/beat-57-cutaway.mp4 @ 4.31s
  - **parallax:** n/a
  - **out:** compositions/frames/57-beat.html

### Step 5 — build-frame
beat 58: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-58-cutaway.mp4 @ 4.05s
  - **parallax:** n/a
  - **out:** compositions/frames/58-beat.html

### Step 5 — build-frame
beat 59: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/59-beat.html

### Step 5 — build-frame
beat 60: frame built [video, kenburns=none]
  - **overlay:** chapter-title
  - **overlay params:** {"kicker":"NUMBER 9","text":"The Franchise Fee","tone":"neutral"}
  - **overlay enterAt:** 0.6s
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
  - **cutaway:** .media/broll/beat-64-cutaway.mp4 @ 4.64s
  - **parallax:** n/a
  - **out:** compositions/frames/64-beat.html

### Step 5 — build-frame
beat 65: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/65-beat.html

### Step 5 — build-frame
beat 66: frame built [video, kenburns=none]
  - **overlay:** chapter-title
  - **overlay params:** {"kicker":"NUMBER 8","text":"State & Local Utility Tax","tone":"neutral"}
  - **overlay enterAt:** 0.5s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/66-beat.html

### Step 5 — build-frame
beat 67: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-67-cutaway.mp4 @ 4.58s
  - **parallax:** n/a
  - **out:** compositions/frames/67-beat.html

### Step 5 — build-frame
beat 68: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/68-beat.html

### Step 5 — build-frame
beat 69: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-69-cutaway.mp4 @ 4.21s
  - **parallax:** n/a
  - **out:** compositions/frames/69-beat.html

### Step 5 — build-frame
beat 70: frame built [video, kenburns=none]
  - **overlay:** key-phrase
  - **overlay params:** {"text":"Go where the money is","tone":"urgent"}
  - **overlay enterAt:** 0.9s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/70-beat.html

### Step 5 — build-frame
beat 71: frame built [video, kenburns=none]
  - **overlay:** chapter-title
  - **overlay params:** {"kicker":"NUMBER 7","text":"Energy Efficiency Surcharge","tone":"neutral"}
  - **overlay enterAt:** 0.4s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/71-beat.html

### Step 5 — build-frame
beat 72: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-72-cutaway.mp4 @ 3.76s
  - **parallax:** n/a
  - **out:** compositions/frames/72-beat.html

### Step 5 — build-frame
beat 73: frame built [photo, kenburns=pan-left]
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
  - **overlay:** list-reveal
  - **overlay params:** {"items":["Free home energy audits","Free insulation & weather stripping","Free LED replacements","Appliance rebates"],"tone":"warm"}
  - **overlay enterAt:** 0.5s
  - **cutaway:** .media/broll/beat-75-cutaway.mp4 @ 4.51s
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
  - **overlay:** chapter-title
  - **overlay params:** {"kicker":"NUMBER 6","text":"Storm Recovery","tone":"neutral"}
  - **overlay enterAt:** 1.8s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/78-beat.html

### Step 5 — build-frame
beat 79: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-79-cutaway.mp4 @ 5.4s
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
  - **overlay:** quote-card
  - **overlay params:** {"text":"A charge you understand stops costing you sleep, even when it doesn't stop costing you money.","tone":"solemn"}
  - **overlay enterAt:** 2.8s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/82-beat.html

### Step 5 — build-frame
beat 83: frame built [video, kenburns=none]
  - **overlay:** chapter-title
  - **overlay params:** {"kicker":"NUMBER 5","text":"The Fuel Adjustment","tone":"neutral"}
  - **overlay enterAt:** 0.4s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/83-beat.html

### Step 5 — build-frame
beat 84: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/84-beat.html

### Step 5 — build-frame
beat 85: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-85-cutaway.mp4 @ 4.37s
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
beat 87: frame built [video, kenburns=video-handheld-drift]
  - **overlay:** key-phrase
  - **overlay params:** {"text":"when you use power, not how much","emphasisWord":"when","tone":"cool"}
  - **overlay enterAt:** 1.2s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/87-beat.html

### Step 5 — build-frame
beat 88: frame built [video, kenburns=none]
  - **overlay:** chapter-title
  - **overlay params:** {"kicker":"NUMBER 4","text":"The Basic Service Charge","tone":"neutral"}
  - **overlay enterAt:** 1.8s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/88-beat.html

### Step 5 — build-frame
beat 89: frame built [photo, kenburns=out]
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
beat 92: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/92-beat.html

### Step 5 — build-frame
beat 93: frame built [photo, kenburns=in]
  - **overlay:** list-reveal
  - **overlay params:** {"items":["Standard residential","Time of use","Low income","Medical","All-electric home"],"tone":"cool"}
  - **overlay enterAt:** 0.4s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/93-beat.html

### Step 5 — build-frame
beat 94: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-94-cutaway.mp4 @ 4.53s
  - **parallax:** n/a
  - **out:** compositions/frames/94-beat.html

### Step 5 — build-frame
beat 95: frame built [video, kenburns=none]
  - **overlay:** chapter-title
  - **overlay params:** {"kicker":"NUMBER 3","text":"The Wrong Rate Class","tone":"warm"}
  - **overlay enterAt:** 1.4s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/95-beat.html

### Step 5 — build-frame
beat 96: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/96-beat.html

### Step 5 — build-frame
beat 97: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/97-beat.html

### Step 5 — build-frame
beat 98: frame built [video, kenburns=none]
  - **overlay:** typewriter
  - **overlay params:** {"text":"What rate class am I on? What else do I qualify for?","tone":"warm"}
  - **overlay enterAt:** 0.3s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/98-beat.html

### Step 5 — build-frame
beat 99: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/99-beat.html

### Step 5 — build-frame
beat 100: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/100-beat.html

### Step 5 — build-frame
beat 101: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-101-cutaway.mp4 @ 4.07s
  - **parallax:** n/a
  - **out:** compositions/frames/101-beat.html

### Step 5 — build-frame
beat 102: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-102-cutaway.mp4 @ 4.1s
  - **parallax:** n/a
  - **out:** compositions/frames/102-beat.html

### Step 5 — build-frame
beat 103: frame built [photo, kenburns=in]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-103-cutaway.mp4 @ 3.91s
  - **parallax:** n/a
  - **out:** compositions/frames/103-beat.html

### Step 5 — build-frame
beat 104: frame built [video, kenburns=none]
  - **overlay:** stat-callout
  - **overlay params:** {"value":60,"prefix":"$","label":"a month, for many households","placement":"center","tone":"warm"}
  - **overlay enterAt:** 0.6s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/104-beat.html

### Step 5 — build-frame
beat 105: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/105-beat.html

### Step 5 — build-frame
beat 106: frame built [video, kenburns=none]
  - **overlay:** chapter-title
  - **overlay params:** {"kicker":"NUMBER 2","text":"Peak Pricing","tone":"neutral"}
  - **overlay enterAt:** 0.4s
  - **cutaway:** .media/broll/beat-106-cutaway.mp4 @ 5.86s
  - **parallax:** n/a
  - **out:** compositions/frames/106-beat.html

### Step 5 — build-frame
beat 107: frame built [photo, kenburns=in]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/107-beat.html

### Step 5 — build-frame
beat 108: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/108-beat.html

### Step 5 — build-frame
beat 109: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/109-beat.html

### Step 5 — build-frame
beat 110: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-110-cutaway.mp4 @ 4.08s
  - **parallax:** n/a
  - **out:** compositions/frames/110-beat.html

### Step 5 — build-frame
beat 111: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/111-beat.html

### Step 5 — build-frame
beat 112: frame built [video, kenburns=none]
  - **overlay:** quote-card
  - **overlay params:** {"text":"It wasn't tradition. It was rate structure.","tone":"warm"}
  - **overlay enterAt:** 0.4s
  - **cutaway:** .media/broll/beat-112-cutaway.mp4 @ 5.28s
  - **parallax:** n/a
  - **out:** compositions/frames/112-beat.html

### Step 5 — build-frame
beat 113: frame built [video, kenburns=none]
  - **overlay:** chapter-title
  - **overlay params:** {"kicker":"NUMBER 1","text":"The Third-Party Supplier","tone":"urgent"}
  - **overlay enterAt:** 0.5s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/113-beat.html

### Step 5 — build-frame
beat 114: frame built [photo, kenburns=pan-left]
  - **overlay:** key-phrase
  - **overlay params:** {"text":"Look at the supply section","tone":"urgent"}
  - **overlay enterAt:** 2.4s
  - **cutaway:** .media/broll/beat-114-cutaway.mp4 @ 4.9s
  - **parallax:** n/a
  - **out:** compositions/frames/114-beat.html

### Step 5 — build-frame
beat 115: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-115-cutaway.mp4 @ 4.36s
  - **parallax:** n/a
  - **out:** compositions/frames/115-beat.html

### Step 5 — build-frame
beat 116: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-116-cutaway.mp4 @ 5.98s
  - **parallax:** n/a
  - **out:** compositions/frames/116-beat.html

### Step 5 — build-frame
beat 117: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/117-beat.html

### Step 5 — build-frame
beat 120: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-120-cutaway.mp4 @ 4.5s
  - **parallax:** n/a
  - **out:** compositions/frames/120-beat.html

### Step 5 — build-frame
beat 121: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/121-beat.html

### Step 5 — build-frame
beat 122: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/122-beat.html

### Step 5 — build-frame
beat 123: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/123-beat.html

### Step 5 — build-frame
beat 125: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-125-cutaway.mp4 @ 4.74s
  - **parallax:** n/a
  - **out:** compositions/frames/125-beat.html

### Step 5 — build-frame
beat 126: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/126-beat.html

### Step 5 — build-frame
beat 127: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/127-beat.html

### Step 5 — build-frame
beat 128: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/128-beat.html

### Step 5 — build-frame
beat 129: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-129-cutaway.mp4 @ 4.4s
  - **parallax:** n/a
  - **out:** compositions/frames/129-beat.html

### Step 5 — build-frame
beat 130: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/130-beat.html

### Step 5 — build-frame
beat 131: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/131-beat.html

### Step 5 — build-frame
beat 132: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/132-beat.html

### Step 5 — build-frame
beat 133: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/133-beat.html

### Step 5 — build-frame
beat 134: frame built [video, kenburns=none]
  - **overlay:** progress-badge
  - **overlay params:** {"step":1,"total":5,"label":"What rate class am I on?","tone":"cool"}
  - **overlay enterAt:** 0.3s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/134-beat.html

### Step 5 — build-frame
beat 135: frame built [video, kenburns=none]
  - **overlay:** progress-badge
  - **overlay params:** {"step":2,"total":5,"label":"Default supply or third-party?","tone":"cool"}
  - **overlay enterAt:** 0.3s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/135-beat.html

### Step 5 — build-frame
beat 136: frame built [video, kenburns=none]
  - **overlay:** progress-badge
  - **overlay params:** {"step":3,"total":5,"label":"Any rental, warranty, or opt-out fee?","tone":"cool"}
  - **overlay enterAt:** 0.3s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/136-beat.html

### Step 5 — build-frame
beat 137: frame built [video, kenburns=none]
  - **overlay:** progress-badge
  - **overlay params:** {"step":4,"total":5,"label":"Are you holding a deposit?","tone":"cool"}
  - **overlay enterAt:** 0.3s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/137-beat.html

### Step 5 — build-frame
beat 138: frame built [video, kenburns=video-push-in]
  - **overlay:** progress-badge
  - **overlay params:** {"step":5,"total":5,"label":"Can I move my due date?","tone":"cool"}
  - **overlay enterAt:** 0.3s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/138-beat.html

### Step 5 — build-frame
beat 139: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/139-beat.html

### Step 5 — build-frame
beat 140: frame built [video, kenburns=none]
  - **overlay:** quote-card
  - **overlay params:** {"text":"You're asking a company what it's charging you. That's the most ordinary question in the world.","tone":"warm"}
  - **overlay enterAt:** 0.5s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/140-beat.html

### Step 5 — build-frame
beat 141: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/141-beat.html

### Step 5 — build-frame
beat 142: frame built [video, kenburns=none]
  - **overlay:** key-phrase
  - **overlay params:** {"text":"Read the company name. Just the name.","tone":"urgent"}
  - **overlay enterAt:** 1s
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/142-beat.html

### Step 5 — build-frame
beat 143: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-143-cutaway.mp4 @ 5.18s
  - **parallax:** n/a
  - **out:** compositions/frames/143-beat.html

### Step 5 — build-frame
beat 144: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** .media/broll/beat-144-cutaway.mp4 @ 3.73s
  - **parallax:** n/a
  - **out:** compositions/frames/144-beat.html

### Step 5 — build-frame
beat 145: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/145-beat.html

### Step 5 — frame build (real bug caught here, worth reading)
- Built one build-frame.mjs call per beat straight from overlays.json (never a bulk generator that
  re-invents the flags — the skill warns that silently drops fields, and it nearly did here).
- BUG 1 (mine, caught by a post-build content check): --overlay-data REPLACES the flat --overlay-*
  flags rather than merging them. Any beat using --overlay-data was silently losing tone/label/placement.
- BUG 2 (mine, same check): overlays.mjs chapterTitle() destructures {kicker, text} — our overlays.json
  field is 'title'. All 14 chapter cards rendered with a kicker ('NUMBER 13') and a BLANK title.
  Also hit progress-badge labels and the typewriter (rendered completely empty).
  Fixed by routing every field through --overlay-data with names remapped to what overlays.mjs
  actually destructures, and hard-failing on any unrecognised field. Rebuilt all 142; re-verified.
- Post-build verification: 43/43 overlay beats confirmed to contain their own visible content.
  (Beat 98's typewriter reads as a false positive to a whole-word grep — it renders per-character
  spans; confirmed 53 char spans for a 52-char string + cursor.)
- 39 cutaways inserted on 6s+ beats (of 42 eligible; 3 declined for lack of a genuinely different
  on-topic second shot). Each recorded in its beat's own broll cache under 'cutaway' so CI replay
  can rebuild it — the skill flags an unrecorded cutaway as a confirmed CI-render failure.
- Tone-matched vignette: 0.42 on urgent/solemn beats, 0.3 on warm/cool, none on neutral.
- --motion-class static on beats 87 and 138 only (the 2 clips measured genuinely locked-off).
- 3 invented-scene frames built by sub-agents. The beat-118 worker found a REAL seek-safety bug:
  a naive gsap.to(counter,{onUpdate}) count-up renders FROZEN at its initial value under the
  renderer's cold frame-by-frame seek. All three frames had it. All three fixed (driven off a
  nested tween's own progress) and verified by cold-seeking to multiple timestamps.
  Without this the film's biggest stat ($50M / 278,000) would have shipped reading $0.

### verify-ci-parity
[object Object]
  - **problems:** []

### Step 5 — check-editorial-conflicts
22 conflict(s) found
  - **conflict types:** hard-cut-vs-slow-overlay, archetype-too-close, section-tone-mismatch

### Step 5 — check-editorial-conflicts
11 conflict(s) found
  - **conflict types:** archetype-too-close, section-tone-mismatch

### Step 5 — build-frame
beat 05: frame built [video, kenburns=none]
  - **overlay:** none
  - **overlay params:** n/a
  - **overlay enterAt:** n/a
  - **cutaway:** n/a
  - **parallax:** n/a
  - **out:** compositions/frames/05-beat.html

### Step 5 — verify-overlays
PASSED — 42/145 beats have an overlay
  - **archetype tally:** none:103, chapter-title:14, key-phrase:8, stat-callout:5, progress-badge:5, quote-card:4, list-reveal:3, icon-accent:1, typewriter:1, lower-third:1
  - **stat-callout placement:** 5/5 center
  - **dominant-archetype share:** 33%

### Step 5 — check-editorial-conflicts
10 conflict(s) found
  - **conflict types:** archetype-too-close, section-tone-mismatch

### Step 5 — editorial conflict scan: 22 flagged, every one decided
- 11x hard-cut-vs-slow-overlay (beats 05,14,26,29,35,71,83,95,104,113,140): REAL. Resolved per the
  skill's priority order (emotion/content first, rhythm second) — kept every overlay, gave each of
  those beats a transition with real duration instead. That introduced 4 new back-to-back repeats,
  which were then resolved too. Final: 0 back-to-back identical, 37 hard-cuts still in rotation.
- 9x archetype-too-close on progress-badge (beats 134-138): FALSE POSITIVE, dismissed with reason.
  progress-badge is explicitly a multi-beat archetype — it exists to be called once per step across
  consecutive beats ('STEP 1 OF 5' ... 'STEP 5 OF 5'). Consecutive calls are the intended usage,
  not a repeated device. These are the film's five scripted call questions.
- 1x archetype-too-close on stat-callout (beats 05,06): REAL. Beat 05's $214 is scene-setting, beat
  06's $30-60 is the film's thesis number one beat later. Dropped 05 (the weaker of the pair) rather
  than weakening the thesis beat. Density now 29.0%.
- 1x section-tone-mismatch ('the-honest-word', arc settling, beats 134-138+142): dismissed with reason.
  Those beats are the five call questions tagged 'cool' (analytical/instructional) and beat 142's
  closing instruction tagged 'urgent'. Tone is an EMOTIONAL axis; arc is a PACING axis — the skill's
  own overlays.md says these are deliberately different axes. A settling-paced section can correctly
  carry instructional-cool overlays. sections.json left as-is.

### Step 5 — remaining self-checks
- shot-size rhythm: rough read across the run. The countdown structure naturally alternates
  wide/establishing (utility infrastructure, houses, storms) against close detail (documents, meters,
  hands, faces) as each charge is named then explained. No run of 4+ same-size-feel beats found.
- motivated Ken Burns: 14 photo beats this run. --kenburns-focus was NOT passed on any of them —
  honest disclosure rather than a claimed pass: the photo beats that survived the video rebalance are
  overwhelmingly centered/symmetric subjects (document flat-lays, meter arrays, mailbox grids, an
  empty hallway), which is the genuine 'no clear off-center subject' case the flag is meant to skip.
  They keep the deterministic hashed Ken Burns rotation.

### Step 6 — slice-narration
145 beat(s) sliced (reference-only, no re-encode)
  - **narration:** assets/audio/narration.mp3
  - **audio-meta:** ./audio_meta.json

### Step 6 — heal-media-start
145 patched, 0 already correct, 0 had no mediaStart on record
  - **patched frame ids:** 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 7…(truncated)
  - **note:** assemble-index.mjs's own fix was missing this run — self-heal applied

### Step 6 — inject-cinematic-layers
mounted ambience bed + grain overlay
  - **ambience volume:** 0.05
  - **grain opacity:** 0.06
  - **ambience source:** .hyperframes/cinematic-assets/ambience-bed.mp3
  - **grain source:** .hyperframes/cinematic-assets/grain-overlay.mp4

## Step 6 — audio, assembly, gates
- slice-narration: 145 beats all reference the SAME untouched narration.mp3 with their own mediaStart.
  No physical cut, no per-beat re-encode, zero generation loss.
- heal-media-start: patched 145/145. assemble-index.mjs's own data-media-start emit had REVERTED
  (the confirmed skills-update regression the skill documents). Without this heal every beat would
  have played narration from second 0 — the 'same audio repeats the whole video' failure.
- transitions --registry: the shared faceless-explainer/scripts/transitions.mjs had ALSO reverted and
  lost its --registry flag. This mattered: 37 of our boundaries are 'hard-cut', which exists ONLY in
  documentary-broll's own registry — without the flag they'd have silently become blur-crossfades.
  Re-applied the patch (--registry passthrough in runInject), then confirmed all 37 hard-cuts resolved.
- LINT BUG (real, caught + fixed): 4 cutaway frames (15, 55, 103, 114) had the cutaway <video> nested
  inside a wrapper that ALSO carried data-start — the extractor resolves the video's start from its own
  data-start while visibility uses the wrapper's window, so those cutaways would have shown the wrong
  source frames then vanished mid-slot. Fixed per the linter's stated fix (untimed the wrapper; it is a
  CSS-positioned always-visible container and its Ken Burns is a GSAP tween, so nothing else changed).
- Cinematic layers: ambience bed (vol 0.05) + grain overlay (opacity 0.06) mounted at the real
  timeline duration 762.96s read off index.html's root, NOT beats.json's 773.8s.
- Sound design per user ('only logical, very few'): ambience bed ON, no transition whooshes,
  no overlay entrance cues, no BGM, no tension-kit cues, no deliberate-silence holds.
- Captions: OFF per user — captions.mjs was not run at all (not built-and-hidden).
- GATES: hyperframes lint 0 errors; hyperframes check PASSED (0 err, 0 warn, contrast 2/2 WCAG AA).
  verify-overlays exit 0; verify-ci-parity exit 0.

### verify-ci-parity
[object Object]
  - **problems:** []

### Chunked render — split
5 chunk(s) created
  - **chunks:** chunk-00: beats 01-31, ~41 sources | chunk-01: beats 32-64, ~41 sources | chunk-02: beats 65-97, ~40 sources | chunk-03: beats 98-130, ~42 sources | chunk-04: beats 131-145, ~17 sources

### Chunked render — split
5 chunk(s) created
  - **chunks:** chunk-00: beats 01-31, ~41 sources | chunk-01: beats 32-64, ~41 sources | chunk-02: beats 65-97, ~40 sources | chunk-03: beats 98-130, ~42 sources | chunk-04: beats 131-145, ~17 sources
