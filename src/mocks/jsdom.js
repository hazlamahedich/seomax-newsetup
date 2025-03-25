// Mock implementation for jsdom
class MockXMLHttpRequest {
  open() {}
  send() {}
  setRequestHeader() {}
}

module.exports = {
  JSDOM: class {
    constructor() {
      this.window = {
        document: {
          createElement: () => ({}),
          createTextNode: () => ({}),
          querySelector: () => null,
          querySelectorAll: () => [],
        },
        XMLHttpRequest: MockXMLHttpRequest,
      };
    }
  }
}; 