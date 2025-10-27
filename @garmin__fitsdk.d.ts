declare module '@garmin/fitsdk' {
  export class Stream {
    static fromByteArray(data: Uint8Array): Stream;
  }

  export class Decoder {
    constructor(stream: Stream);
    read(): { messages: any; errors: any[] };
  }
}
