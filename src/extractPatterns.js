require('dotenv').config();

const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 *
 * load the pr data saved by fetchPRs.js
 */
function loadPRData() {
  const dataPath = path.join(__dirname, '..', 'data', 'prs.json');
  const raw = fs.readFileSync(dataPath, 'utf-8');
  return JSON.parse(raw);
}

/**
 * turn one pr into a compact text block for the model
 */

function formatPR(pr) {
  const comments = (pr.reviews || [])
  .map(r => `-${r.body}`)
  .filter(line => line.length > 3)
  .join('\n');

  return `PR: "${pr.title}"\nReviewer feedback:\n${comments || '-(no comments'}`;
}

/**
 * then define a constant system prompt - with the directions and the pattern formatting
 *
 */




/**
 * send a batch of prs to gemini and get back structured patterns
 */

/**
 * f
 */