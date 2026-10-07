import {describe, expect, it} from '@jest/globals';
import {cameraMetadata, cameraMetadataEntries, parseFileMetadata} from '../../tools/imageMetadata';

const BACKEND_METADATA = JSON.stringify([{
    Make: 'Canon',
    Model: 'Canon EOS R5',
    ImageSize: '8192x5464',
    Megapixels: 44.8,
    BitsPerSample: 14,
    ISO: 400,
    ShutterSpeed: '1/250',
    ExposureTime: '1/250',
    FocalLength: '85.0 mm',
    FNumber: 1.8,
    Aperture: 1.8,
}]);

describe('imageMetadata', () => {
    it('parses the single element array written by the file backend and bare objects', () => {
        expect(parseFileMetadata(BACKEND_METADATA)?.Model).toBe('Canon EOS R5');
        expect(parseFileMetadata('{"Model":"X"}')?.Model).toBe('X');
        expect(parseFileMetadata(null)).toBeNull();
        expect(parseFileMetadata('   ')).toBeNull();
        expect(parseFileMetadata('not json')).toBeNull();
        expect(parseFileMetadata('[]')).toBeNull();
    });

    it('formats the camera values for the overlay', () => {
        const camera = cameraMetadata(BACKEND_METADATA);

        expect(camera).toEqual({
            model: 'Canon EOS R5',
            imageSize: '8192 × 5464 px',
            megapixels: '44.8 MP',
            bitsPerSample: '14',
            iso: 'ISO 400',
            shutterSpeed: '1/250 s',
            focalLength: '85.0 mm',
            aperture: 'f/1.8',
        });
    });

    it('prefixes the make when the model does not contain it and derives megapixels from the size', () => {
        const camera = cameraMetadata(JSON.stringify([{Make: 'Nikon', Model: 'D750', ImageWidth: 6016, ImageHeight: 4016, FNumber: 4, ExposureTime: '1/60'}]));

        expect(camera.model).toBe('Nikon D750');
        expect(camera.imageSize).toBe('6016 × 4016 px');
        expect(camera.megapixels).toBe('24.2 MP');
        expect(camera.aperture).toBe('f/4');
        expect(camera.shutterSpeed).toBe('1/60 s');
        expect(camera.iso).toBeUndefined();
    });

    it('returns only the available entries in display order', () => {
        expect(cameraMetadataEntries(BACKEND_METADATA).map((entry) => entry.label)).toEqual([
            'Kamera', 'Kuvan koko', 'Megapikseliä', 'Bittiä per näyte', 'ISO', 'Suljinaika', 'Polttoväli', 'Aukko',
        ]);
        expect(cameraMetadataEntries(JSON.stringify([{ISO: 'ISO 100'}]))).toEqual([{label: 'ISO', value: 'ISO 100'}]);
        expect(cameraMetadataEntries(null)).toEqual([]);
        expect(cameraMetadataEntries('{}')).toEqual([]);
    });
});
