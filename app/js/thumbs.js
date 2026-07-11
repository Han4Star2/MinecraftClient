/* Canvas thumbnails for catalog items — shared by shop and wardrobe. */

import { capeTexture, capeTextureFromPixels } from './skin.js';
import { customCape } from './economy.js';

export function drawItemThumb(canvas, item, size = 84) {
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#101116';
  ctx.fillRect(0, 0, size, size);
  const u = size / 84; // design units

  switch (item.cat) {
    case 'cape': {
      const custom = item.pixels ? { pixels: item.pixels } : customCape(item.id);
      const tex = custom ? capeTextureFromPixels(custom.pixels, 6) : capeTexture(item, 6);
      ctx.drawImage(tex, 17 * u, 6 * u, 50 * u, 74 * u);
      break;
    }
    case 'hat': drawHat(ctx, item, u); break;
    case 'wings': drawWings(ctx, item, u); break;
    case 'pet': drawPet(ctx, item, u); break;
    case 'emote':
      ctx.font = `${44 * u}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText({ wave: '👋', spin: '🌀', flip: '🤸', bow: '🙇', dance: '🕺', clap: '👏', flex: '💪', sit: '🪑' }[item.anim] || '✨', 42 * u, 46 * u);
      break;
    case 'nametag': drawNametag(ctx, item, u, size); break;
  }
}

function drawHat(ctx, item, u) {
  ctx.fillStyle = '#c98e68';
  ctx.fillRect(24 * u, 34 * u, 36 * u, 34 * u);
  ctx.fillStyle = item.color;
  const kind = item.kind;
  if (kind === 'beanie') {
    ctx.fillRect(20 * u, 22 * u, 44 * u, 18 * u);
    ctx.fillStyle = item.color2; ctx.fillRect(36 * u, 12 * u, 12 * u, 12 * u);
  } else if (kind === 'tophat') {
    ctx.fillRect(16 * u, 30 * u, 52 * u, 6 * u);
    ctx.fillRect(26 * u, 6 * u, 32 * u, 26 * u);
    ctx.fillStyle = item.color2; ctx.fillRect(26 * u, 24 * u, 32 * u, 7 * u);
  } else if (kind === 'halo') {
    ctx.strokeStyle = item.color; ctx.lineWidth = 7 * u;
    ctx.beginPath(); ctx.ellipse(42 * u, 16 * u, 22 * u, 8 * u, 0, 0, Math.PI * 2); ctx.stroke();
  } else if (kind === 'crown') {
    ctx.fillRect(22 * u, 22 * u, 40 * u, 14 * u);
    ctx.beginPath();
    ctx.moveTo(22 * u, 22 * u); ctx.lineTo(28 * u, 8 * u); ctx.lineTo(34 * u, 22 * u);
    ctx.lineTo(42 * u, 6 * u); ctx.lineTo(50 * u, 22 * u); ctx.lineTo(56 * u, 8 * u); ctx.lineTo(62 * u, 22 * u);
    ctx.fill();
    ctx.fillStyle = item.color2; ctx.fillRect(40 * u, 26 * u, 6 * u, 6 * u);
  } else if (kind === 'cap') {
    ctx.fillRect(22 * u, 20 * u, 40 * u, 16 * u);
    ctx.fillStyle = item.color2; ctx.fillRect(14 * u, 32 * u, 30 * u, 6 * u);
  } else if (kind === 'horns') {
    for (const dx of [-1, 1]) {
      ctx.save();
      ctx.translate(42 * u + dx * 16 * u, 30 * u);
      ctx.rotate(dx * 0.35);
      ctx.fillStyle = item.color; ctx.fillRect(-4 * u, -18 * u, 8 * u, 18 * u);
      ctx.fillStyle = item.color2; ctx.fillRect(-3 * u, -26 * u, 6 * u, 9 * u);
      ctx.restore();
    }
  }
}

function drawWings(ctx, item, u) {
  ctx.fillStyle = item.color;
  const jag = item.kind === 'phantom' || item.kind === 'dragon';
  for (const dir of [-1, 1]) {
    ctx.save();
    ctx.translate(42 * u, 44 * u);
    ctx.scale(dir, 1);
    ctx.beginPath();
    ctx.moveTo(4 * u, 0);
    if (jag) {
      ctx.lineTo(30 * u, -26 * u); ctx.lineTo(26 * u, -10 * u); ctx.lineTo(38 * u, -14 * u);
      ctx.lineTo(30 * u, 2 * u); ctx.lineTo(36 * u, 12 * u); ctx.lineTo(20 * u, 12 * u); ctx.lineTo(12 * u, 22 * u);
    } else {
      ctx.quadraticCurveTo(34 * u, -30 * u, 36 * u, -6 * u);
      ctx.quadraticCurveTo(30 * u, 2 * u, 34 * u, 10 * u);
      ctx.quadraticCurveTo(22 * u, 8 * u, 20 * u, 16 * u);
      ctx.quadraticCurveTo(12 * u, 12 * u, 4 * u, 18 * u);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawPet(ctx, item, u) {
  ctx.fillStyle = item.color;
  ctx.fillRect(24 * u, 22 * u, 36 * u, 36 * u);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  if (item.face === 'creeper') {
    ctx.fillRect(30 * u, 30 * u, 7 * u, 7 * u); ctx.fillRect(47 * u, 30 * u, 7 * u, 7 * u);
    ctx.fillRect(37 * u, 38 * u, 10 * u, 8 * u);
  } else if (item.face === 'bee') {
    ctx.fillRect(24 * u, 30 * u, 36 * u, 5 * u); ctx.fillRect(24 * u, 44 * u, 36 * u, 5 * u);
  } else {
    ctx.fillRect(31 * u, 32 * u, 6 * u, 6 * u); ctx.fillRect(47 * u, 32 * u, 6 * u, 6 * u);
  }
  if (item.glow) {
    ctx.strokeStyle = item.color;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 4 * u;
    ctx.strokeRect(19 * u, 17 * u, 46 * u, 46 * u);
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = '#0d0e11';
  ctx.fillRect(24 * u, 62 * u, 36 * u, 4 * u); // shadow
}

function drawNametag(ctx, item, u, size) {
  ctx.fillStyle = 'rgba(10,11,13,0.7)';
  ctx.fillRect(6 * u, 32 * u, 72 * u, 20 * u);
  ctx.font = `bold ${12 * u}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const grad = ctx.createLinearGradient(0, 0, size, 0);
  switch (item.fx) {
    case 'rainbow':
      for (const [i, c] of ['#ff5560', '#f3c14b', '#35d374', '#4b7bec', '#9b59d0'].entries()) grad.addColorStop(i / 4, c);
      ctx.fillStyle = grad; break;
    case 'gold': ctx.fillStyle = '#f3c14b'; ctx.shadowColor = '#f3c14b'; ctx.shadowBlur = 8 * u; break;
    case 'frost': ctx.fillStyle = '#9fdcf0'; ctx.shadowColor = '#7fdbe8'; ctx.shadowBlur = 8 * u; break;
    case 'fire': ctx.fillStyle = '#ff8a3c'; ctx.shadowColor = '#e8531a'; ctx.shadowBlur = 10 * u; break;
    case 'shadow': ctx.fillStyle = '#e9ebef'; ctx.shadowColor = '#000'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 3 * u; break;
    case 'glitch': ctx.fillStyle = '#57d8c4'; break;
    default: ctx.fillStyle = '#fff';
  }
  ctx.fillText('Player', 42 * u, 42 * u);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}
