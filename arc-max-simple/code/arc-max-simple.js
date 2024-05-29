var RINGS = 4;                  // Rings on the arc.
var BANKS = 16;                 // Banks of <RINGS> controls.
var LEDS = 64;

var PREFIX = "/arc_4";

function Bank() {
    this.values = [ ];
    for (var i = 0; i < RINGS; i++) {
        this.values.push(0);  // MIDI control value, 0..127 incl.
    }
}

function BankSet() {
    this.banks = [ ];
    for (var i = 0; i < BANKS; i++) {
        this.banks.push(new Bank());
    }
}

var STATE = {
    dict: new Dict("X"),
    bankSet: new BankSet(),
    currentBank: 0
};

function chanOfBank(bankNum) {
    return bankNum + 1;         // 1..16.
}

function ctrlOfRing(ringNum) {
    return 20 + ringNum;
}

/*  Output message to light LEDs according to MIDI value.
    A little tricky due to the range parameters (which are inclusive but
    can't be N-1..N), and the fact that we'd like a single LED lit even for value 0.

    0 -> all off except one LED, half-bright.
    N -> range 0 to floor(N / 2) [ 1 -> 0, 2 -> 1, 3 -> 1, ... 127 -> 63]. */

function ledsFromMIDIValue(ringIndex, midiValue) {
    if (midiValue == 0) {
        // All off:
        //outlet(0, "arc", PREFIX + "/ring/all", ringIndex, 0);
        outlet(0, "arc", PREFIX + "/ring/range", ringIndex, 1, 63, 0);
        outlet(0, "arc", PREFIX + "/ring/range", ringIndex, 0, 0, 8);
    } else if (midiValue >= 126) {
        // Tricky edge cases...
        outlet(0, "arc", PREFIX + "/ring/all", ringIndex, 15);
    } else {
        var topLED = Math.floor(midiValue / 2);
        outlet(0, "arc", PREFIX + "/ring/range", ringIndex, 0, topLED, 15);
        outlet(0, "arc", PREFIX + "/ring/range", ringIndex, topLED + 1, LEDS - 1, 0);
    }
}

/*  Delta value from ring. Nudge and store the MIDI value,
    output for MIDI message, refresh LED. */

function delta(ring, d) {
    var bank = STATE.bankSet.banks[STATE.currentBank];
    var oldVal = bank.values[ring];
    var newVal = Math.min(127, Math.max(0, oldVal + d));
    bank.values[ring] = newVal;

    // Outlet ctrl message in Max order (val, ctrl. chan):
    outlet(0, "ctrl", newVal, ctrlOfRing(ring), chanOfBank(STATE.currentBank));

    ledsFromMIDIValue(ring, newVal);
    displayInDict();
}

/*  Keyboard nudge for bank select. Change bank, update all rings. */

function nudge_bank(d) {
    var bankNum = STATE.currentBank;
    bankNum = Math.min(BANKS - 1, Math.max(0, bankNum + d));
    STATE.currentBank = bankNum;

    var bank = STATE.bankSet.banks[bankNum];
    post("bankNum: " + bankNum + " bank: " + bank + "\n");

    for (var i = 0; i < RINGS; i++) {
        ledsFromMIDIValue(i, bank.values[i]);
    }
}

function displayInDict() {
    STATE.dict.parse(JSON.stringify(STATE));
}

displayInDict();
post(Date() + "\n");
