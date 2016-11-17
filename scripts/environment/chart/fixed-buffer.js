import {genRandomInt} from '../../lang/math';

/*
A mutable buffer with a limited size.
FixedBuffer will drop elements to the left when it overflows.
*/
export class FixedBuffer {
  constructor(array, limit) {
    if (limit == null || limit < 1) {
      throw new Error('Buffer limit must be greater than 0');
    }
    else if (array.length > limit) {
      throw new Error('Array must be less than or equal to buffer limit');
    }

    this.buffer = array;
    this.limit = limit;
  }

  // Advance the buffer mutably in-place.
  advanceMut(datum) {
    this.buffer.push(datum);
    if (this.buffer.length > this.limit) {
      // Get random index to remove (exclude new datapoint)
      const i = genRandomInt(0, this.buffer.length - 2);
      // Remove item from position i.
      this.buffer.splice(i, 1);
    }
    return this;
  }
}

FixedBuffer.from = (array, limit) => new FixedBuffer(trimMut(array.slice(), limit), limit);

// Returns the array from buffer.
// @NOTE NEVER MUTATE THIS VALUE DIRECTLY. Always use the provided methods
// on Buffer.
FixedBuffer.values = buffer => buffer.buffer;