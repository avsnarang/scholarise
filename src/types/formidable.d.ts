declare module 'formidable' {
  import { IncomingForm, Fields, Files } from 'formidable';
  export = IncomingForm;
  export { Fields, Files };
} 