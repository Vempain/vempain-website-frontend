import type {MetadataEntry} from '../models';

/**
 * Camera related values that the file backend stores with a published image (see
 * {@code MetadataTool.collectStandardMetadataAsJson}): a JSON array holding one object with EXIF style keys.
 */
export interface CameraMetadata {
    model?: string;
    imageSize?: string;
    megapixels?: string;
    bitsPerSample?: string;
    iso?: string;
    shutterSpeed?: string;
    focalLength?: string;
    aperture?: string;
}

type MetadataObject = Record<string, unknown>;

/** Parses the stored metadata text; accepts the single-element array the backend writes as well as a bare object. */
export function parseFileMetadata(raw: string | null | undefined): MetadataObject | null {
    if (!raw || !raw.trim()) {
        return null;
    }
    try {
        const parsed: unknown = JSON.parse(raw);
        const candidate = Array.isArray(parsed) ? parsed[0] : parsed;
        return candidate !== null && typeof candidate === 'object' ? candidate as MetadataObject : null;
    } catch {
        return null;
    }
}

function text(value: unknown): string | undefined {
    if (value === null || value === undefined) {
        return undefined;
    }
    const normalized = String(value).trim();
    return normalized ? normalized : undefined;
}

function number(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string') {
        const parsed = Number.parseFloat(value.replace(',', '.'));
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
}

function trimZeros(value: number, decimals: number): string {
    return value.toFixed(decimals).replace(/\.?0+$/, '');
}

function cameraModel(metadata: MetadataObject): string | undefined {
    const make = text(metadata.Make);
    const model = text(metadata.Model);
    if (!model) {
        return make;
    }
    if (make && !model.toLowerCase().includes(make.toLowerCase())) {
        return `${make} ${model}`;
    }
    return model;
}

function imageDimensions(metadata: MetadataObject): { width: number; height: number } | undefined {
    const size = text(metadata.ImageSize);
    const match = size?.match(/^(\d+)\s*[x×]\s*(\d+)$/i);
    if (match) {
        return {width: Number.parseInt(match[1], 10), height: Number.parseInt(match[2], 10)};
    }
    const width = number(metadata.ImageWidth);
    const height = number(metadata.ImageHeight);
    return width && height ? {width, height} : undefined;
}

/** Extracts and formats the camera specific values of an image. Missing values are left undefined. */
export function cameraMetadata(raw: string | null | undefined): CameraMetadata {
    const metadata = parseFileMetadata(raw);
    if (!metadata) {
        return {};
    }

    const dimensions = imageDimensions(metadata);
    const megapixels = number(metadata.Megapixels) ?? (dimensions ? dimensions.width * dimensions.height / 1_000_000 : undefined);
    const bits = number(metadata.BitsPerSample);
    const iso = text(metadata.ISO);
    const shutter = text(metadata.ShutterSpeed) ?? text(metadata.ShutterSpeedValue) ?? text(metadata.ExposureTime);
    const aperture = number(metadata.FNumber) ?? number(metadata.Aperture) ?? number(metadata.ApertureValue);

    return {
        model: cameraModel(metadata),
        imageSize: dimensions ? `${dimensions.width} × ${dimensions.height} px` : undefined,
        megapixels: megapixels !== undefined ? `${trimZeros(megapixels, 1)} MP` : undefined,
        bitsPerSample: bits !== undefined ? `${trimZeros(bits, 0)}` : undefined,
        iso: iso ? (iso.toUpperCase().startsWith('ISO') ? iso : `ISO ${iso}`) : undefined,
        shutterSpeed: shutter ? (/[a-z]/i.test(shutter) ? shutter : `${shutter} s`) : undefined,
        focalLength: text(metadata.FocalLength),
        aperture: aperture !== undefined ? `f/${trimZeros(aperture, 1)}` : undefined,
    };
}

/** The camera values as overlay entries, in display order; only values that exist are included. */
export function cameraMetadataEntries(raw: string | null | undefined): MetadataEntry[] {
    const camera = cameraMetadata(raw);
    const rows: Array<[string, string | undefined]> = [
        ['Kamera', camera.model],
        ['Kuvan koko', camera.imageSize],
        ['Megapikseliä', camera.megapixels],
        ['Bittiä per näyte', camera.bitsPerSample],
        ['ISO', camera.iso],
        ['Suljinaika', camera.shutterSpeed],
        ['Polttoväli', camera.focalLength],
        ['Aukko', camera.aperture],
    ];
    return rows.flatMap(([label, value]) => (value ? [{label, value}] : []));
}
