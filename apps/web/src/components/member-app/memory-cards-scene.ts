import Phaser from 'phaser';
import type { GameCallbacks } from './game-canvas';

function seededRandom(seedStr: string) {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = (Math.imul(31, h) + seedStr.charCodeAt(i)) | 0;
  }
  return () => {
    h = (h ^ (h >>> 16)) * 0x45d9f3b;
    h = (h ^ (h >>> 16)) * 0x45d9f3b;
    h = h ^ (h >>> 16);
    return (h >>> 0) / 4294967296;
  };
}

const SYMBOLS = ['★', '♦', '♠', '♥', '♣', '●', '▲', '■'];
const SYMBOL_COLORS = [
  '#FFE600', '#FF6B6B', '#4ECDC4', '#45B7D1',
  '#FF9FF3', '#FECA57', '#A29BFE', '#6C5CE7',
];
const GAME_DURATION = 60_000;
const COLS = 4;
const ROWS = 4;
const PAIRS = (COLS * ROWS) / 2;
const COUNTDOWN = 3;

interface Card {
  idx: number;
  sym: number;
  flipped: boolean;
  matched: boolean;
  bg: Phaser.GameObjects.Rectangle;
  face: Phaser.GameObjects.Text;
  cover: Phaser.GameObjects.Rectangle;
  coverIcon: Phaser.GameObjects.Text;
  glow: Phaser.GameObjects.Rectangle;
  cx: number;
  cy: number;
}

export function createMemoryCardsScene(
  game: Phaser.Game,
  seed: string,
  _config: Record<string, unknown> | null,
  callbacks: GameCallbacks,
) {
  class MemoryScene extends Phaser.Scene {
    rng!: () => number;
    cards: Card[] = [];
    revealed: Card[] = [];
    matches = 0;
    moves = 0;
    streak = 0;
    maxStreak = 0;
    timeLeft = GAME_DURATION;
    canFlip = true;
    gameOver = false;
    started = false;
    scoreText!: Phaser.GameObjects.Text;
    timerText!: Phaser.GameObjects.Text;
    movesText!: Phaser.GameObjects.Text;
    streakText!: Phaser.GameObjects.Text;
    timerBar!: Phaser.GameObjects.Rectangle;
    w = 0;
    h = 0;

    constructor() {
      super({ key: 'MemoryCardsScene' });
    }

    create() {
      this.w = this.scale.width;
      this.h = this.scale.height;
      this.rng = seededRandom(seed);
      this.matches = 0;
      this.moves = 0;
      this.streak = 0;
      this.maxStreak = 0;
      this.timeLeft = GAME_DURATION;
      this.gameOver = false;
      this.started = false;
      this.canFlip = true;
      this.revealed = [];
      this.cards = [];

      // Background
      const bg = this.add.graphics();
      bg.fillGradientStyle(0x0a0a08, 0x0a0a08, 0x1a1915, 0x1a1915, 1);
      bg.fillRect(0, 0, this.w, this.h);
      bg.setDepth(-2);

      // Timer bar
      this.add.rectangle(0, 0, this.w, 4, 0x2a2920).setOrigin(0, 0).setDepth(15);
      this.timerBar = this.add.rectangle(0, 0, this.w, 4, 0x4ecdc4).setOrigin(0, 0).setDepth(16);

      // HUD
      const hud = 14;
      this.scoreText = this.add
        .text(16, hud, `0/${PAIRS}`, {
          fontSize: '16px', color: '#FAF8F2',
          fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
        }).setDepth(20);

      this.timerText = this.add
        .text(this.w - 16, hud, '60', {
          fontSize: '16px', color: '#4ECDC4',
          fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
        }).setOrigin(1, 0).setDepth(20);

      this.movesText = this.add
        .text(this.w / 2, hud, '0 mov', {
          fontSize: '11px', color: '#7A7770',
          fontFamily: 'system-ui, sans-serif',
        }).setOrigin(0.5, 0).setDepth(20);

      this.streakText = this.add
        .text(this.w / 2, hud + 18, '', {
          fontSize: '12px', color: '#FFE600',
          fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
        }).setOrigin(0.5, 0).setDepth(20).setAlpha(0);

      // Build cards
      const syms: number[] = [];
      for (let i = 0; i < PAIRS; i++) syms.push(i, i);
      for (let i = syms.length - 1; i > 0; i--) {
        const j = Math.floor(this.rng() * (i + 1));
        [syms[i], syms[j]] = [syms[j], syms[i]];
      }

      const pad = 10;
      const top = 52;
      const cw = (this.w - pad * (COLS + 1)) / COLS;
      const ch = (this.h - top - pad * (ROWS + 1) - 8) / ROWS;
      const r = Math.min(cw, ch) * 0.12;

      syms.forEach((sym, idx) => {
        const col = idx % COLS;
        const row = Math.floor(idx / COLS);
        const cx = pad + col * (cw + pad) + cw / 2;
        const cy = top + pad + row * (ch + pad) + ch / 2;

        // Glow (hidden until matched)
        const glow = this.add
          .rectangle(cx, cy, cw + 4, ch + 4, 0xffe600, 0)
          .setDepth(0);

        // Card background
        const bgRect = this.add
          .rectangle(cx, cy, cw, ch, 0x1e1d18)
          .setStrokeStyle(1.5, 0x3a3930)
          .setDepth(1);

        // Round corners visual
        bgRect.setData('r', r);

        // Symbol face (hidden)
        const face = this.add
          .text(cx, cy, SYMBOLS[sym % SYMBOLS.length], {
            fontSize: `${Math.min(cw, ch) * 0.45}px`,
            color: SYMBOL_COLORS[sym % SYMBOL_COLORS.length],
            fontFamily: 'system-ui, sans-serif',
          })
          .setOrigin(0.5)
          .setDepth(2)
          .setAlpha(0);

        // Cover
        const cover = this.add
          .rectangle(cx, cy, cw, ch, 0x2a2920)
          .setStrokeStyle(1.5, 0xffe600, 0.2)
          .setDepth(3)
          .setInteractive({ useHandCursor: true });

        // Cover icon (Q logo)
        const coverIcon = this.add
          .text(cx, cy, 'Q', {
            fontSize: `${Math.min(cw, ch) * 0.3}px`,
            color: '#FFE600',
            fontFamily: 'system-ui, sans-serif',
            fontStyle: 'bold',
          })
          .setOrigin(0.5)
          .setDepth(4)
          .setAlpha(0.25);

        const card: Card = {
          idx, sym, flipped: false, matched: false,
          bg: bgRect, face, cover, coverIcon, glow, cx, cy,
        };

        cover.on('pointerdown', () => this.flipCard(card));
        cover.on('pointerover', () => {
          if (!card.matched && !card.flipped && this.canFlip) {
            cover.setStrokeStyle(1.5, 0xffe600, 0.5);
          }
        });
        cover.on('pointerout', () => {
          if (!card.matched && !card.flipped) {
            cover.setStrokeStyle(1.5, 0xffe600, 0.2);
          }
        });

        this.cards.push(card);
      });

      // Brief reveal
      this.time.delayedCall(400, () => {
        this.cards.forEach((c) => {
          c.face.setAlpha(1);
          c.cover.setAlpha(0);
          c.coverIcon.setAlpha(0);
        });
        this.time.delayedCall(1500, () => {
          this.cards.forEach((c) => {
            if (!c.matched) {
              c.face.setAlpha(0);
              c.cover.setAlpha(1);
              c.coverIcon.setAlpha(0.25);
            }
          });
          this.showCountdown(COUNTDOWN);
        });
      });
    }

    showCountdown(n: number) {
      if (n <= 0) {
        this.started = true;
        return;
      }
      const t = this.add
        .text(this.w / 2, this.h / 2, String(n), {
          fontSize: '48px', color: '#FAF8F2',
          fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
        })
        .setOrigin(0.5).setDepth(30).setAlpha(0).setScale(0.5);

      this.tweens.add({
        targets: t, scale: 1, alpha: 1, duration: 250, ease: 'Back.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: t, scale: 1.3, alpha: 0, duration: 350, delay: 250,
            onComplete: () => { t.destroy(); this.showCountdown(n - 1); },
          });
        },
      });
    }

    update(_time: number, delta: number) {
      if (this.gameOver || !this.started) return;
      this.timeLeft -= delta;
      const s = Math.max(0, Math.ceil(this.timeLeft / 1000));
      this.timerText.setText(String(s));
      this.timerBar.width = Math.max(0, (this.timeLeft / GAME_DURATION) * this.w);

      if (s <= 10) {
        this.timerText.setColor('#ff6b6b');
        this.timerBar.fillColor = 0xff6b6b;
      }

      if (this.timeLeft <= 0) {
        this.gameOver = true;
        this.endGame();
      }
    }

    flipCard(card: Card) {
      if (this.gameOver || !this.started || !this.canFlip || card.flipped || card.matched) return;

      card.flipped = true;

      // Flip animation
      this.tweens.add({
        targets: [card.cover, card.coverIcon],
        scaleX: 0,
        duration: 120,
        onComplete: () => {
          card.cover.setVisible(false);
          card.coverIcon.setVisible(false);
          card.face.setAlpha(1);
          card.face.setScale(0, 1);
          this.tweens.add({
            targets: card.face,
            scaleX: 1,
            duration: 120,
          });
        },
      });

      // Subtle bounce
      this.tweens.add({
        targets: card.bg,
        scaleX: 1.05, scaleY: 1.05,
        duration: 100, yoyo: true,
      });

      this.revealed.push(card);

      if (this.revealed.length === 2) {
        this.moves++;
        this.movesText.setText(`${this.moves} mov`);
        this.canFlip = false;

        const [a, b] = this.revealed;
        if (a.sym === b.sym) {
          // Match!
          a.matched = true;
          b.matched = true;
          this.matches++;
          this.streak++;
          if (this.streak > this.maxStreak) this.maxStreak = this.streak;
          this.scoreText.setText(`${this.matches}/${PAIRS}`);

          // Streak display
          if (this.streak >= 2) {
            this.streakText.setText(`${this.streak}x racha!`);
            this.streakText.setAlpha(1);
            this.tweens.add({
              targets: this.streakText,
              scale: 1.15, duration: 150, yoyo: true,
            });
          }

          // Match effects
          [a, b].forEach((c) => {
            // Glow pulse
            this.tweens.add({
              targets: c.glow,
              fillAlpha: 0.15,
              duration: 300,
            });
            c.bg.setStrokeStyle(2, 0xffe600);
            c.face.setAlpha(0.7);

            // Particles
            for (let i = 0; i < 6; i++) {
              const angle = (Math.PI * 2 * i) / 6;
              const p = this.add.circle(c.cx, c.cy, 3, 0xffe600);
              p.setDepth(10);
              this.tweens.add({
                targets: p,
                x: c.cx + Math.cos(angle) * 35,
                y: c.cy + Math.sin(angle) * 35,
                alpha: 0, scale: 0,
                duration: 400,
                onComplete: () => p.destroy(),
              });
            }
          });

          this.revealed = [];
          this.canFlip = true;

          if (this.matches === PAIRS) {
            this.gameOver = true;
            this.time.delayedCall(600, () => this.endGame());
          }
        } else {
          // No match
          this.streak = 0;
          this.tweens.add({ targets: this.streakText, alpha: 0, duration: 200 });

          // Shake wrong cards
          [a, b].forEach((c) => {
            this.tweens.add({
              targets: c.bg,
              x: c.cx - 4, duration: 50, yoyo: true, repeat: 2,
              onComplete: () => { c.bg.x = c.cx; },
            });
          });

          this.time.delayedCall(700, () => {
            [a, b].forEach((c) => {
              c.flipped = false;
              // Flip back
              this.tweens.add({
                targets: c.face,
                scaleX: 0, duration: 100,
                onComplete: () => {
                  c.face.setAlpha(0);
                  c.face.setScale(1, 1);
                  c.cover.setVisible(true);
                  c.cover.setScale(0, 1);
                  c.coverIcon.setVisible(true);
                  c.coverIcon.setAlpha(0);
                  this.tweens.add({
                    targets: c.cover, scaleX: 1, duration: 100,
                    onComplete: () => {
                      c.coverIcon.setAlpha(0.25);
                    },
                  });
                },
              });
            });
            this.revealed = [];
            this.canFlip = true;
          });
        }
      }
    }

    endGame() {
      this.canFlip = false;
      const elapsed = GAME_DURATION - Math.max(0, this.timeLeft);
      const timeBonus = Math.max(0, Math.floor((GAME_DURATION - elapsed) / 1000));
      const matchScore = this.matches * 12;
      const efficiency = this.moves > 0 ? Math.floor((PAIRS / this.moves) * 25) : 0;
      const streakBonus = this.maxStreak * 5;
      const perfect = this.matches === PAIRS;
      const score = matchScore + timeBonus + efficiency + streakBonus + (perfect ? 30 : 0);

      const overlay = this.add
        .rectangle(this.w / 2, this.h / 2, this.w, this.h, 0x000000, 0)
        .setDepth(25);
      this.tweens.add({ targets: overlay, fillAlpha: 0.75, duration: 400 });

      this.time.delayedCall(500, () => {
        const title = this.add
          .text(this.w / 2, this.h * 0.25, perfect ? 'PERFECTO!' : 'TIEMPO!', {
            fontSize: '20px',
            color: perfect ? '#FFE600' : '#7A7770',
            fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
          }).setOrigin(0.5).setDepth(30).setAlpha(0);

        const scoreNum = this.add
          .text(this.w / 2, this.h * 0.38, String(score), {
            fontSize: '52px', color: '#FFE600',
            fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
          }).setOrigin(0.5).setDepth(30).setAlpha(0).setScale(0.5);

        const details = [
          `${this.matches}/${PAIRS} parejas`,
          `${this.moves} movimientos`,
          `Racha max: ${this.maxStreak}`,
          perfect ? '+30 bonus perfecto' : '',
        ].filter(Boolean).join('  ·  ');

        const statsText = this.add
          .text(this.w / 2, this.h * 0.52, details, {
            fontSize: '10px', color: '#7A7770',
            fontFamily: 'system-ui, sans-serif',
            align: 'center', wordWrap: { width: this.w - 40 },
          }).setOrigin(0.5).setDepth(30).setAlpha(0);

        this.tweens.add({ targets: title, alpha: 1, duration: 300 });
        this.tweens.add({
          targets: scoreNum, alpha: 1, scale: 1,
          duration: 500, delay: 200, ease: 'Back.easeOut',
        });
        this.tweens.add({ targets: statsText, alpha: 1, duration: 300, delay: 600 });
      });

      this.time.delayedCall(2500, () => callbacks.onFinish(score));
    }
  }

  game.scene.add('MemoryCardsScene', MemoryScene, true);
}
