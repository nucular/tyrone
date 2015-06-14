$(function() {
  var tyr = new Tyrone();

  // Overwrite the console functions
  var ocon = {};
  for (var i in console) {
    ocon[i] = console[i];
  }

  // isNaN is weird
  var isReallyNaN = function(a) {
    return isNaN(a) && "number" == typeof a
  };

  // JSON.stringify is weird
  var repr = function(obj, indent) {
    var r = undefined;
    try {
      r = JSON.stringify(obj, function(k, v) {
        if (v === null || v === undefined || isReallyNaN(v) || v === Infinity || v === -Infinity)
          return "\xFFconstant:" + String(v);
        if (v instanceof RegExp)
          return "\xFFregexp:" + v.toString();
        if (typeof v == "function")
          return "\xFFfunction:" + v.toString();
        return v;
      }, (indent != undefined ? indent : 2));

      r = r.replace(/"\xFFconstant:(null|undefined|NaN|Infinity|-Infinity)"/g, "$1");
      r = r.replace(/"\xFFregexp:(.+)"/g, function(_, re) {
        return JSON.parse(re);
      });
      r = r.replace(/"\xFFfunction:(.+)"/g, "$1");
    } catch (e) {
      r = String(obj);
    }
    return r;
  }

  var format = function(args) {
    var s = [];
    for (var i = 0; i < args.length; i++) {
      if (typeof args[i] != "string")
        s.push(repr(args[i]));
      else
        s.push($("<span></span>").text(args[i]));
      if (i != args.length - 1)
        s.push($("<span> </span>"));
    }
    return s;
  }

  console.debug = function() {
    ocon.debug.apply(console, arguments);
    $("#console").prepend($('<pre class="console debug"></pre>').append(format(arguments)));
  };
  console.log = function() {
    ocon.log.apply(console, arguments);
    $("#console").prepend($('<pre class="console log"></pre>').append(format(arguments)));
  };
  console.info = function() {
    ocon.debug.apply(console, arguments);
    $("#console").prepend($('<pre class="console info"></pre>').append(format(arguments)));
  };
  console.warn = function() {
    ocon.warn.apply(console, arguments);
    $("#console").prepend($('<pre class="console warn"></pre>').append(format(arguments)));
  };
  console.error = function() {
    ocon.error.apply(console, arguments);
    $("#console").prepend($('<pre class="console error"></pre>').append(format(arguments)));
  };
  console.dir = function() {
    ocon.dir.apply(console, arguments);
    $("#console").prepend($('<pre class="console dir"></pre>').append(repr(arguments[0])));
  };

  // Evaluate some code
  var evaluate = function(code) {
    try {
      tyr.exec(code);

      // Success
      var io = $('<div class="console iopair"></div>');
      io.append($('<pre class="console input"></pre>').append(code));
      io.append($('<pre class="console output"></pre>').append(repr(tyr.stack, 0)));
      $("#console").prepend(io);
      return true;
    } catch (e) {
      // Failure
      var io = $('<div class="console iopair"></div>');
      io.append($('<pre class="console input"></pre>').append(code));
      io.append($('<pre class="console output error"></pre>').text(e.message));
      $("#console").prepend(io);
      return false;
    }
  }

  // Bind keys on the textarea
  $("#input").on("keypress", function(e) {
    if (e.keyCode == 13) { // enter
      e.preventDefault();
      if (e.shiftKey) {
        $("#input")
          .attr("rows", Number($("#input").attr("rows")) + 1)
          .val($("#input").val() + "\n");
      } else {
        var code = $("#input").val();
        if (code.trim() == "")
          return;
        
        evaluate(code);
      }
    }
  });

  // Show the readme
  $.get("README.md", function(res) {
    console.log(res);
  });
});
