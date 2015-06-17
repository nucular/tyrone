return {
  "eval": function(T, a) {
    if (a == Tyrone.CALL) {
      T.stack.push(
        String(eval(T.stack.pop()))
      );
    }
  },

  "exec": function(T, a) {
    if (a == Tyrone.CALL) {
      eval(T.stack.pop());
    }
  },
  
  "settimeout": function(T, a) {
    if (a == Tyrone.CALL) {
      var t = Number(T.stack.pop());
      var p = T.stack.pop();
      var id = setTimeout(function() {
        T.exec(p);
      }, t);
      T.stack.push(String(id));
    }
  },
  
  "cleartimeout": function(T, a) {
    if (a == Tyrone.CALL) {
      var id = Number(T.stack.pop());
      clearTimeout(id);
    }
  },
  
  "setinterval": function(T, a) {
    if (a == Tyrone.CALL) {
      var t = Number(T.stack.pop());
      var p = T.stack.pop();
      var id = setInterval(function() {
        T.exec(p);
      }, t);
      T.stack.push(String(id));
    }
  },
  
  "clearinterval": function(T, a) {
    if (a == Tyrone.CALL) {
      var id = Number(T.stack.pop());
      clearInterval(id);
    }
  }
};
