import multer from "multer";

function makeUpload(destination: string) {
  const storage = multer.diskStorage({
    destination,

    filename: (req, file, cb) => {
      const extension = file.originalname.split(".").pop();

      cb(
        null,
        `${crypto.randomUUID()}.${extension}`
      );
    },
  });

  return multer({ storage });
}

export const upload = makeUpload("uploads/properties");
export const uploadDocument = makeUpload("uploads/documents");
