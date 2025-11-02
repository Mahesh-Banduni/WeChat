import fs from 'fs';
import path from 'path';
import {b2, authorizeB2} from '../configs/backblaze.js';

export const uploadMultipleFilesToB2 = async (files) => {
  await authorizeB2(); // Authorize once

  // Ensure `files` is always an array
  const fileArray = Array.isArray(files) ? files : [files];

  const urls = await Promise.all(
    fileArray.map(async (file) => {
      const uploadUrlResponse = await b2.getUploadUrl({
        bucketId: process.env.B2_BUCKET_ID,
      });

      const uploadUrl = uploadUrlResponse.data.uploadUrl;
      const uploadAuthToken = uploadUrlResponse.data.authorizationToken;

      const uniqueFileName = `documents/${Date.now()}-${file.originalname}`;
      const mimeType = file.mimetype;

      await b2.uploadFile({
        uploadUrl,
        uploadAuthToken,
        fileName: uniqueFileName,
        data: file.buffer,
        contentType: mimeType,
      });

      const { data: { authorizationToken } } = await b2.getDownloadAuthorization({
        bucketId: process.env.B2_BUCKET_ID,
        fileNamePrefix: uniqueFileName,
        validDurationInSeconds: 604800,
      });

      const signedUrl = `https://f005.backblazeb2.com/file/${process.env.B2_BUCKET_NAME}/${uniqueFileName}?Authorization=${authorizationToken}`;

      return signedUrl;
    })
  );

  return urls;
};
