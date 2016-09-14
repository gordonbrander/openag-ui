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
    advanceBufferMut(this.buffer, this.limit, datum);
    return this;
  }

  // Advance the buffer without mutating.
  // Returns a new buffer if updated, or same buffer if not.
  advance(datum) {
    // Add datum to end of array.
    const next = advanceBufferMut(this.buffer.slice(), this.limit, datum);
    return new FixedBuffer(next, this.limit);
  }

  advanceManyMut(data) {
    for (var i = 0; i < data.length; i++) {
      this.advanceMut(data[i]);
    }
    return this;
  }

  advanceMany(data) {
    if (data.length) {
      const next = trimMut(this.buffer.concat(data), this.limit);
      return new FixedBuffer(next, this.limit);
    }
    else {
      return this;
    }
  }
}

FixedBuffer.from = (array, limit) => new FixedBuffer(trimMut(array.slice(), limit), limit);

// Returns the array from buffer.
// @NOTE NEVER MUTATE THIS VALUE DIRECTLY. Always use the provided methods
// on Buffer.
FixedBuffer.values = buffer => buffer.buffer;

// Advance a sorted buffer and mutate it.
const advanceBufferMut = (buffer, limit, datum) => {
  // Add datum to end of array.
  buffer.push(datum);
  // Remove datum from the front of the array.
  trimMut(buffer, limit);
  return buffer;
}

// Trim buffer array to limit, fro the left. Mutates and returns buffer.
const trimMut = (buffer, limit) => {
  if (limit > 0) {
    while (buffer.length > limit) {
      buffer.shift();
    }
  }
  return buffer;
}