import {describe, expect, it} from '@jest/globals';
import {encodeApiPath} from '../tools/safePaths';

describe('file URL safety', () => {
    it('encodes path segments without allowing URL syntax', () => {
        expect(encodeApiPath('/photos/my image?.jpg')).toBe('photos/my%20image%3F.jpg');
    });

    it('rejects traversal and control characters', () => {
        expect(encodeApiPath('../secret.txt')).toBe('');
        expect(encodeApiPath('photos/../../secret.txt')).toBe('');
        expect(encodeApiPath('photos/\u0000secret.txt')).toBe('');
    });
});
