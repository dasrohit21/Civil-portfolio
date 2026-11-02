import { Files } from "files-sdk";
import { neon } from "files-sdk/neon";

/**
 * The only file that talks to object storage: Neon's S3-compatible `assets` bucket (private,
 * declared in neon.ts). Server only. The AWS_* variables are written by `neon deploy`.
 * Files are read through short-lived signed links, never made public.
 */
export const BUCKET = "assets";

const files = process.env.AWS_ENDPOINT_URL_S3 ? new Files({ adapter: neon({ bucket: BUCKET }) }) : null;

export const storageConfigured = () => files !== null;

export const putFile = (key: string, file: File) => files!.upload(key, file, { contentType: file.type });

/** A signed link that works for an hour. */
export const fileUrl = (key: string) => files!.url(key, { expiresIn: 3600 });

export const removeFile = (key: string) => files!.delete(key);
