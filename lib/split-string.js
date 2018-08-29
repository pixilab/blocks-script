/**
  Original Copyright (c) 2015-present, Jon Schlinkert, https://github.com/jonschlinkert/split-string

  Adapted for the Blocks JS runtime by Mika Raunio <mika@imagemaker.fi>
*/
'use strict';

function split(input) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var fn = arguments[2];

  if (typeof input !== 'string') throw new TypeError('expected a string');

  if (typeof options === 'function') {
    fn = options;
    options = {};
  }

  var separator = options.separator || '.';
  var ast = { type: 'root', nodes: [], stash: [''] };
  var stack = [ast];
  var state = { input: input, separator: separator, stack: stack };
  var string = input;
  var value = void 0,
      node = void 0;
  var i = -1;

  state.bos = function () {
    return i === 0;
  };
  state.eos = function () {
    return i === string.length;
  };
  state.prev = function () {
    return string[i - 1];
  };
  state.next = function () {
    return string[i + 1];
  };

  var quotes = options.quotes || [];
  var openers = options.brackets || {};

  if (options.brackets === true) {
    openers = { '[': ']', '(': ')', '{': '}', '<': '>' };
  }
  if (options.quotes === true) {
    quotes = ['"', '\'', '`'];
  }

  var closers = invert(openers);
  var keep = options.keep || function (value) {
    return value !== '\\';
  };

  var block = function block() {
    return state.block = stack[stack.length - 1];
  };
  var peek = function peek() {
    return string[i + 1];
  };
  var next = function next() {
    return string[++i];
  };
  var append = function append(value) {
    state.value = value;
    if (value && keep(value, state) !== false) {
      state.block.stash[state.block.stash.length - 1] += value;
    }
  };

  var closeIndex = function closeIndex(value, startIdx) {
    var idx = string.indexOf(value, startIdx);
    if (idx > -1 && string[idx - 1] === '\\') {
      idx = closeIndex(value, idx + 1);
    }
    return idx;
  };

  for (; i < string.length - 1;) {
    state.value = value = next();
    state.index = i;
    block();

    // handle escaped characters
    if (value === '\\') {
      if (peek() === '\\') {
        append(value + next());
      } else {
        // if the next char is not '\\', allow the "append" function
        // to determine if the backslashes should be added
        append(value);
        append(next());
      }
      continue;
    }

    // handle quoted strings
    if (quotes.indexOf(value) !== -1) {
      var pos = i + 1;
      var idx = closeIndex(value, pos);

      if (idx > -1) {
        append(value); // append opening quote
        append(string.slice(pos, idx)); // append quoted string
        append(string[idx]); // append closing quote
        i = idx;
        continue;
      }

      append(value);
      continue;
    }

    // handle opening brackets, if not disabled
    if (options.brackets !== false && openers[value]) {
      node = { type: 'bracket', nodes: [] };
      node.stash = keep(value) !== false ? [value] : [''];
      node.parent = state.block;
      state.block.nodes.push(node);
      stack.push(node);
      continue;
    }

    // handle closing brackets, if not disabled
    if (options.brackets !== false && closers[value]) {
      if (stack.length === 1) {
        append(value);
        continue;
      }

      append(value);
      node = stack.pop();
      block();
      append(node.stash.join(''));
      continue;
    }

    // push separator onto stash
    if (value === separator && state.block.type === 'root') {
      if (typeof fn === 'function' && fn(state) === false) {
        append(value);
        continue;
      }
      state.block.stash.push('');
      continue;
    }

    // append value onto the last string on the stash
    append(value);
  }

  node = stack.pop();

  while (node !== ast) {
    if (options.strict === true) {
      var column = i - node.stash.length + 1;
      throw new SyntaxError('Unmatched: "' + node.stash[0] + '", at column ' + column);
    }

    value = node.parent.stash.pop() + node.stash.join('.');
    node.parent.stash = node.parent.stash.concat(value.split('.'));
    node = stack.pop();
  }

  return node.stash;
};

function invert(obj) {
  var inverted = {};
  Object.keys(obj).forEach(function (key) {
    inverted[obj[key]] = key;
  });
  return inverted;
}

define(function () {
  return split;
});

