module.exports = {
  HooksManager: class {
    createSpan() {
      return null;
    }
    getSpan() {
      return null;
    }
  },
  HookSpan: class {
    constructor(id) {
      this.id = id;
    }
    finish() {}
  },
};
