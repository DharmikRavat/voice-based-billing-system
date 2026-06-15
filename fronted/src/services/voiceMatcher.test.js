// src/services/voiceMatcher.test.js
import { describe, it, expect } from 'vitest';
import { extractQtyAndName, matchVoiceToMenu } from './voiceMatcher.js';

const mockMenu = [
  { _id: 'm1', name: "Paneer Butter Masala", price: 280, available: true },
  { _id: 'm2', name: "Dal Makhani", price: 220, available: true },
  { _id: 'm3', name: "Butter Naan", price: 50, available: true },
  { _id: 'm4', name: "Garlic Naan", price: 60, available: true },
  { _id: 'm5', name: "Mango Lassi", price: 90, available: true },
  { _id: 'm6', name: "Chicken Tikka", price: 320, available: false }, // Unavailable item
];

describe('Frontend Voice Matcher Service', () => {

  describe('extractQtyAndName', () => {
    it('should extract digit-based leading quantity and item name', () => {
      const res = extractQtyAndName('2 garlic naan');
      expect(res).toEqual({ quantity: 2, itemName: 'garlic naan' });
    });

    it('should extract word-based leading quantity and item name', () => {
      const res = extractQtyAndName('two paneer butter masala');
      expect(res).toEqual({ quantity: 2, itemName: 'paneer butter masala' });
    });

    it('should extract Hinglish word leading quantity and item name', () => {
      const res = extractQtyAndName('teen mango lassi');
      expect(res).toEqual({ quantity: 3, itemName: 'mango lassi' });
    });

    it('should handle trailing quantity', () => {
      const res = extractQtyAndName('dal makhani 4');
      expect(res).toEqual({ quantity: 4, itemName: 'dal makhani' });
    });

    it('should default to quantity of 1 when no quantity is specified', () => {
      const res = extractQtyAndName('butter naan');
      expect(res).toEqual({ quantity: 1, itemName: 'butter naan' });
    });
  });

  describe('matchVoiceToMenu', () => {
    it('should match a single item with exact wording', () => {
      const { matched, notFound } = matchVoiceToMenu('butter naan', mockMenu);
      expect(matched.length).toBe(1);
      expect(matched[0].menuItem._id).toBe('m3');
      expect(matched[0].quantity).toBe(1);
      expect(notFound).toEqual([]);
    });

    it('should match multiple items using "and", "aur", or commas', () => {
      const { matched, notFound } = matchVoiceToMenu('two paneer butter masala and three garlic naan, one mango lassi', mockMenu);
      expect(matched.length).toBe(3);
      
      const paneer = matched.find(m => m.menuItem._id === 'm1');
      const garlicNaan = matched.find(m => m.menuItem._id === 'm4');
      const lassi = matched.find(m => m.menuItem._id === 'm5');

      expect(paneer.quantity).toBe(2);
      expect(garlicNaan.quantity).toBe(3);
      expect(lassi.quantity).toBe(1);
      expect(notFound).toEqual([]);
    });

    it('should resolve Hinglish quantity words and connectors like "aur"', () => {
      const { matched } = matchVoiceToMenu('teen mango lassi aur do butter naan', mockMenu);
      expect(matched.length).toBe(2);
      
      const lassi = matched.find(m => m.menuItem._id === 'm5');
      const naan = matched.find(m => m.menuItem._id === 'm3');

      expect(lassi.quantity).toBe(3);
      expect(naan.quantity).toBe(2);
    });

    it('should apply phonetic aliases correctly (e.g., nan -> naan, panner -> paneer)', () => {
      const { matched } = matchVoiceToMenu('two butter nan and one panner butter masala', mockMenu);
      expect(matched.length).toBe(2);

      const naan = matched.find(m => m.menuItem._id === 'm3');
      const paneer = matched.find(m => m.menuItem._id === 'm1');

      expect(naan.quantity).toBe(2);
      expect(paneer.quantity).toBe(1);
    });

    it('should strip common Hindi and English filler words', () => {
      const { matched } = matchVoiceToMenu('mujhe ek dal makhani chahiye please', mockMenu);
      expect(matched.length).toBe(1);
      expect(matched[0].menuItem._id).toBe('m2');
      expect(matched[0].quantity).toBe(1);
    });

    it('should ignore unavailable items', () => {
      const { matched, notFound } = matchVoiceToMenu('one chicken tikka', mockMenu);
      expect(matched.length).toBe(0);
      expect(notFound).toContain('chicken tikka');
    });

    it('should place unmatched words in notFound list', () => {
      const { matched, notFound } = matchVoiceToMenu('two butter naan and one nonexisting item', mockMenu);
      expect(matched.length).toBe(1);
      expect(matched[0].menuItem._id).toBe('m3');
      expect(notFound).toContain('nonexisting item');
    });
  });

});
