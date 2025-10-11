import BinaryStream from '../../../common/binarystream';

/**
 * A tile corner.
 */
export default class Corner {
  groundHeight = 0;
  waterHeight = 0;
  mapEdge = 0;
  ramp = 0;
  blight = 0;
  water = 0;
  boundary = 0;
  groundTexture = 0;
  cliffVariation = 0;
  groundVariation = 0;
  cliffTexture = 0;
  layerHeight = 0;

  load(stream: BinaryStream, version: number): void {
    this.groundHeight = (stream.readInt16() - 8192) / 512;

    const waterAndEdge = stream.readInt16();

    this.waterHeight = ((waterAndEdge & 0x3FFF) - 8192) / 512;
    this.mapEdge = waterAndEdge & 0x4000;

    if (version >= 12) {
      const textureAndFlags = stream.readUint16();

      this.ramp = textureAndFlags & 0b0001000000;
      this.blight = textureAndFlags & 0b0010000000;
      this.water = textureAndFlags & 0b0100000000;
      this.boundary = textureAndFlags & 0b1000000000;

      this.groundTexture = textureAndFlags & 0b0000111111;
    } else {
      const textureAndFlags = stream.readUint8();

      this.ramp = textureAndFlags & 0b00010000;
      this.blight = textureAndFlags & 0b00100000;
      this.water = textureAndFlags & 0b01000000;
      this.boundary = textureAndFlags & 0b10000000;

      this.groundTexture = textureAndFlags & 0b00001111;
    }

    const variation = stream.readUint8();

    this.cliffVariation = (variation & 0b11100000) >>> 5;
    this.groundVariation = variation & 0b00011111;

    const cliffTextureAndLayer = stream.readUint8();

    this.cliffTexture = (cliffTextureAndLayer & 0b11110000) >>> 4;
    this.layerHeight = cliffTextureAndLayer & 0b00001111;
  }

  save(stream: BinaryStream, version: number): void {
    stream.writeInt16(this.groundHeight * 512 + 8192);
    stream.writeInt16(this.waterHeight * 512 + 8192 | this.mapEdge);
    const textureAndFlags = this.ramp | this.blight | this.water | this.boundary | this.groundTexture;
    if (version >= 12) stream.writeUint16(textureAndFlags);
    else stream.writeUint8(textureAndFlags);
    stream.writeUint8((this.cliffVariation << 5) | this.groundVariation);
    stream.writeUint8((this.cliffTexture << 4) + this.layerHeight);
  }
}
