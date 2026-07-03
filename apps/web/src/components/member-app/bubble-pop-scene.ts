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

const COLORS = [
  { fill: 0xff6b6b, glow: 0xff8e8e },
  { fill: 0x4ecdc4, glow: 0x7eddd6 },
  { fill: 0x45b7d1, glow: 0x78cde0 },
  { fill: 0xff9ff3, glow: 0xffbdf7 },
  { fill: 0xfeca57, glow: 0xfed97e },
  { fill: 0xa29bfe, glow: 0xbbb6fe },
];
const GOLD = { fill: 0xffe600, glow: 0xfff066 };
const GAME_DURATION = 35_000;
const COUNTDOWN = 3;

export function createBubblePopScene(
  game: Phaser.Game,
  seed: string,
  _config: Record<string, unknown> | null,
  callbacks: GameCallbacks,
) {
  class BubblePopScene extends Phaser.Scene {
    score = 0;
    combo = 0;
    maxCombo = 0;
    missed = 0;
    timeLeft = GAME_DURATION;
    rng!: () => number;
    spawnTimer = 0;
    gameOver = false;
    started = false;
    scoreText!: Phaser.GameObjects.Text;
    timerText!: Phaser.GameObjects.Text;
    comboText!: Phaser.GameObjects.Text;
    timerBar!: Phaser.GameObjects.Rectangle;
    timerBarBg!: Phaser.GameObjects.Rectangle;
    bubbleGroup!: Phaser.GameObjects.Group;
    w = 0;
    h = 0;

    constructor() {
      super({ key: 'BubblePopScene' });
    }

    create() {
      this.w = this.scale.width;
      this.h = this.scale.height;
      this.rng = seededRandom(seed);
      this.score = 0;
      this.combo = 0;
      this.maxCombo = 0;
      this.missed = 0;
      this.timeLeft = GAME_DURATION;
      this.gameOver = false;
      this.started = false;
      this.spawnTimer = 0;

      // Background gradient
      const bg = this.add.graphics();
      bg.fillGradientStyle(0x0a0a08, 0x0a0a08, 0x1a1915, 0x1a1915, 1);
      bg.fillRect(0, 0, this.w, this.h);
      bg.setDepth(-2);

      // Floating particles bg
      for (let i = 0; i < 20; i++) {
        const dot = this.add.circle(
          this.rng() * this.w,
          this.rng() * this.h,
          1 + this.rng() * 2,
          0xfaf8f2,
          0.08 + this.rng() * 0.06,
        );
        dot.setDepth(-1);
        this.tweens.add({
          targets: dot,
          y: dot.y - 30 - this.rng() * 40,
          alpha: 0,
          duration: 3000 + this.rng() * 4000,
          repeat: -1,
          yoyo: true,
        });
      }

      this.bubbleGroup = this.add.group();

      // Timer bar
      this.timerBarBg = this.add
        .rectangle(0, 0, this.w, 4, 0x2a2920)
        .setOrigin(0, 0)
        .setDepth(15);
      this.timerBar = this.add
        .rectangle(0, 0, this.w, 4, 0xffe600)
        .setOrigin(0, 0)
        .setDepth(16);

      // HUD
      this.scoreText = this.add
        .text(16, 14, '0', {
          fontSize: '22px',
          color: '#FAF8F2',
          fontFamily: 'system-ui, sans-serif',
          fontStyle: 'bold',
        })
        .setDepth(20);

      this.timerText = this.add
        .text(this.w - 16, 14, '35', {
          fontSize: '18px',
          color: '#FFE600',
          fontFamily: 'system-ui, sans-serif',
          fontStyle: 'bold',
        })
        .setOrigin(1, 0)
        .setDepth(20);

      this.comboText = this.add
        .text(this.w / 2, 14, '', {
          fontSize: '14px',
          color: '#FFE600',
          fontFamily: 'system-ui, sans-serif',
          fontStyle: 'bold',
        })
        .setOrigin(0.5, 0)
        .setDepth(20)
        .setAlpha(0);

      // Countdown
      this.showCountdown(COUNTDOWN);
    }

    showCountdown(n: number) {
      if (n <= 0) {
        this.started = true;
        const goText = this.add
          .text(this.w / 2, this.h / 2, 'GO!', {
            fontSize: '42px',
            color: '#FFE600',
            fontFamily: 'system-ui, sans-serif',
            fontStyle: 'bold',
          })
          .setOrigin(0.5)
          .setDepth(30);
        this.tweens.add({
          targets: goText,
          scale: 1.6,
          alpha: 0,
          duration: 500,
          onComplete: () => goText.destroy(),
        });
        return;
      }

      const text = this.add
        .text(this.w / 2, this.h / 2, String(n), {
          fontSize: '56px',
          color: '#FAF8F2',
          fontFamily: 'system-ui, sans-serif',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(30)
        .setScale(0.5)
        .setAlpha(0);

      this.tweens.add({
        targets: text,
        scale: 1,
        alpha: 1,
        duration: 300,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: text,
            scale: 1.3,
            alpha: 0,
            duration: 400,
            delay: 300,
            onComplete: () => {
              text.destroy();
              this.showCountdown(n - 1);
            },
          });
        },
      });
    }

    update(_time: number, delta: number) {
      if (this.gameOver || !this.started) return;

      this.timeLeft -= delta;
      const seconds = Math.max(0, Math.ceil(this.timeLeft / 1000));
      this.timerText.setText(String(seconds));
      this.timerBar.width = Math.max(0, (this.timeLeft / GAME_DURATION) * this.w);

      if (seconds <= 5) {
        this.timerText.setColor('#ff6b6b');
        this.timerBar.fillColor = 0xff6b6b;
      }

      if (this.timeLeft <= 0) {
        this.gameOver = true;
        this.endGame();
        return;
      }

      // Progressive difficulty
      const progress = 1 - this.timeLeft / GAME_DURATION;
      const baseRate = 700 - progress * 350;
      const comboBonus = Math.min(this.combo * 15, 200);
      const spawnRate = Math.max(180, baseRate - comboBonus);

      this.spawnTimer += delta;
      if (this.spawnTimer >= spawnRate) {
        this.spawnTimer = 0;
        this.spawnBubble(progress);
      }
    }

    spawnBubble(progress: number) {
      const baseRadius = 18 + this.rng() * 22;
      const radius = Math.max(14, baseRadius - progress * 8);
      const x = radius + this.rng() * (this.w - radius * 2);
      const colorData = COLORS[Math.floor(this.rng() * COLORS.length)];
      const isGold = this.rng() < 0.08;
      const col = isGold ? GOLD : colorData;

      // Outer glow
      const glow = this.add.circle(x, this.h + radius + 10, radius + 6, col.glow, 0.15);
      glow.setDepth(4);

      // Main bubble
      const circle = this.add.circle(x, this.h + radius + 10, radius, col.fill);
      circle.setDepth(5);
      circle.setInteractive({ useHandCursor: true });

      // Inner shine
      const shine = this.add.circle(
        x - radius * 0.25,
        this.h + radius + 10 - radius * 0.25,
        radius * 0.3,
        0xffffff,
        0.25,
      );
      shine.setDepth(6);

      if (isGold) {
        circle.setStrokeStyle(2, 0xfff8cc, 0.8);
        // Pulsing glow
        this.tweens.add({
          targets: glow,
          alpha: 0.3,
          duration: 400,
          yoyo: true,
          repeat: -1,
        });
      }

      const speed = 2200 + this.rng() * 1600 - progress * 600;
      const targetY = -radius - 20;

      // Rise animation
      this.tweens.add({
        targets: [circle, glow, shine],
        y: targetY,
        duration: Math.max(1200, speed),
        ease: 'Linear',
        onUpdate: () => {
          shine.x = circle.x - radius * 0.25;
          shine.y = circle.y - radius * 0.25;
          glow.x = circle.x;
          glow.y = circle.y;
        },
        onComplete: () => {
          this.missed++;
          if (this.combo > 0) {
            this.combo = 0;
            this.updateComboDisplay();
          }
          circle.destroy();
          glow.destroy();
          shine.destroy();
        },
      });

      // Sway
      this.tweens.add({
        targets: circle,
        x: x + (this.rng() - 0.5) * 50,
        duration: 800 + this.rng() * 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      circle.on('pointerdown', () => {
        if (this.gameOver) return;

        this.combo++;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;

        const multiplier = this.combo >= 10 ? 3 : this.combo >= 5 ? 2 : 1;
        const basePoints = isGold ? 5 : 1;
        const points = basePoints * multiplier;
        this.score += points;
        this.scoreText.setText(String(this.score));
        this.updateComboDisplay();

        // Pop particles
        const particleCount = isGold ? 12 : 6;
        for (let i = 0; i < particleCount; i++) {
          const angle = (Math.PI * 2 * i) / particleCount;
          const pSize = 2 + this.rng() * 3;
          const p = this.add.circle(circle.x, circle.y, pSize, col.fill);
          p.setDepth(8);
          this.tweens.add({
            targets: p,
            x: circle.x + Math.cos(angle) * (30 + this.rng() * 20),
            y: circle.y + Math.sin(angle) * (30 + this.rng() * 20),
            alpha: 0,
            scale: 0,
            duration: 300 + this.rng() * 200,
            onComplete: () => p.destroy(),
          });
        }

        // Score popup
        const label = multiplier > 1 ? `+${points} x${multiplier}` : `+${points}`;
        const popColor = isGold ? '#FFE600' : multiplier > 1 ? '#FFE600' : '#FAF8F2';
        const pop = this.add
          .text(circle.x, circle.y, label, {
            fontSize: multiplier > 1 ? '18px' : '15px',
            color: popColor,
            fontFamily: 'system-ui, sans-serif',
            fontStyle: 'bold',
          })
          .setOrigin(0.5)
          .setDepth(12);

        this.tweens.add({
          targets: pop,
          y: pop.y - 45,
          alpha: 0,
          duration: 700,
          ease: 'Cubic.easeOut',
          onComplete: () => pop.destroy(),
        });

        // Pop effect
        this.tweens.add({
          targets: circle,
          scale: 1.4,
          alpha: 0,
          duration: 120,
          onComplete: () => circle.destroy(),
        });
        this.tweens.add({ targets: glow, alpha: 0, duration: 120, onComplete: () => glow.destroy() });
        this.tweens.add({ targets: shine, alpha: 0, duration: 120, onComplete: () => shine.destroy() });

        // Screen shake on gold
        if (isGold) {
          this.cameras.main.shake(120, 0.005);
        }
      });
    }

    updateComboDisplay() {
      if (this.combo >= 3) {
        this.comboText.setText(`${this.combo}x COMBO`);
        this.comboText.setAlpha(1);
        this.comboText.setScale(0.8);
        this.tweens.add({
          targets: this.comboText,
          scale: 1,
          duration: 150,
          ease: 'Back.easeOut',
        });

        if (this.combo >= 10) this.comboText.setColor('#ff6b6b');
        else if (this.combo >= 5) this.comboText.setColor('#FFE600');
        else this.comboText.setColor('#4ecdc4');
      } else {
        this.tweens.add({
          targets: this.comboText,
          alpha: 0,
          duration: 200,
        });
      }
    }

    endGame() {
      // Freeze all bubbles
      this.tweens.killAll();

      const overlay = this.add
        .rectangle(this.w / 2, this.h / 2, this.w, this.h, 0x000000, 0)
        .setDepth(25);
      this.tweens.add({
        targets: overlay,
        fillAlpha: 0.7,
        duration: 400,
      });

      // Score reveal
      this.time.delayedCall(500, () => {
        const title = this.add
          .text(this.w / 2, this.h * 0.3, 'TIEMPO!', {
            fontSize: '20px',
            color: '#7A7770',
            fontFamily: 'system-ui, sans-serif',
            fontStyle: 'bold',
          })
          .setOrigin(0.5)
          .setDepth(30)
          .setAlpha(0);

        const scoreDisplay = this.add
          .text(this.w / 2, this.h * 0.42, String(this.score), {
            fontSize: '56px',
            color: '#FFE600',
            fontFamily: 'system-ui, sans-serif',
            fontStyle: 'bold',
          })
          .setOrigin(0.5)
          .setDepth(30)
          .setAlpha(0)
          .setScale(0.5);

        const statsText = this.add
          .text(
            this.w / 2,
            this.h * 0.55,
            `Combo max: ${this.maxCombo}x  ·  Escapadas: ${this.missed}`,
            {
              fontSize: '12px',
              color: '#7A7770',
              fontFamily: 'system-ui, sans-serif',
            },
          )
          .setOrigin(0.5)
          .setDepth(30)
          .setAlpha(0);

        this.tweens.add({ targets: title, alpha: 1, duration: 300 });
        this.tweens.add({
          targets: scoreDisplay,
          alpha: 1,
          scale: 1,
          duration: 500,
          delay: 200,
          ease: 'Back.easeOut',
        });
        this.tweens.add({
          targets: statsText,
          alpha: 1,
          duration: 300,
          delay: 600,
        });
      });

      this.time.delayedCall(2200, () => {
        callbacks.onFinish(this.score);
      });
    }
  }

  game.scene.add('BubblePopScene', BubblePopScene, true);
}
