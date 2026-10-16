# The Curse of Ellie - 4-Stage Horror Mystery Jigsaw Game

A 4-stage sequential horror mystery jigsaw game designed for live treasure hunts. Players piece together arcane jigsaw fragments across four seals to uncover essential real-world clues.

---

## 🕯️ Game Flow & Clues

- **Stage I: The Whisper in the Walls**
  - **Puzzle:** 3x3 fragment grid.
  - **Reveal:** An aged handwritten paper letter with antique ink and wax seal styling.
  - **Key Clue:** The spirit's true name is **ELLIE** (clearly highlighted and legible for all players).

- **Stage II: Relics of the Binding**
  - **Puzzle:** 3x3 fragment grid.
  - **Reveal:** Classified evidence dossier card.
  - **Key Clue:** Exact locations for the **Lock of Hair** (hidden behind staircase bookshelf) and the **Porcelain Hand** (basement locker #4).

- **Stage III: The Circle of Flames**
  - **Puzzle:** 3x4 fragment grid.
  - **Reveal:** Candle positions layout diagram with 5 warm red-orange flickering flames (Pentagram alignment).
  - **Key Clue:** Clockwise ritual sequence: North (Spirit) → East (Air) → South-East (Earth) → South-West (Water) → West (Fire).

- **Stage IV: The Manifestation of Ellie**
  - **Puzzle:** 4x4 fragment grid.
  - **Reveal:** Screen-shaking red flash and slow eerie fade-in of Ellie's actual spectral visage with a pulsing crimson aura, concluding with the complete hunt recap.

---

## 🚀 How to Run

You can run the web game locally using Python's built-in HTTP server or any static server:

```bash
# In the project directory:
python -m http.server 8080
```

Then open your browser on desktop or mobile:
```
http://localhost:8080
```
*(Or `http://<your-ip>:8080` to play on phones connected to the same Wi-Fi network!)*

---

## 🎨 Theme & Config Customization

All colors, stage images, grid sizes, and clue contents are consolidated in two easy-to-edit files:

1. **`js/config.js`**:
   - Change puzzle images, grid dimensions (`rows`, `cols`), snap tolerance.
   - Edit reveal text (letter text, relic locations, candle coordinates, ghost lore).
   - Change organizer passcode (default: `1234`).
   - Configure background video source paths.

2. **`css/style.css`**:
   - Central CSS variables defined at `:root`:
     ```css
     :root {
       --bg: #0a0102;
       --bg-soft: #1a0305;
       --blood: #8b0000;
       --crimson: #b01018;
       --glow: #ff2a2a;
       --paper: #e8d5b5;
       --text: #f3e3dc;
     }
     ```

---

## ⚙️ Organizer Secrets & Shortcuts

- **Reset / Jump Menu**: Click the skull icon (`💀`) in the top right header, or press **`Shift + R`** on desktop.
- **Passcode**: Enter `1234` to reset all player progress or jump directly to any stage for testing and event coordination.
- **Persistence**: Player progress is saved in `localStorage`, so accidental page refreshes never reset their current stage.
