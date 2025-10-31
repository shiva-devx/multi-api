import ILovePDFApi from "@ilovepdf/ilovepdf-nodejs";


console.log("creating pdf instance");

const ilovepdf = new ILovePDFApi(
  process.env.ILOVEPDF_PUBLIC_KEY,
  process.env.ILOVEPDF_SECRET_KEY
);
console.log("pdf instance created successfully");

export default ilovepdf;
