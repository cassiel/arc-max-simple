var RINGS = 4;                  // Rings on the arc.
var BANKS = 16;                 // Banks of <RINGS> controls.
var LEDS = 64;

var PREFIX = "/arc_4";

function now() {
    return new Date().getTime();
}
now.local = 1;

var PUNCH_DELAY = 1000;         // Time before punching out.
var FLASH_TIME = 300;           /* There will be some value interaction here: when a knob is being
                                   turned we need the flash calculation to turn the LEDs on. */

var LEVEL_FULL = 15;
var LEVEL_DIM = 3;
var LEVEL_OFF = 0;

function Bank() {
    this.values = [ ];
    this.punchOutTimestamps = [ ];
    for (var i = 0; i < RINGS; i++) {
        this.values.push(0);  // MIDI control value, 0..127 incl.
        this.punchOutTimestamps.push(0);
        /* Use 0 here to mark as inactive (punched out); otherwise
           we can't sense the transition. */
    }
}
Bank.local = 1;

function BankSet() {
    this.banks = [ ];
    for (var i = 0; i < BANKS; i++) {
        this.banks.push(new Bank());
    }
}
BankSet.local = 1;

var STATE = {
    dict: new Dict("X"),
    bankSet: new BankSet(),
    currentBank: 0
};

function chanOfBank(bankNum) {
    return bankNum + 1;         // 1..16.
}
chanOfBank.local = 1;

function ctrlOfRing(ringNum) {
    return 20 + ringNum;
}
ctrlOfRing.local = 1;

/*  Output message to light LEDs according to MIDI value.
    A little tricky due to the range parameters (which are inclusive but
    can't be N-1..N), and the fact that we'd like a single LED lit even for value 0.

    0 -> all off except one LED, half-bright.
    N -> range 0 to floor(N / 2) [ 1 -> 0, 2 -> 1, 3 -> 1, ... 127 -> 63]. */

function ledsFromMIDIValue(ringIndex, midiValue, level) {
        if (midiValue == 0) {
        // All off:
        //outlet(0, "arc", PREFIX + "/ring/all", ringIndex, 0);
        outlet(0, "arc", PREFIX + "/ring/range", ringIndex, 1, 63, 0);
        outlet(0, "arc", PREFIX + "/ring/range", ringIndex, 0, 0, 8);
    } else if (midiValue >= 126) {
        // Tricky edge cases...
        outlet(0, "arc", PREFIX + "/ring/all", ringIndex, level);
    } else {
        var topLED = Math.floor(midiValue / 2);
        outlet(0, "arc", PREFIX + "/ring/range", ringIndex, 0, topLED, level);
        outlet(0, "arc", PREFIX + "/ring/range", ringIndex, topLED + 1, LEDS - 1, 0);
    }
}
ledsFromMIDIValue.local = 1;

function out_bank(bankNum, force) {
    var bank = STATE.bankSet.banks[bankNum];

    for (var i = 0; i < RINGS; i++) {
        out = bank.punchOutTimestamps[i];

        if (out == 0 && force == false) {         // Nothing to do, unless we force an update:

        } else if (out > now()) {   // Still punched in.
            /* TODO Not ideal: this outputs every call. So let's exploit that
               and animate it a bit. */
            var timeLeft = out - now();
            var on = (timeLeft % FLASH_TIME) < (FLASH_TIME / 2);
            ledsFromMIDIValue(i, bank.values[i], (on ? LEVEL_FULL : LEVEL_OFF));
        } else {                // Punch out!
            ledsFromMIDIValue(i, bank.values[i], LEVEL_DIM);
            bank.punchOutTimestamps[i] = 0;
        }
    }
}
out_bank.local = 1;

/*  Delta value from ring. Nudge and store the MIDI value,
    output for MIDI message, refresh LED. */

function delta(ring, d) {
    var bank = STATE.bankSet.banks[STATE.currentBank];
    var oldVal = bank.values[ring];
    var newVal = Math.min(127, Math.max(0, oldVal + d));
    bank.values[ring] = newVal;
    bank.punchOutTimestamps[ring] = now() + PUNCH_DELAY;

    // Outlet ctrl message in Max order (val, ctrl. chan):
    outlet(0, "display", chanOfBank(STATE.currentBank), "ctrl", newVal, ctrlOfRing(ring));

    // Slight overkill, but we manage punch-out here:
    out_bank(STATE.currentBank, true);
}

function highlight(bankNum) {
    var chan = chanOfBank(bankNum);
    outlet(0, "display", "ALL", "highlight", 0);
    outlet(0, "display", chan, "highlight", 1);
}
highlight.local = 1;

function nudge_bank_by(d) {
    var bankNum = STATE.currentBank;
    bankNum = Math.min(BANKS - 1, Math.max(0, bankNum + d));
    STATE.currentBank = bankNum;

    var bank = STATE.bankSet.banks[bankNum];
    post("bankNum: " + bankNum + " bank: " + bank + "\n");

    highlight(bankNum);
    out_bank(bankNum, true);
}

function nudge_bank_to(b) {     // b: 1..16
    b = b - 1;
    b = Math.min(BANKS - 1, Math.max(0, b));

    var bankNum = STATE.currentBank;
    STATE.currentBank = b;

    var bank = STATE.bankSet.banks[b];

    highlight(b);
    out_bank(b, true);
}

/* Ticks: 0..479 inclusive (per quarter note?), though perhaps
   at a slow rate which omits some values.
   NOTE: not usable - where's SHADO when you need it? */

function transport_units(n) {
    var ledsRotation = Math.min(Math.round(n / 30), 15);      // Not perfect: no Math.trunc?
    var ringIndex = 0;

    ledsFromMIDIValue(ringIndex, STATE.bankSet.banks[STATE.currentBank].values[0], false);

    for (var pos = 0; pos < 4; pos++) {
        var ledIndex = pos * 16 + ledsRotation;
        outlet(0, "arc", PREFIX + "/ring/range", ringIndex, ledIndex, ledIndex, 7);
    }
}

/* Generic heartbeat ping for any kind of animation. For actual timings,
   use Javascript date. */

function ping() {
    out_bank(STATE.currentBank, false);
}

post(Date() + "\n");
