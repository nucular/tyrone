(function(ns) {
  "use strict";

  var Tyrone = ns.Tyrone || function(code, parent) {
    this.program = (code ? code.split("").reverse() : []);
    this.parent = parent || null;

    this.symbols = {};
    this.stack = [];

    this.context = this.symbols;

    this.commented = false;
    this.quoted = false;
    this.doublequoted = false;
  }
  var proto = Tyrone.prototype;

  Tyrone.modules = {};
  Tyrone.modulepath = [".", "stdlib"];

  Tyrone.operators = {
    "!": function() {
      var name = this.stack.pop();
      if (name == undefined)
        throw new StackError("expected name on stack");
      var value = this.stack.pop();
      if (value == undefined)
        throw new StackError("expected value on stack");
      this.context[name] = value;
      this.context = this.symbols;
    },

    "?": function() {
      var name = this.stack.pop();
      if (!this.context.hasOwnProperty(name))
        throw new SymbolError("symbol " + name + " not found");
      var value = this.context[name];
      this.context = this.symbols;
      this.stack.push(value);
    },

    "\\": function() {
      var value = this.program.pop();
      if (value == undefined)
        throw new StackError("expected escaped char on program stack");

      if (this.stack.length == 0) {
        this.stack.push(value);
      } else {
        var top = this.stack.length - 1;
        var topval = this.stack[top];

        this.stack[top] = topval + value;
      }
    },

    ".": function() {
      var value = this.stack.pop();
      if (value == undefined)
        throw new StackError("expected code on stack");
      var program = value.split("").reverse();
      this.program = this.program.concat(program);
    },

    ":": function() {
      var name = this.stack.pop();
      if (!this.context.hasOwnProperty(name))
        throw new SymbolError("symbol " + name + " not found");
      var value = this.symbols[name];
      this.context = this.symbols;
      var program = value.split("").reverse();
      this.program = this.program.concat(program);
    },

    ",": function() {
      this.stack.push("");
    },

    ";": function() {
      var name = this.stack.pop();
      if (!this.context.hasOwnProperty(name))
        throw new StackError("symbol " + name + " not found");
      var value = this.context[name];
      this.context = this.symbols;
      this.stack.push(value);
      this.stack.push("");
    },

    "'": function() {
      this.quoted = !this.quoted;
    },

    "\"": function() {
      this.doublequoted = !this.doublequoted;
    },

    "(": function() {
      if (!this.quoted && !this.doublequoted)
        this.commented = true;
    },

    ")": function() {
      if (!this.quoted && !this.doublequoted)
        this.commented = false;
    },

    "_": function() {
      var name = this.stack.pop();
      if (name == "" || name == "root")
        this.context = this.getRoot();
      if (!Tyrone.modules.hasOwnProperty(name)) {
        var module = this.import(name);
        Tyrone.modules[name] = module;
      }
      this.context = Tyrone.modules[name];
    }
}

  proto.cycle = function() {
    var op = this.program.pop();
    if (op == undefined)
      return false;

    var inquote = (this.quoted && op != '\'') || (this.doublequoted && op != '"');
    var incomment = !inquote && this.commented && op != '(' && op != ')';

    if (incomment)
      return true;

    if (!inquote && Tyrone.operators.hasOwnProperty(op)) {
      Tyrone.operators[op].apply(this);
    } else {
      if (inquote && op == "\\") {
        op = this.program.pop();
        if (op == undefined)
          throw new StackError("expected escaped char on program stack");
      }

      if (this.stack.length == 0) {
        this.stack.push(op);
      } else {
        var top = this.stack.length - 1;
        var topval = this.stack[top];

        this.stack[top] = topval + op;
      }
    }
    return true;
  }

  proto.exec = function(code) {
    if (code) {
      var program = code.split("").reverse();
      this.program = this.program.concat(program);
    }

    var count = 0;
    while (this.cycle()) {
      count++;
    }

    return count;
  }

  proto.getRoot = function() {
    if (this.parent == null)
      return this;
    else
      return this.parent.getRoot();
  }

  proto.import = function(name) {
    var loadJS = function(path) {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", path, false);
      xhr.send(null);

      if (xhr.status == 200) {
        Tyrone.modules[name] = eval(xhr.responseText);
        return true;
      } else {
        return false;
      }
    }

    var loadTYR = function(path) {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", path, false);
      xhr.send(null);

      if (xhr.status == 200) {
        var mod = new Tyrone(xhr.responseText);
        mod.exec();
        Tyrone.modules[name] = mod.symbols;
        return true;
      } else {
        return false;
      }
    }

    for (var i = 0; i < Tyrone.modulepath.length; i++) {
      var p = Tyrone.modulepath[i];
      if (!p.endsWith("/"))
        p = p + "/";

      if (loadJS(p + name + ".js")) break;
      if (loadTYR(p + name + ".tyr")) break;
    }

    if (!Tyrone.modules.hasOwnProperty(name))
      throw new ImportError("module " + name + " not found");
  }


  var ErrorInheritor = function() {}
  ErrorInheritor.prototype = Error.prototype;

  var SymbolError = Tyrone.SymbolError || function() {
    var tmp = Error.apply(this, arguments);
    tmp.name = this.name = "SymbolError";
    this.message = tmp.message;
    Object.defineProperty(this, "stack", {
      get: function() {
        return tmp.stack;
      }
    });
    return this;
  }
  SymbolError.prototype = new ErrorInheritor();
  Tyrone.SymbolError = SymbolError;

  var StackError = Tyrone.StackError || function() {
    var tmp = Error.apply(this, arguments);
    tmp.name = this.name = "StackError";
    this.message = tmp.message;
    Object.defineProperty(this, "stack", {
      get: function() {
        return tmp.stack;
      }
    });
    return this;
  }
  StackError.prototype = new ErrorInheritor();
  Tyrone.StackError = StackError;

  var ImportError = Tyrone.ImportError || function() {
    var tmp = Error.apply(this, arguments);
    tmp.name = this.name = "ImportError";
    this.message = tmp.message;
    Object.defineProperty(this, "stack", {
      get: function() {
        return tmp.stack;
      }
    });
    return this;
  }
  StackError.prototype = new ErrorInheritor();
  Tyrone.StackError = StackError;

  ns.Tyrone = Tyrone;

})(window);
