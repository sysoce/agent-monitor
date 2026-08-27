import test from 'node:test';
import * as assert from 'node:assert/strict';
import { generateQrMatrix } from '../src/qr/qrEncoder';
import { renderQrToTerminal, renderQrToSvg } from '../src/qr/qrRenderer';

test('generateQrMatrix generates valid square boolean matrix for text', () => {
  const url = 'http://localhost:4200/#setup=abc123xyz';
  const matrix = generateQrMatrix(url);
  assert.ok(Array.isArray(matrix));
  assert.ok(matrix.length >= 21);
  assert.equal(matrix.length, matrix[0]?.length);

  // Finder pattern at top-left should be 7x7 solid box outline
  assert.equal(matrix[0]![0], true);
  assert.equal(matrix[0]![1], true);
  assert.equal(matrix[0]![2], true);
  assert.equal(matrix[0]![3], true);
  assert.equal(matrix[0]![4], true);
  assert.equal(matrix[0]![5], true);
  assert.equal(matrix[0]![6], true);

  assert.equal(matrix[1]![0], true);
  assert.equal(matrix[1]![1], false);
  assert.equal(matrix[1]![5], false);
  assert.equal(matrix[1]![6], true);
});

test('renderQrToTerminal generates non-empty terminal string with blocks', () => {
  const matrix = generateQrMatrix('https://example.com');
  const termStr = renderQrToTerminal(matrix);
  assert.ok(typeof termStr === 'string');
  assert.ok(termStr.length > 50);
  assert.ok(termStr.includes('\n'));
});

test('renderQrToSvg generates valid SVG markup with viewBox and rects', () => {
  const matrix = generateQrMatrix('https://example.com');
  const svg = renderQrToSvg(matrix);
  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.endsWith('</svg>'));
  assert.ok(svg.includes('viewBox='));
  assert.ok(svg.includes('fill="#000000"'));
});
