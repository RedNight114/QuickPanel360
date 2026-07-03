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

const TARGET_COLORS = [0xffe600, 0x4ecdc4, 0x45b7d1, 0xff9ff3, 0xa29bfe];
const DECOY_COLOR = 0xff6b6b;
const TOTAL_ROUNDS = 20;
const COUNTDOWN = 3;

export function createReactionTapScene(
  game: Phaser.Game,
  seed: string,
  _config: Record<string, unknown> | null,
  callbacks: GameCallbacks,
) {
  class ReactionScene extends Phaser.Scene {
    rng!: () => number;
    round = 0;
    score = 0;
    hits = 0;
    misses = 0;
    reactionTimes: number[] = [];
    gameOver = false;
    started = false;
    waiting = false;
    targetActive = false;
    spawnTime = 0;
    currentTarget: Phaser.GameObjects.Arc | null = null;
    currentGlow: Phaser.GameObjects.Arc | null = null;
    currentRing: Phaser.GameObjects.Arc | null = null;
    shrinkTween: Phaser.Tweens.Tween | null = null;
    roundText!: Phaser.GameObjects.Text;
    scoreText!: Phaser.GameObjects.Text;
    feedbackText!: Phaser.GameObjects.Text;
    instructionText!: Phaser.GameObjects.Text;
    progressDots: Phaser.GameObjects.Arc[] = [];
    w = 0;
    h = 0;

    constructor() {
      super({ key: 'ReactionTapScene' });
    }

    create() {
      this.w = this.scale.width;
      this.h = this.scale.height;
      this.rng = seededRandom(seed);
      this.round = 0;
      this.score = 0;
      this.hits = 0;
      this.misses = 0;
      this.reactionTimes = [];
      this.gameOver = false;
      this.started = false;
      this.waiting = false;
      this.targetActive = false;

      // Background
      const bg = this.add.graphics();
      bg.fillGradientStyle(0x0a0a08, 0x0a0a08, 0x1a1915, 0x1a1915, 1);
      bg.fillRect(0, 0, this.w, this.h);
      bg.setDepth(-2);

      // HUD
      this.roundText = this.add
        .text(16, 14, `0/${TOTAL_ROUNDS}`, {
          fontSize: '16px', color: '#FAF8F2',
          fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
        }).setDepth(20);

      this.scoreText = this.add
        .text(this.w - 16, 14, '0', {
          fontSize: '18px', color: '#FFE600',
          fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
        }).setOrigin(1, 0).setDepth(20);

      this.feedbackText = this.add
        .text(this.w / 2, this.h * 0.2, '', {
          fontSize: '16px', color: '#4ECDC4',
          fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(20).setAlpha(0);

      this.instructionText = this.add
        .text(this.w / 2, this.h * 0.78, 'Toca el circulo lo mas rapido posible', {
          fontSize: '12px', color: '#7A7770',
          fontFamily: 'system-ui, sans-serif',
          align: 'center',
        }).setOrigin(0.5).setDepth(20);

      // Progress dots
      const dotY = this.h - 20;
      const totalWidth = TOTAL_ROUNDS * 12;
      const startX = (this.w - totalWidth) / 2;
      for (let i = 0; i < TOTAL_ROUNDS; i++) {
        const dot = this.add
          .circle(startX + i * 12 + 4, dotY, 3, 0x2a2920)
          .setDepth(20);
        this.progressDots.push(dot);
      }

      // Make entire screen tappable for misclicks
      const hitZone = this.add
        .rectangle(this.w / 2, this.h / 2, this.w, this.h, 0x000000, 0)
        .setDepth(0)
        .setInteractive();
      hitZone.on('pointerdown', () => {
        if (!this.targetActive && this.started && !this.gameOver) {
          this.onMisclick();
        }
      });

      this.showCountdown(COUNTDOWN);
    }

    showCountdown(n: number) {
      if (n <= 0) {
        this.started = true;
        this.instructionText.setText('Preparate...');
        this.scheduleNextTarget();
        return;
      }
      const t = this.add
        .text(this.w / 2, this.h / 2, String(n), {
          fontSize: '48px', color: '#FAF8F2',
          fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(30).setAlpha(0).setScale(0.5);

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

    scheduleNextTarget() {
      if (this.gameOver) return;
      this.waiting = true;
      this.instructionText.setText('Preparate...').setAlpha(0.5);
      const delay = 600 + this.rng() * 1800;
      this.time.delayedCall(delay, () => {
        if (!this.gameOver) this.spawnTarget();
      });
    }

    spawnTarget() {
      this.waiting = false;
      this.targetActive = true;
      this.round++;
      this.roundText.setText(`${this.round}/${TOTAL_ROUNDS}`);
      this.instructionText.setText('TOCA!').setColor('#FFE600').setAlpha(1);

      const padding = 60;
      const cx = padding + this.rng() * (this.w - padding * 2);
      const cy = this.h * 0.3 + this.rng() * (this.h * 0.35);
      const radius = 28 + this.rng() * 12;
      const color = TARGET_COLORS[Math.floor(this.rng() * TARGET_COLORS.length)];

      // Glow
      this.currentGlow = this.add
        .circle(cx, cy, radius + 10, color, 0.12)
        .setDepth(4);
      this.tweens.add({
        targets: this.currentGlow,
        alpha: 0.25, duration: 400, yoyo: true, repeat: -1,
      });

      // Shrinking ring (time limit indicator)
      this.currentRing = this.add
        .circle(cx, cy, radius + 25, 0x000000, 0)
        .setStrokeStyle(2, color, 0.4)
        .setDepth(3);

      this.shrinkTween = this.tweens.add({
        targets: this.currentRing,
        radius: radius,
        duration: 2000,
        onComplete: () => {
          if (this.targetActive && !this.gameOver) {
            this.onTimeout();
          }
        },
      });

      // Target circle
      this.currentTarget = this.add
        .circle(cx, cy, radius, color)
        .setDepth(5)
        .setInteractive({ useHandCursor: true })
        .setScale(0);

      // Appear animation
      this.tweens.add({
        targets: this.currentTarget,
        scale: 1, duration: 100, ease: 'Back.easeOut',
      });

      this.spawnTime = Date.now();

      this.currentTarget.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (!this.targetActive || this.gameOver) return;
        pointer.event.stopPropagation();
        this.onHit(cx, cy, color, radius);
      });
    }

    onHit(cx: number, cy: number, color: number, radius: number) {
      const reaction = Date.now() - this.spawnTime;
      this.reactionTimes.push(reaction);
      this.targetActive = false;
      this.hits++;

      // Score based on reaction time
      let points: number;
      let label: string;
      let labelColor: string;
      if (reaction < 200) {
        points = 15;
        label = 'INCREIBLE!';
        labelColor = '#FFE600';
      } else if (reaction < 350) {
        points = 10;
        label = 'Rapido!';
        labelColor = '#4ECDC4';
      } else if (reaction < 600) {
        points = 6;
        label = 'Bien';
        labelColor = '#45B7D1';
      } else {
        points = 3;
        label = 'Lento';
        labelColor = '#7A7770';
      }

      this.score += points;
      this.scoreText.setText(String(this.score));

      // Update progress dot
      if (this.round <= TOTAL_ROUNDS) {
        this.progressDots[this.round - 1].fillColor = 0x4ecdc4;
      }

      // Feedback
      this.feedbackText
        .setText(`${label}  ${reaction}ms`)
        .setColor(labelColor)
        .setAlpha(1)
        .setScale(0.8);
      this.tweens.add({
        targets: this.feedbackText,
        scale: 1, duration: 150, ease: 'Back.easeOut',
      });
      this.tweens.add({
        targets: this.feedbackText,
        alpha: 0, duration: 300, delay: 800,
      });

      // Hit particles
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        const p = this.add.circle(cx, cy, 3, color).setDepth(8);
        this.tweens.add({
          targets: p,
          x: cx + Math.cos(angle) * 40,
          y: cy + Math.sin(angle) * 40,
          alpha: 0, scale: 0,
          duration: 350,
          onComplete: () => p.destroy(),
        });
      }

      // Pop score
      const pop = this.add
        .text(cx, cy, `+${points}`, {
          fontSize: '18px', color: labelColor,
          fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(12);
      this.tweens.add({
        targets: pop,
        y: cy - 50, alpha: 0, duration: 700, ease: 'Cubic.easeOut',
        onComplete: () => pop.destroy(),
      });

      this.clearTarget(true);

      if (this.round >= TOTAL_ROUNDS) {
        this.gameOver = true;
        this.time.delayedCall(800, () => this.endGame());
      } else {
        this.scheduleNextTarget();
      }
    }

    onTimeout() {
      this.targetActive = false;
      this.misses++;

      if (this.round <= TOTAL_ROUNDS) {
        this.progressDots[this.round - 1].fillColor = 0xff6b6b;
      }

      this.feedbackText
        .setText('Muy lento!')
        .setColor('#FF6B6B')
        .setAlpha(1);
      this.tweens.add({
        targets: this.feedbackText,
        alpha: 0, duration: 300, delay: 600,
      });

      this.clearTarget(false);

      if (this.round >= TOTAL_ROUNDS) {
        this.gameOver = true;
        this.time.delayedCall(800, () => this.endGame());
      } else {
        this.scheduleNextTarget();
      }
    }

    onMisclick() {
      // Penalize screen taps when no target is visible
      if (this.score > 0) {
        this.score = Math.max(0, this.score - 2);
        this.scoreText.setText(String(this.score));
      }

      this.feedbackText
        .setText('-2 Falso!')
        .setColor('#FF6B6B')
        .setAlpha(1);
      this.tweens.add({
        targets: this.feedbackText,
        alpha: 0, duration: 300, delay: 400,
      });

      this.cameras.main.shake(80, 0.003);
    }

    clearTarget(animated: boolean) {
      if (this.shrinkTween) {
        this.shrinkTween.stop();
        this.shrinkTween = null;
      }
      if (animated && this.currentTarget) {
        this.tweens.add({
          targets: this.currentTarget,
          scale: 1.3, alpha: 0, duration: 120,
          onComplete: () => this.currentTarget?.destroy(),
        });
      } else {
        this.currentTarget?.destroy();
      }
      if (this.currentGlow) {
        this.tweens.add({
          targets: this.currentGlow,
          alpha: 0, duration: 100,
          onComplete: () => this.currentGlow?.destroy(),
        });
      }
      if (this.currentRing) {
        this.currentRing.destroy();
      }
      this.currentTarget = null;
      this.currentGlow = null;
      this.currentRing = null;
    }

    endGame() {
      const avgReaction = this.reactionTimes.length > 0
        ? Math.round(this.reactionTimes.reduce((a, b) => a + b, 0) / this.reactionTimes.length)
        : 0;
      const bestReaction = this.reactionTimes.length > 0
        ? Math.min(...this.reactionTimes)
        : 0;

      // Accuracy bonus
      const accuracy = TOTAL_ROUNDS > 0 ? this.hits / TOTAL_ROUNDS : 0;
      const accuracyBonus = Math.round(accuracy * 30);
      const speedBonus = avgReaction > 0 ? Math.max(0, Math.round((500 - avgReaction) / 10)) : 0;
      const finalScore = this.score + accuracyBonus + speedBonus;

      const overlay = this.add
        .rectangle(this.w / 2, this.h / 2, this.w, this.h, 0x000000, 0)
        .setDepth(25);
      this.tweens.add({ targets: overlay, fillAlpha: 0.75, duration: 400 });

      this.time.delayedCall(500, () => {
        this.add
          .text(this.w / 2, this.h * 0.22, 'RESULTADOS', {
            fontSize: '16px', color: '#7A7770',
            fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
          }).setOrigin(0.5).setDepth(30);

        const s = this.add
          .text(this.w / 2, this.h * 0.34, String(finalScore), {
            fontSize: '52px', color: '#FFE600',
            fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
          }).setOrigin(0.5).setDepth(30).setScale(0.5).setAlpha(0);

        this.tweens.add({
          targets: s, alpha: 1, scale: 1, duration: 500, ease: 'Back.easeOut',
        });

        const stats = [
          `${this.hits}/${TOTAL_ROUNDS} aciertos`,
          `Media: ${avgReaction}ms`,
          `Mejor: ${bestReaction}ms`,
        ].join('  ·  ');

        this.add
          .text(this.w / 2, this.h * 0.48, stats, {
            fontSize: '10px', color: '#7A7770',
            fontFamily: 'system-ui, sans-serif',
            align: 'center', wordWrap: { width: this.w - 32 },
          }).setOrigin(0.5).setDepth(30);
      });

      this.time.delayedCall(2500, () => callbacks.onFinish(finalScore));
    }
  }

  game.scene.add('ReactionTapScene', ReactionScene, true);
}
