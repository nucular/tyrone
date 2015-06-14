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
  }
};
