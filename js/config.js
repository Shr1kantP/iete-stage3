/**
 * ====================================================================
 * THE CURSE OF ELLIE - 3-STAGE HORROR JIGSAW HUNT CONFIGURATION
 * ====================================================================
 * All stage assets, grid dimensions, and reveal contents are defined here.
 * You can easily edit image paths, grid sizes, or clue texts below.
 */

const GAME_CONFIG = {
  // Global Countdown Timer (in seconds). 6 minutes = 360 seconds.
  countdownSeconds: 360,

  // Audio settings (synthesized atmospheric horror sound effects)
  audio: {
    enabledByDefault: false,
    snapSoundVolume: 0.35,
    ambientDroneVolume: 0.15
  },

  // Admin / Organizer settings
  organizer: {
    passcode: "1234", // Passcode for secret reset / stage jump
    enableCheatKeys: true // Shift + R = organizer menu
  },

  // 3 Horror Game Stages
  stages: [
    // ---------------------------------------------------------------
    // STAGE 1: Jigsaw -> Reveals Location of Hair & Porcelain Hand
    // ---------------------------------------------------------------
  /*   {
      id: 1,
      number: "1/3",
      title: "Stage I: Relics of the Binding",
      subtitle: "Reconstruct the archival sketch to unearth the hidden relics.",
      video: "asset/videos/jigsaw_2.mp4",
      puzzleImage: "assets/puzzles/stage2.jpg",
      fallbackImage: "images/hair_and_hand.jpg",
      grid: { rows: 3, cols: 3 },
      snapTolerance: 45,
      revealType: "clue_card",
      revealData: {
        tag: "EVIDENCE DOSSIER • FILE #01",
        title: "The Binding Relics",
        image: "images/hair_and_hand.jpg",
        relics: [
          {
            name: "The Lock of Hair",
            icon: "✦",
            location: "Sealed within a velvet-lined rosewood box, concealed on the third shelf behind the old staircase book rack.",
            description: "A dark braided strand collected during the binding ceremony of 1892. Stored cold to prevent resonance."
          },
          {
            name: "The Porcelain Hand",
            icon: "✋",
            location: "Enclosed inside the iron-latched locker beneath the basement stairs (Marked Locker 4).",
            description: "A cracked porcelain palm inscribed with warding glyphs. Once used to tether the wandering specter."
          }
        ],
        clueSummary: "CLUE #1: HAIR = Staircase bookshelf box | HAND = Basement locker #4.",
        huntInstruction: "Hunters: Note both physical locations. In the real-world search, both relics must be discovered before lighting the circle."
      }
    }, */

    // ---------------------------------------------------------------
    // STAGE 2: Jigsaw -> Reveals Candle Positions Layout Diagram
    // ---------------------------------------------------------------
    {
      id: 2,
      number: "2/3",
      title: "Stage II: The Circle of Flames",
      subtitle: "Assemble the arcane diagram to uncover the exact candle layout.",
      video: "asset/videos/jigsaw_3.mp4",
      puzzleImage: "assets/puzzles/stage3.jpg",
      fallbackImage: "images/candle_ritual.jpg",
      grid: { rows: 3, cols: 4 },
      snapTolerance: 42,
      revealType: "candles_diagram",
      revealData: {
        tag: "RITUAL BLUEPRINT • 5 FLAMES",
        title: "Warded Candle Positions",
        image: "images/candle_ritual.jpg",
        diagramTitle: "Pentagonal Ritual Formation",
        candles: [
          { id: 1, label: "I. North", role: "Apex Flame (Spirit)", pos: "Top Center (0°)", color: "#ff4500" },
          { id: 2, label: "II. East", role: "Air Ward", pos: "Right (72°)", color: "#ff5722" },
          { id: 3, label: "III. South-East", role: "Earth Anchor", pos: "Bottom Right (144°)", color: "#e64a19" },
          { id: 4, label: "IV. South-West", role: "Water Basin", pos: "Bottom Left (216°)", color: "#d84315" },
          { id: 5, label: "V. West", role: "Fire Core", pos: "Left (288°)", color: "#ff5722" }
        ],
        ritualRules: [
          "1. Light the North candle first at the stroke of the hour.",
          "2. Proceed clockwise: East -> South-East -> South-West -> West.",
          "3. All 5 flames must burn simultaneously with crimson-amber light.",
          "4. Place the Porcelain Hand in the center; drape the Hair across the North-West axis."
        ],
        clueSummary: "CLUE #2: 5 Red-flame candles arranged in a pentagram (North apex, clockwise rotation).",
        huntInstruction: "Hunters: Sketch this candle arrangement. Organizers will inspect the real-world candle circle for exact alignment."
      }
    },

    // ---------------------------------------------------------------
    // STAGE 3: Jigsaw -> Reveals Ghost's Actual Visage (Ellie)
    // ---------------------------------------------------------------
    {
      id: 3,
      number: "3/3",
      title: "Stage III: The Manifestation of Ellie",
      subtitle: "The final seal breaks. Assemble the visage to confront the truth.",
      video: "asset/videos/jigsaw_4.mp4",
      puzzleImage: "assets/puzzles/stage4.png",
      fallbackImage: "images/the-ghost.png",
      grid: { rows: 4, cols: 4 },
      snapTolerance: 40,
      revealType: "ghost_reveal",
      revealData: {
        tag: "PARANORMAL MANIFESTATION • SEAL BROKEN",
        title: "The True Face of Ellie",
        image: "images/the-ghost.png",
        ghostName: "ELLIE",
        story: "The veil tears apart with a crimson flash. Ellie appears before you—her pale visage wrapped in silent weeping and centuries of forgotten grief. The binding is fulfilled.",
        huntRecap: [
          { item: "Ghost Identity", value: "Ellie" },
          { item: "Relics Found", value: "Lock of Hair & Porcelain Hand" },
          { item: "Ritual Alignment", value: "5 Pentagonal Crimson Candles" },
          { item: "Final Encounter", value: "Visage Revealed & Documented" }
        ],
        clueSummary: "FINAL CLUE: The spirit is Ellie. Present all 3 gathered clues to the Game Master.",
        huntInstruction: "HURRY! Report to the hunt headquarters with your completed notebook containing all 3 clues!"
      }
    }
  ]
};

// Export for ES modules or browser global window
if (typeof module !== "undefined" && module.exports) {
  module.exports = GAME_CONFIG;
} else {
  window.GAME_CONFIG = GAME_CONFIG;
}
