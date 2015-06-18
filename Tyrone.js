(function(ns) {
  "use strict";

  var Tyrone = ns.Tyrone || function(code, parent) {
    this.program = (code ? code.split("").reverse() : []);
    this.parent = parent || null;

    this.macros = {};
    this.stack = [];

    this.context = this.macros;

    this.commented = false;
    this.quoted = false;
    this.doublequoted = false;
  }
  var proto = Tyrone.prototype;

  Tyrone.modules = {};
  Tyrone.modulepath = [".", "stdlib"];

  Tyrone.GET = 0;
  Tyrone.SET = 1;
  Tyrone.CALL = 3;

  Tyrone.operators = {
    "!": function() {
      var name = this.stack.pop();
      if (name == undefined)
        throw new StackError("expected macro name on stack");
      var value = this.stack.pop();
      if (value == undefined)
        throw new StackError("expected macro value on stack");

      if (typeof this.context[name] == "function") {
        this.context[name](this, Tyrone.SET);
      } else {
        this.context[name] = value;
      }
      this.context = this.macros;
    },

    "?": function() {
      var name = this.stack.pop();
      if (name == undefined)
        throw new StackError("expected macro name on stack")
      if (!this.context.hasOwnProperty(name))
        throw new MacroError("macro " + name + " not found");
      var value = this.context[name];
      this.context = this.macros;

      if (typeof value == "function") {
        value(this, Tyrone.GET);
      } else {
        this.stack.push(value);
      }
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
        throw new StackError("expected code literal on stack");
      var program = value.split("").reverse();
      this.program = this.program.concat(program);
    },

    ":": function() {
      var name = this.stack.pop();
      if (name == undefined)
        throw new StackError("expected macro name on stack");
      if (!this.context.hasOwnProperty(name))
        throw new MacroError("macro " + name + " not found");
      var value = this.context[name];
      this.context = this.macros;

      if (typeof value == "function") {
        value(this, Tyrone.CALL);
      } else {
        var program = value.split("").reverse();
        this.program = this.program.concat(program);
      }
    },

    ",": function() {
      this.stack.push("");
    },

    ";": function() {
      var name = this.stack.pop();
      if (!this.context.hasOwnProperty(name))
        throw new StackError("macro " + name + " not found");
      var value = this.context[name];
      this.context = this.macros;

      if (typeof value == "function") {
        value(this, Tyrone.GET);
      } else {
        this.stack.push(value);
      }
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
      if (name == undefined)
        throw new StackError("expected module name on stack");
      if (name == "" || name == "root")
        this.context = this.getRoot();

      this.import(name);
      this.context = Tyrone.modules[name];

      this.stack.push("");
    },

    "^": function() {
      var opname = this.stack.pop();
      if (opname == undefined)
        throw new StackError("expected operator char on stack");
      if (opname.length != 1)
        throw new ValueError("operator must be exactly 1 char");
      var value = this.stack.pop();
      if (value == undefined)
        throw new StackError("expected code literal on stack");

      var program = value.split("").reverse();
      Tyrone.operators[opname] = function() {
        this.program = this.program.concat(program);
      }
    },

    " ": function() { },
    "\n": function() { }
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

  proto.import = function(name, force) {
    if (!force && Tyrone.modules.hasOwnProperty(name))
      return Tyrone.modules[name];

    var loadJS = function(path) {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", path, false);
      xhr.send(null);

      if (xhr.status == 200) {
        var mod = (new Function("L", xhr.responseText))(this);
        Tyrone.modules[name] = mod;
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
        Tyrone.modules[name] = mod.macros;
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
    else
      return Tyrone.modules[name];
  }


  var ErrorInheritor = function() {}
  ErrorInheritor.prototype = Error.prototype;

  var MacroError = Tyrone.MacroError || function() {
    var tmp = Error.apply(this, arguments);
    tmp.name = this.name = "MacroError";
    this.message = tmp.message;
    Object.defineProperty(this, "stack", {
      get: function() {
        return tmp.stack;
      }
    });
    return this;
  }
  MacroError.prototype = new ErrorInheritor();
  Tyrone.MacroError = MacroError;

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
  ImportError.prototype = new ErrorInheritor();
  Tyrone.ImportError = ImportError;

  var ValueError = Tyrone.ValueError || function() {
    var tmp = Error.apply(this, arguments);
    tmp.name = this.name = "ValueError";
    this.message = tmp.message;
    Object.defineProperty(this, "stack", {
      get: function() {
        return tmp.stack;
      }
    });
    return this;
  }
  ValueError.prototype = new ErrorInheritor();
  Tyrone.ValueError = ValueError;

  ns.Tyrone = Tyrone;

})(window);
