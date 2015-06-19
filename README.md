Tyrone
======

Tyrone is a stack-based, semi-esoteric language. It also features a simple
module system and a JS "ffi".

The interpreter state consists of:
- stack (first in, first out)
- macro map (name -> literal)
- context (pointing to a module set by `_`)
- commented flag
- quoted flag
- doublequoted flag

The primary data type are strings. Conversion to numbers is done on-the-fly and
an error is thrown if not possible.
