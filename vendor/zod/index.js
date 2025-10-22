class ZodError extends Error {
  constructor(issues) {
    super('Invalid input');
    this.name = 'ZodError';
    this.issues = issues;
  }
}

class BaseSchema {
  parse(data) {
    return this._parse(data, []);
  }

  safeParse(data) {
    try {
      const parsed = this.parse(data);
      return { success: true, data: parsed };
    } catch (error) {
      if (error instanceof ZodError) {
        return { success: false, error };
      }
      return {
        success: false,
        error: new ZodError([{ path: [], message: (error && error.message) || 'Unknown error' }]),
      };
    }
  }

  optional() {
    return new OptionalSchema(this);
  }
}

class OptionalSchema extends BaseSchema {
  constructor(inner) {
    super();
    this.inner = inner;
  }

  _parse(data, path) {
    if (data === undefined) {
      return undefined;
    }
    return this.inner._parse(data, path);
  }
}

class EnumSchema extends BaseSchema {
  constructor(values) {
    super();
    this.values = values;
  }

  _parse(data, path) {
    if (typeof data !== 'string') {
      throw new ZodError([{ path, message: 'Expected string' }]);
    }
    if (!this.values.includes(data)) {
      throw new ZodError([{ path, message: `Expected one of: ${this.values.join(', ')}` }]);
    }
    return data;
  }
}

class NumberSchema extends BaseSchema {
  constructor() {
    super();
    this._isInt = false;
    this._min = null;
    this._max = null;
  }

  int() {
    this._isInt = true;
    return this;
  }

  min(value) {
    this._min = value;
    return this;
  }

  max(value) {
    this._max = value;
    return this;
  }

  _parse(data, path) {
    if (typeof data !== 'number' || Number.isNaN(data)) {
      throw new ZodError([{ path, message: 'Expected number' }]);
    }
    if (this._isInt && !Number.isInteger(data)) {
      throw new ZodError([{ path, message: 'Expected integer' }]);
    }
    if (this._min !== null && data < this._min) {
      throw new ZodError([{ path, message: `Value must be greater than or equal to ${this._min}` }]);
    }
    if (this._max !== null && data > this._max) {
      throw new ZodError([{ path, message: `Value must be less than or equal to ${this._max}` }]);
    }
    return data;
  }
}

class StringSchema extends BaseSchema {
  constructor() {
    super();
    this._trim = false;
    this._min = null;
    this._max = null;
    this._datetime = false;
  }

  trim() {
    this._trim = true;
    return this;
  }

  min(length) {
    this._min = length;
    return this;
  }

  max(length) {
    this._max = length;
    return this;
  }

  datetime() {
    this._datetime = true;
    return this;
  }

  _parse(data, path) {
    if (typeof data !== 'string') {
      throw new ZodError([{ path, message: 'Expected string' }]);
    }
    let value = data;
    if (this._trim) {
      value = value.trim();
    }
    if (this._min !== null && value.length < this._min) {
      throw new ZodError([{ path, message: `String must contain at least ${this._min} character(s)` }]);
    }
    if (this._max !== null && value.length > this._max) {
      throw new ZodError([{ path, message: `String must contain at most ${this._max} character(s)` }]);
    }
    if (this._datetime) {
      const date = Date.parse(value);
      if (Number.isNaN(date)) {
        throw new ZodError([{ path, message: 'Invalid datetime string' }]);
      }
    }
    return value;
  }
}

class ArraySchema extends BaseSchema {
  constructor(schema) {
    super();
    this.schema = schema;
    this._length = null;
  }

  length(size) {
    this._length = size;
    return this;
  }

  _parse(data, path) {
    if (!Array.isArray(data)) {
      throw new ZodError([{ path, message: 'Expected array' }]);
    }
    if (this._length !== null && data.length !== this._length) {
      throw new ZodError([{ path, message: `Array must contain exactly ${this._length} element(s)` }]);
    }
    return data.map((value, index) => this.schema._parse(value, [...path, index]));
  }
}

class ObjectSchema extends BaseSchema {
  constructor(shape) {
    super();
    this.shape = shape;
  }

  _parse(data, path) {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      throw new ZodError([{ path, message: 'Expected object' }]);
    }
    const result = {};
    for (const key of Object.keys(this.shape)) {
      const schema = this.shape[key];
      const value = data[key];
      result[key] = schema._parse(value, [...path, key]);
    }
    return result;
  }
}

export const z = {
  enum(values) {
    return new EnumSchema(values);
  },
  object(shape) {
    return new ObjectSchema(shape);
  },
  number() {
    return new NumberSchema();
  },
  string() {
    return new StringSchema();
  },
  array(schema) {
    return new ArraySchema(schema);
  },
  ZodError,
};

export { ZodError };
