import confetti from 'canvas-confetti';

/**
 * Triggers a celebratory confetti explosion when udhaar is recovered or balance is settled.
 */
export function firePaymentConfetti() {
  // Emerald green and golden saffron kirana celebration colors
  const colors = ['#10B981', '#059669', '#F59E0B', '#D97706', '#34D399'];

  // Left cannon
  confetti({
    particleCount: 45,
    angle: 60,
    spread: 55,
    origin: { x: 0.1, y: 0.8 },
    colors,
    ticks: 200,
    gravity: 1.2,
    scalar: 1.1,
  });

  // Right cannon
  confetti({
    particleCount: 45,
    angle: 120,
    spread: 55,
    origin: { x: 0.9, y: 0.8 },
    colors,
    ticks: 200,
    gravity: 1.2,
    scalar: 1.1,
  });

  // Center star burst
  setTimeout(() => {
    confetti({
      particleCount: 30,
      spread: 100,
      origin: { x: 0.5, y: 0.6 },
      colors: ['#F59E0B', '#10B981', '#FFFFFF'],
      shapes: ['circle'],
    });
  }, 200);
}
