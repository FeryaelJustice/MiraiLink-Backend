import { describe, expect, it } from 'vitest';
import { resolveCatalogLanguage, resolvePublicMediaUrl, toLocalizedCatalogItem } from '../../../src/utils/catalogLocalization.js';

describe('catalogLocalization', () => {
    it('uses a supported primary language and falls back to Spanish', () => {
        expect(resolveCatalogLanguage('en-US,en;q=0.9')).toBe('en');
        expect(resolveCatalogLanguage('es-ES')).toBe('es');
        expect(resolveCatalogLanguage('ja-JP')).toBe('ja');
        expect(resolveCatalogLanguage('fr-FR')).toBe('es');
    });

    it('keeps absolute media URLs and resolves relative paths', () => {
        const req = { protocol: 'https', get: () => 'api.mirailink.test' };
        expect(resolvePublicMediaUrl('https://cdn.example/image.webp', req)).toBe('https://cdn.example/image.webp');
        expect(resolvePublicMediaUrl('assets/catalog/item.webp', req)).toBe('https://api.mirailink.test/assets/catalog/item.webp');
    });

    it('builds the public catalog item without leaking database field names', () => {
        const req = { protocol: 'https', get: () => 'api.mirailink.test' };
        expect(toLocalizedCatalogItem({
            id: 'anime-1', catalog_key: 'one-piece', name: 'One Piece', biography: '', image_path: '/assets/one-piece.webp',
        }, req)).toEqual({
            id: 'anime-1', catalog_key: 'one-piece', name: 'One Piece', biography: '', image_url: 'https://api.mirailink.test/assets/one-piece.webp',
        });
    });
});
