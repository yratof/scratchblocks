/*
 * scratchblocks
 * http://scratchblocks.github.io/
 *
 * Copyright 2013, Tim Radvan
 * @license MIT
 * http://opensource.org/licenses/MIT
 */

/*
 * The following classes are used:
 *
 * Categories:
 *
 *     sb2
 *     inline-block
 *     script
 *     empty
 *
 * Comments:
 *
 *     comment
 *     attached
 *     to-hat
 *     to-reporter
 *
 * Shapes:
 *
 *     hat                |- Blocks  (These come from the database, the rest
 *     cap                |           come from the parsed code.)
 *
 *     stack              |
 *     embedded           |- Blocks
 *     boolean            |
 *
 *     reporter           |- This one's kinda weird.
 *                           "embedded" and "reporter" should really be the
 *                           same thing, but are separate due to some
 *                           implementation detail that I don't even remember.
 *
 *     string             |
 *     dropdown           |
 *     number             |
 *     number-dropdown    |- Inserts
 *     color              |
 *     define-hat         |
 *     outline            |
 *
 *     cstart |
 *     celse  |- Parser directives. (Used in the database to tell the parser
 *     cend   |                      to create the C blocks.)
 *
 *     cmouth |
 *     cwrap  |- Only used in the CSS code
 *     capend |
 *
 *     ring
 *     ring-inner
 *
 * Categories (colour):
 *
 *     motion
 *     looks
 *     sound
 *     pen
 *     variables
 *     list
 *
 *     events
 *     control
 *     sensing
 *     operators
 *
 *     custom
 *     custom-arg
 *     extension -- Sensor blocks
 *     grey -- for the ". . ." ellipsis block
 *
 *     obsolete
 *
*/

String.prototype.startsWith = function(prefix) {
  return this.indexOf(prefix) === 0;
};

String.prototype.endsWith = function(suffix) {
  return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

String.prototype.contains = function(substring) {
  return this.indexOf(substring) !== -1;
};

String.prototype.trimLeft = function() {
  return this.replace(/^\s+/, "");
}

String.prototype.trimRight = function() {
  return this.replace(/\s+$/, "");
}



var scratchblocks = function () {
  "use strict";

  function assert(bool) {
    if (!bool) throw "Assertion failed!";
  }



  // List of classes we're allowed to override.

  var override_categories = ["motion", "looks", "sound", "pen",
    "variables", "list", "events", "control", "sensing",
    "operators", "custom", "custom-arg", "extension", "grey",
    "obsolete"];
  var override_flags = ["cstart", "celse", "cend", "ring"];
  var override_shapes = ["hat", "cap", "stack", "embedded",
    "boolean", "reporter"];



  /*** Database ***/

  // First, initialise the blocks database.

  /*
   * We need to store info such as category and shape for each block.
   *
   * This can be indexed in two ways:
   *
   *  - by the text input to the parser, minus the insert parts
   *
   *      (eg. "say [Hi!] for (3) secs" is minifed to "sayforsecs", which we
   *           then look up in the database
   *
   *  - by a language code & blockid
   *
   *      (eg. "de" & "say _ for _ secs")
   *
   *      This is used by external add-ons for translating between languages,
   *      and won't get used internally.
   *
   * Some definitions:
   *
   *  - spec: The spec for the block, with underscores representing inserts.
   *          May be translated.
   *          eg. "sage _ für _ Sek."
   *
   *  - blockid: the English spec.
   *          eg. "say _ for _ secs"
   *
   */

  var strings = {
    aliases: {},

    define: [],
    ignorelt: [],
    math: [],
    osis: [],
  };

  // languages that should be displayed right to left
  var rtl_languages = ['ar', 'fa', 'he'];

  var languages = {};
  var block_info_by_id = block_info_by_id = {};
  var block_by_text = {};
  var blockids = []; // Used by load_language

  // Build the English blocks.

  var english = {
    code: "en",

    aliases: {
      "turn left _ degrees": "turn @arrow-ccw _ degrees",
      "turn ccw _ degrees": "turn @arrow-ccw _ degrees",
      "turn ↺ _ degrees": "turn @arrow-ccw _ degrees",
        "turn right _ degrees": "turn @arrow-cw _ degrees",
        "turn cw _ degrees": "turn @arrow-cw _ degrees",
          "turn ↻ _ degrees": "turn @arrow-cw _ degrees",
          "when gf clicked": "when @green-flag clicked",
            "when flag clicked": "when @green-flag clicked",
            "when green flag clicked": "when @green-flag clicked",
              "when ⚑ clicked": "when @green-flag clicked",
    },

    define: ["define"],

      // For ignoring the lt sign in the "when distance < _" block
    ignorelt: ["when distance"],

      // Valid arguments to "of" dropdown, for resolving ambiguous situations
    math: ["abs", "floor", "ceiling", "sqrt", "sin", "cos", "tan", "asin",
      "acos", "atan", "ln", "log", "e ^", "10 ^"],

      // For detecting the "stop" cap / stack block
    osis: ["other scripts in sprite", "other scripts in stage"],

    blocks: [], // These are defined just below

    palette: { // Currently unused
      "Control": "Control",
      "Data": "Data",
      "Events": "Events",
      "Looks": "Looks",
        "More Blocks": "More Blocks",
      "Motion": "Motion",
      "Operators": "Operators",
      "Pen": "Pen",
      "Sensing": "Sensing",
      "Sound": "Sound",
      "List": "Lists",
      "Variables": "Variables",
    },
  };

  var image_text = {
    "arrow-cw": "↻",
    "arrow-ccw": "↺",
  };

  var english_blocks = [
    ["motion"],

    ["move _ steps", []],
    ["turn @arrow-ccw _ degrees", []],
    ["turn @arrow-cw _ degrees", []],

    ["point in direction _", []],
    ["point towards _", []],

    ["go to x:_ y:_", []],
    ["go to _", []],
    ["glide _ secs to x:_ y:_", []],

    ["change x by _", []],
    ["set x to _", []],
    ["change y by _", []],
    ["set y to _", []],

    ["if on edge, bounce", []],

    ["set rotation style _", []],

    ["x position", []],
    ["y position", []],
    ["direction", []],



    ["looks"],

    ["say _ for _ secs", []],
    ["say _", []],
    ["think _ for _ secs", []],
    ["think _", []],

    ["show", []],
    ["hide", []],

    ["switch costume to _", []],
    ["next costume", []],
    ["switch backdrop to _", []],

    ["change _ effect by _", []],
    ["set _ effect to _", []],
    ["clear graphic effects", []],

    ["change size by _", []],
    ["set size to _%", []],

    ["go to front", []],
    ["go back _ layers", []],

    ["costume #", []],
    ["backdrop name", []],
    ["size", []],

    // Stage-specific

    ["switch backdrop to _ and wait", []],
    ["next backdrop", []],

    ["backdrop #", []],

    // Scratch 1.4

    ["switch to costume _", []],

    ["switch to background _", []],
    ["next background", []],
    ["background #", []],



    ["sound"],

    ["play sound _", []],
    ["play sound _ until done", []],
    ["stop all sounds", []],

    ["play drum _ for _ beats", []],
    ["rest for _ beats", []],

    ["play note _ for _ beats", []],
    ["set instrument to _", []],

    ["change volume by _", []],
    ["set volume to _%", []],
    ["volume", []],

    ["change tempo by _", []],
    ["set tempo to _ bpm", []],
    ["tempo", []],



    ["pen"],

    ["clear", []],

    ["stamp", []],

    ["pen down", []],
    ["pen up", []],

    ["set pen color to _", []],
    ["change pen color by _", []],
    ["set pen color to _", []],

    ["change pen shade by _", []],
    ["set pen shade to _", []],

    ["change pen size by _", []],
    ["set pen size to _", []],



    ["variables"],

    ["set _ to _", []],
    ["change _ by _", []],
    ["show variable _", []],
    ["hide variable _", []],



    ["list"],

    ["add _ to _", []],

    ["delete _ of _", []],
    ["insert _ at _ of _", []],
    ["replace item _ of _ with _", []],

    ["item _ of _", []],
    ["length of _", []],
    ["_ contains _", []],

    ["show list _", []],
    ["hide list _", []],



    ["events"],

    ["when @green-flag clicked", ["hat"]],
    ["when _ key pressed", ["hat"]],
    ["when this sprite clicked", ["hat"]],
    ["when Stage clicked", ["hat"]],
    ["when backdrop switches to _", ["hat"]],

    ["when _ > _", ["hat"]],

    ["when I receive _", ["hat"]],
    ["broadcast _", []],
    ["broadcast _ and wait", []],



    ["control"],

    ["wait _ secs", []],

    ["repeat _", ["cstart"]],
    ["forever", ["cstart", "cap"]],
    ["if _ then", ["cstart"]],
    ["else", ["celse"]],
    ["end", ["cend"]],
    ["wait until _", []],
    ["repeat until _", ["cstart"]],

    ["stop _", ["cap"]],

    ["when I start as a clone", ["hat"]],
    ["create clone of _", []],
    ["delete this clone", ["cap"]],

    // Scratch 1.4

    ["if _", ["cstart"]],
    ["forever if _", ["cstart", "cap"]],
    ["stop script", ["cap"]],
    ["stop all", ["cap"]],



    ["sensing"],

    ["touching _?", []],
    ["touching color _?", []],
    ["color _ is touching _?", []],
    ["distance to _", []],

    ["ask _ and wait", []],
    ["answer", []],

    ["key _ pressed?", []],
    ["mouse down?", []],
    ["mouse x", []],
    ["mouse y", []],

    ["loudness", []],

    ["video _ on _", []],
    ["turn video _", []],
    ["set video transparency to _%", []],

    ["timer", []],
    ["reset timer", []],

    ["_ of _", []],

    ["current _", []],
    ["days since 2000", []],
    ["username", []],

    // Scratch 1.4

    ["loud?", []],



    ["operators"],

    ["_ + _", []],
    ["_ - _", []],
    ["_ * _", []],
    ["_ / _", []],

    ["pick random _ to _", []],

    ["_ < _", []],
    ["_ = _", []],
    ["_ > _", []],

    ["_ and _", []],
    ["_ or _", []],
    ["not _", []],

    ["join _ _", []],
    ["letter _ of _", []],
    ["length of _", []],

    ["_ mod _", []],
    ["round _", []],

    ["_ of _", []],



    ["extension"],

    // PicoBoard

    ["when _", ["hat"]],
    ["when _ _ _", ["hat"]],
    ["sensor _?", []],
    ["_ sensor value", []],

    // LEGO WeDo

    ["turn _ on for _ secs", []],
    ["turn _ on", []],
    ["turn _ off", []],
    ["set _ power _", []],
    ["set _ direction _", []],
    ["when distance _ _", ["hat"]],
    ["when tilt _ _", ["hat"]],
    ["distance", []],
    ["tilt", []],

    // LEGO WeDo (old)

    ["turn motor on for _ secs", []],
    ["turn motor on", []],
    ["turn motor off", []],
    ["set motor power _", []],
    ["set motor direction _", []],
    ["when distance < _", ["hat"]],
    ["when tilt = _", ["hat"]],

    // Scratch 1.4

    ["motor on", []],
    ["motor off", []],
    ["motor on for _ secs", []],
    ["motor power _", []],
    ["motor direction _", []],



    ["grey"],

    ["…", []],
    ["...", []],
  ];

  // The blockids are the same as english block text, so we build the blockid
  // list at the same time.

  var category = null;
  for (var i=0; i<english_blocks.length; i++) {
    if (english_blocks[i].length === 1) { // [category]
      category = english_blocks[i][0];
    } else {                              // [block id, [list of flags]]
      var block_and_flags = english_blocks[i],
          spec = block_and_flags[0], flags = block_and_flags[1];
      english.blocks.push(spec);

      blockids.push(spec); // Other languages will just provide a list of
      // translations, which is matched up with this
      // list.

      // Now store shape/category info.
      var info = {
        blockid: spec,
        category: category,
      };

      while (flags.length) {
        var flag = flags.pop();
        switch (flag) {
          case "hat":
          case "cap":
            info.shape = flag;
            break;
          default:
            assert(!info.flag);
            info.flag = flag;
        }
      }

      var image_match = /@([-A-z]+)/.exec(spec);
      if (image_match) {
        info.image_replacement = image_match[1];
      }

      block_info_by_id[spec] = info;
    }
  }

  // Built english, now add it.

  load_language(english);

  function load_language(language) {
    language = clone(language);

    var iso_code = language.code;
    delete language.code;

    // convert blocks list to a dict.
    var block_spec_by_id = {};
    for (var i=0; i<language.blocks.length; i++) {
      var spec = language.blocks[i],
          blockid = blockids[i];
      spec = spec.replace(/@[-A-z]+/, "@"); // remove images
      block_spec_by_id[blockid] = spec;

      // Add block to the text lookup dict.
      var minispec = minify(normalize_spec(spec));
      if (minispec) block_by_text[minispec] = {
        blockid: blockid,
        lang: iso_code,
      };
    }
    language.blocks = block_spec_by_id;

    // add aliases (for images)
    for (var text in language.aliases) {
      strings.aliases[text] = language.aliases[text];

      // Add alias to the text lookup dict.
      var minispec = minify(normalize_spec(text));
      block_by_text[minispec] = {
        blockid: language.aliases[text],
        lang: iso_code,
      };
    }

    // add stuff to strings
    for (var key in strings) {
      if (strings[key].constructor === Array) {
        for (i=0; i<language[key].length; i++) {
          if (language[key][i]) {
            strings[key].push(minify(language[key][i]));
          }
        }
      }
    }

    languages[iso_code] = language;
  }
  load_language = load_language;

  // Store initial state.
  var _init_strings = clone(strings);
  var _init_languages = clone(languages);
  var _init_block_by_text = clone(block_by_text);

  var reset_languages = function(language) {
    strings = clone(_init_strings);
    languages = clone(_init_languages);
    block_by_text = clone(_init_block_by_text);
  }

  // Hacks for certain blocks.

  block_info_by_id["_ of _"].hack = function (info, args) {
    // Operators if math function, otherwise sensing "attribute of" block
    if (!args.length) return;
    var func = minify(strip_brackets(args[0]).replace(/ v$/, ""));
    if (func == "e^") func = "e ^";
    if (func == "10^") func = "10 ^";
    info.category = (strings.math.indexOf(func) > -1) ? "operators"
      : "sensing";
  }

  block_info_by_id["length of _"].hack = function (info, args) {
    // List block if dropdown, otherwise operators
    if (!args.length) return;
    info.category = (/^\[.* v\]$/.test(args[0])) ? "list"
      : "operators";
  }

  block_info_by_id["stop _"].hack = function (info, args) {
    // Cap block unless argument is "other scripts in sprite"
    if (!args.length) return;
    var what = minify(strip_brackets(args[0]).replace(/ v$/, ""));
    info.shape = (strings.osis.indexOf(what) > -1) ? null
      : "cap";
  }

  // Define function for getting block info by text.

  function find_block(spec, args) {
    var minitext = minify(spec);
    if (minitext in block_by_text) {
      var lang_and_id = block_by_text[minitext];
      var blockid = lang_and_id.blockid;
      var info = clone(block_info_by_id[blockid]);
      info.lang = lang_and_id.lang;
      if (info.image_replacement) {
        info.spec = languages[lang_and_id.lang].blocks[blockid];
      } else {
        if (spec === "..." || spec === "…") spec = ". . .";
        info.spec = spec;
      }
      if (info.hack) info.hack(info, args);
      return info;
    }
    if (spec.replace(/ /g, "") === "...") return find_block("...");
  }

  // Utility function that deep clones dictionaries/lists.

  function clone(val) {
    if (val == null) return val;
    if (val.constructor == Array) {
      return val.map(clone);
    } else if (typeof val == "object") {
      var result = {}
      for (var key in val) {
        result[clone(key)] = clone(val[key]);
      }
      return result;
    } else {
      return val;
    }
  }

  // Text minifying functions normalise block text before lookups.

  function minify(text) {
    var minitext = text.replace(/[.,%?:▶◀▸◂]/g, "").toLowerCase()
      .replace(/[ \t]+/g, " ").trim();
    minitext = (minitext
      .replace("ß", "ss")
      .replace("ü", "u")
      .replace("ö", "o")
      .replace("ä", "a")
    )
    if (!minitext && text.replace(" ", "") === "...") minitext = "...";
    return minitext;
  }

  // Insert padding around arguments in spec

  function normalize_spec(spec) {
    return spec.replace(/([^ ])_/g, "$1 _").replace(/_([^ ])/g, "_ $1");
  }

  /*** Parse block ***/

  var BRACKETS = "([<{)]>}";

  // Various bracket-related utilities...

  function is_open_bracket(chr) {
    var bracket_index = BRACKETS.indexOf(chr);
    return (-1 < bracket_index && bracket_index < 4);
  }

  function is_close_bracket(chr) {
    return (3 < BRACKETS.indexOf(chr));
  }

  function get_matching_bracket(chr) {
    return BRACKETS[BRACKETS.indexOf(chr) + 4];
  }

  // Strip one level of brackets from around a piece.

  function strip_brackets(code) {
    if (is_open_bracket(code[0])) {
      var bracket = code[0];
      if (code[code.length - 1] === get_matching_bracket(bracket)) {
        code = code.substr(0, code.length - 1);
      }
      code = code.substr(1);
    }
    return code;
  }

  // Split the block code into text and inserts based on brackets.

  function split_into_pieces(code) {
    var pieces = [],
        piece = "",
        matching_bracket = "",
        nesting = [];

    for (var i=0; i<code.length; i++) {
      var chr = code[i];

      if (nesting.length > 0) {
        piece += chr;
        if (is_open_bracket(chr) && !is_lt_gt(code, i) &&
            nesting[nesting.length - 1] !== "[") {
          nesting.push(chr);
          matching_bracket = get_matching_bracket(chr);
        } else if (chr === matching_bracket && !is_lt_gt(code, i)) {
          nesting.pop();
          if (nesting.length === 0) {
            pieces.push(piece);
            piece = "";
          } else {
            matching_bracket = get_matching_bracket(
                nesting[nesting.length - 1]
                );
          }
        }
      } else {
        if (is_open_bracket(chr) && !is_lt_gt(code, i)) {
          nesting.push(chr);
          matching_bracket = get_matching_bracket(chr);

          if (piece) pieces.push(piece);
          piece = "";
        }
        piece += chr;
      }
    }
    if (piece) pieces.push(piece); // last piece
    return pieces;
  }

  // A piece is a block if it starts with a bracket.

  function is_block(piece) {
    return piece && is_open_bracket(piece[0]);
  }

  // Function for filtering pieces to get block text & args
  function filter_pieces(pieces) {
    var spec = "";
    var args = [];
    for (var i=0; i<pieces.length; i++) {
      var piece = pieces[i];
      if (is_block(piece) || typeof piece === "object") {
        args.push(piece);
        spec += "_";
      } else {
        spec += piece;
      }
    }
    return {spec: normalize_spec(spec), args: args};
  }

  // Take block code and return block info object.

  function parse_block(code, context, dont_strip_brackets) {
    // strip brackets
    var bracket;
    if (!dont_strip_brackets) {
      bracket = code.charAt(0);
      code = strip_brackets(code);
    }

    // split into text segments and inserts
    var pieces = split_into_pieces(code);

    // define hat?
    for (var i=0; i<strings.define.length; i++) {;;
      var define_text = strings.define[i];
      if (code.toLowerCase() === define_text || (pieces[0] &&
            pieces[0].toLowerCase().startsWith(define_text+" "))) {
        pieces[0] = pieces[0].slice(define_text.length).trimLeft();

        for (var i=0; i<pieces.length; i++) {
          var piece = pieces[i];
          if (is_block(piece)) {
            piece = {
              shape: get_custom_arg_shape(piece.charAt(0)),
              category: "custom-arg",
              pieces: [strip_brackets(piece).trim()],
            };
          }
          pieces[i] = piece;
        }

        return {
          shape: "define-hat",
          category: "custom",
          pieces: [code.slice(0, define_text.length), {
            shape: "outline",
            pieces: pieces,
          }],
        };
      }
    }

    // get shape
    var shape, isablock;
    if (pieces.length > 1 && bracket !== "[") {
      shape = get_block_shape(bracket);
      isablock = true;
    } else {
      shape = get_insert_shape(bracket, code);
      isablock = ["reporter", "boolean", "stack"].indexOf(shape) !== -1;
      if (shape.contains("dropdown")) {
        code = code.substr(0, code.length - 2);
      }
    }

    // insert?
    if (!isablock) {
      return {
        shape: shape,
        pieces: [code],
      };
    }

    // trim ends
    if (pieces.length) {
      pieces[0] = pieces[0].trimLeft();
      pieces[pieces.length-1] = pieces[pieces.length-1].trimRight();
    }

    // filter out block text & args
    var filtered = filter_pieces(pieces);
    var spec = filtered.spec;
    var args = filtered.args;

    // override attrs?
    var overrides;
    var match = /^(.*)::([A-z\- ]*)$/.exec(spec);
    if (match) {
      spec = match[1].trimRight();
      overrides = match[2].trim().split(/\s+/);
      while (overrides[overrides.length - 1] === "") overrides.pop();
      if (!overrides.length) overrides = undefined;
    }

    // get category & related block info
    if (spec) var info = find_block(spec, args);

    if (info) {
      if (!info.shape) info.shape = shape;
      if (info.flag === "cend") info.spec = "";
    } else {
      // unknown block
      info = {
        blockid: spec,
        shape: shape,
        category: (shape === "reporter") ? "variables" : "obsolete",
        lang: "en",
        spec: spec,
        args: args,
      };

      // For recognising list reporters & custom args
      if (info.shape === "reporter" || info.shape === "boolean") {
        var name = info.spec;
        if (!(name in context.variable_reporters)) {
          context.variable_reporters[name] = [];
        }
        context.variable_reporters[name].push(info);
      }
    }

    // rebuild pieces (in case text has changed) and parse arguments
    var pieces = [];
    var text_parts = info.spec.split((info.blockid === "_ + _")
        ? /([_@▶◀▸◂])/ : /([_@▶◀▸◂+])/);
    for (var i=0; i<text_parts.length; i++) {
      var part = text_parts[i];
      if (part === "_") {
        var arg = args.shift();
        if (arg === undefined) {
          part = "_";
          /* If there are no args left, then the underscore must
           * really be an underscore and not an insert.
           *
           * This only becomes a problem if the code contains
           * underscores followed by inserts.
           */
        } else {
          part = parse_block(arg, context);
        }
      }
      if (part) pieces.push(part);
    }
    delete info.spec;
    delete info.args;
    info.pieces = pieces;

    if (overrides) {
      for (var i=0; i<overrides.length; i++) {
        var value = overrides[i];
        if (override_categories.indexOf(value) > -1) {
          info.category = value;
        } else if (override_flags.indexOf(value) > -1) {
          info.flag = value;
        } else if (override_shapes.indexOf(value) > -1) {
          info.shape = value;
        }
      }

      // Tag ring-inner pieces
      if (info.flag === "ring") {
        for (var i=0; i<info.pieces.length; i++) {
          var part = info.pieces[i];
          if (typeof part == "object") {
            part.is_ringed = true;
          }
        }
      }
    } else {
      // For recognising list reporters
      var list_block_name = {
        "add _ to _": 1,
        "delete _ of _": 1,
        "insert _ at _ of _": 2,
          "replace item _ of _ with _": 1,
          "item _ of _": 1,
            "length of _": 0,
            "_ contains _": 0,
              "show list _": 0,
              "hide list _": 0,
      };
      if (info.blockid in list_block_name) {
        var index = list_block_name[info.blockid];
        var args = filter_pieces(info.pieces).args;
        var arg = args[index];
        if (arg && arg.shape === "dropdown") {
          context.lists.push(arg.pieces[0]);
        }
      }
    }

    return info;
  }

  // Return block info object for line, including comment.

  function parse_line(line, context) {
    line = line.trim();

    // comments
    var comment;

    var i = line.indexOf("//");
    if (i !== -1 && line[i-1] !== ":") {
      comment = line.slice(i+2);
      line    = line.slice(0, i).trim();

      // free-floating comment?
      if (!line.trim()) return {blockid: "//", comment: comment,
        pieces: []};
    }

    var info;
    if (is_open_bracket(line.charAt(0))
        && split_into_pieces(line).length === 1) {
      // reporter
      info = parse_block(line, context); // don't strip brackets

      if (!info.category) { // cheap test for inserts.
        // Put free-floating inserts in their own stack block.
        info = {blockid: "_", category: "obsolete", shape: "stack",
          pieces: [info]};
      }
    } else {
      // normal stack block
      info = parse_block(line, context, true);
      // true = don't strip brackets
    }

    // category hack (DEPRECATED)
    if (comment && info.shape !== "define-hat") {
      var match = /(^| )category=([a-z]+)($| )/.exec(comment);
      if (match && override_categories.indexOf(match[2]) > -1) {
        info.category = match[2];
        comment = comment.replace(match[0], " ").trim();
      }
    }

    // For recognising custom blocks and their arguments
    if (info.shape === "define-hat") {
      var pieces = info.pieces[1].pieces;
      var filtered = filter_pieces(pieces);
      var minispec = minify(filtered.spec);
      context.define_hats.push(minispec);
      for (var i=0; i<filtered.args.length; i++) {
        context.custom_args.push(filtered.args[i].pieces[0]);
      }
    }
    if (info.shape === "stack" && info.category === "obsolete") {
      var minispec = minify(filter_pieces(info.pieces).spec);
      if (!(minispec in context.obsolete_blocks)) {
        context.obsolete_blocks[minispec] = [];
      }
      context.obsolete_blocks[minispec].push(info);
    }

    if (comment !== undefined && !comment.trim()) comment = undefined;
    info.comment = comment;
    return info;
  }

  // Functions to get shape from code.

  function get_block_shape(bracket) {
    switch (bracket) {
      case "(": return "embedded";
      case "<": return "boolean";
      case "{": default: return "stack";
    }
  }

  function get_insert_shape(bracket, code) {
    switch (bracket) {
      case "(":
        if (/^([0-9e.-]+( v)?)?$/i.test(code)) {
          if (code.endsWith(" v")) {
            return "number-dropdown";
          } else {
            return "number";
          }
        } else if (code.endsWith(" v")) {
          // rounded dropdowns (not actually number)
          return "number-dropdown";
        } else {
          // reporter (or embedded! TODO remove this comment)
          return "reporter";
        }
      case "[":
        if (/^#[a-f0-9]{3}([a-f0-9]{3})?$/i.test(code)) {
          return "color";
        } else {
          if (code.endsWith(" v")) {
            return "dropdown";
          } else {
            return "string";
          }
        }
      case "<":
        return "boolean";
      default:
        return "stack";
    }
  }

  function get_custom_arg_shape(bracket) {
    switch (bracket) {
      case "<": return "boolean";
      default:  return "reporter";
    }
  }

  // Check whether angle brackets are supposed to be lt/gt blocks.

  /*
   * We need a way to parse eg.
   *
   *      if <[6] < [3]> then
   *
   *  Obviously the central "<" should be ignored by split_into_pieces.
   *
   *  In addition, we need to handle blocks containing a lt symbol:
   *
   *      when distance < (30)
   *
   *  We do this by matching against `strings.ignorelt`.
   */

  // Returns true if it's lt/gt, false if it's an open/close bracket.

  function is_lt_gt(code, index) {
    var chr, i;

    if ((code[index] !== "<" && code[index] !== ">") ||
        index === code.length || index === 0) {
      return false;
    }

    // hat block containing lt symbol?
    for (var i=0; i<strings.ignorelt.length; i++) {
      var when_dist = strings.ignorelt[i];
      if (minify(code.substr(0, index)).startsWith(when_dist)) {
        return true; // don't parse as a boolean
      }
    }

    // look for open brackets ahead
    for (i = index + 1; i < code.length; i++) {
      chr = code[i];
      if (is_open_bracket(chr)) {
        break; // might be an innocuous lt/gt!
      }
      if (chr !== " ") {
        return false; // something else => it's a bracket
      }
    }

    // look for close brackets behind
    for (i = index - 1; i > -1; i--) {
      chr = code[i];
      if (is_close_bracket(chr)) {
        break; // must be an innocuous lt/gt!
      }
      if (chr !== " ") {
        return false; // something else => it's a bracket
      }
    }

    // we found a close bracket behind and an open bracket ahead, eg:
    //      ) < [
    return true; // it's an lt/gt block!
  }



  /*** Parse scripts ***/

  // Take scratchblocks text and turn it into useful objects.

  function oldParser(code) {
    var context = {obsolete_blocks: {}, define_hats: [], custom_args: [],
        variable_reporters: {}, lists: []};
    var scripts = [];
    var nesting = [[]];
    var lines = code.trim().split("\n");

    function new_script() {
      if (nesting[0].length) {
        while (nesting.length > 1) {
          do_cend({blockid: "end", category: "control",
            flag: "cend", shape: "stack", pieces: []});
        }
        scripts.push(nesting[0]);
        nesting = [[]];
      }
      current_script = nesting[nesting.length - 1];
    }

    function do_cend(info) {
      // pop the innermost script off the stack
      var cmouth = nesting.pop(); // cmouth contents
      if (cmouth.length && cmouth[cmouth.length - 1].shape == "cap") {
        // last block is a cap block
        info.flag += " capend";
      }
      var cwrap = nesting.pop();
      info.category = cwrap[0].category; // category of c block
      cwrap.push(info);
    }

    for (i=0; i<lines.length; i++) {
      var line = lines[i].trim();

      if (!line) {
        if (nesting.length <= 1) new_script();
        continue;
      }

      var current_script = nesting[nesting.length - 1];

      var info = parse_line(lines[i], context);

      if (!info.pieces.length && info.comment !== undefined
          && nesting.length <= 1) {
        new_script();
        current_script.push(info);
        new_script();
        continue;
      }

      switch (info.flag || info.shape) {
        case "hat":
        case "define-hat":
          new_script();
          current_script.push(info);
          break;

        case "cap":
          current_script.push(info);
          if (nesting.length <= 1) new_script();
          break;

        case "cstart":
          var cwrap = {
            type: "cwrap",
            shape: info.shape,
            contents: [info],
          };
          info.shape = "stack";
          current_script.push(cwrap);
          nesting.push(cwrap.contents);
          var cmouth = {type: "cmouth", contents: [],
                        category: info.category};
          cwrap.contents.push(cmouth);
          nesting.push(cmouth.contents);
          break;

        case "celse":
          if (nesting.length <= 1) {
            current_script.push(info);
            break;
          }
          var cmouth = nesting.pop(); // old cmouth contents
          if (cmouth.length
              && cmouth[cmouth.length - 1].shape == "cap") {
            // last block is a cap block
            info.flag += " capend";
          }
          var cwrap = nesting[nesting.length - 1]; // cwrap contents
          info.category = cwrap[0].category; // category of c block
          cwrap.push(info);
          var cmouth = {type: "cmouth", contents: [],
                        category: cwrap[0].category};
          cwrap.push(cmouth);
          nesting.push(cmouth.contents);
          break;

        case "cend":
          if (nesting.length <= 1) {
            current_script.push(info);
            break;
          }
          do_cend(info);
          break;

        case "reporter":
        case "boolean":
        case "embedded":
        case "ring":
          // put free-floating reporters in a new script
          new_script();
          current_script.push(info);
          new_script();
          break;

        default:
          current_script.push(info);
      }
    }
    new_script();

    // Recognise custom blocks
    for (var i=0; i<context.define_hats.length; i++) {
      var minispec = context.define_hats[i];
      var custom_blocks = context.obsolete_blocks[minispec];
      if (!custom_blocks) continue;
      for (var j=0; j<custom_blocks.length; j++) {
        custom_blocks[j].category = "custom";
      }
    }

    // Recognise list reporters
    for (var i=0; i<context.lists.length; i++) {
      var name = context.lists[i];
      var list_reporters = context.variable_reporters[name];
      if (!list_reporters) continue;
      for (var j=0; j<list_reporters.length; j++) {
        list_reporters[j].category = "list";
      }
    }

    // Recognise custom args
    for (var i=0; i<context.custom_args.length; i++) {
      var name = context.custom_args[i];
      var custom_args = context.variable_reporters[name];
      if (!custom_args) continue;
      for (var j=0; j<custom_args.length; j++) {
        custom_args[j].category = "custom-arg";
      }
    }

    return scripts;
  }

  /*****************************************************************************/


  /* utils */

  function extend(src, dest) {
    src = src || {};
    dest = dest || {};
    for (var key in src) {
      if (src.hasOwnProperty(key) && !dest.hasOwnProperty(key)) {
        dest[key] = src[key];
      }
    }
    return dest;
  }

  /* for constucting SVGs */

  var xml = new DOMParser().parseFromString('<xml></xml>',  "application/xml")
  function cdata(content) {
    return xml.createCDATASection(content);
  }

  function el(name, props) {
    var el = document.createElementNS("http://www.w3.org/2000/svg", name);
    return setProps(el, props);
  }

  var directProps = {
    textContent: true,
  };
  function setProps(el, props) {
    for (var key in props) {
      var value = '' + props[key];
      if (directProps[key]) {
        el[key] = value;
      } else if (/^xlink:/.test(key)) {
        el.setAttributeNS("http://www.w3.org/1999/xlink", key.slice(6), value);
      } else if (props[key] !== null && props.hasOwnProperty(key)) {
        el.setAttributeNS(null, key, value);
      }
    }
    return el;
  }

  function withChildren(el, children) {
    for (var i=0; i<children.length; i++) {
      el.appendChild(children[i]);
    }
    return el;
  }

  function group(children) {
    return withChildren(el('g'), children);
  }

  function newSVG(width, height) {
    return el('svg', {
      version: "1.1",
      width: width,
      height: height,
    });
  }

  function polygon(props) {
    return el('polygon', extend(props, {
      points: props.points.join(" "),
    }));
  }

  function path(props) {
    return el('path', extend(props, {
      path: null,
      d: props.path.join(" "),
    }));
  }

  function text(x, y, content, props) {
    var text = el('text', extend(props, {
      x: x,
      y: y,
      textContent: content,
    }));
    return text;
  }

  function symbol(href) {
    return el('use', {
      'xlink:href': href,
    });
  }

  function translate(dx, dy, el) {
    setProps(el, {
      transform: ['translate(', dx, ' ', dy, ')'].join(''),
    });
    return el;
  }

  function translatePath(dx, dy, path) {
    var isX = true;
    var parts = path.split(" ");
    var out = [];
    for (var i=0; i<parts.length; i++) {
      var part = parts[i];
      if (part === 'A') {
        var j = i + 5;
        out.push('A');
        while (i < j) {
          out.push(parts[++i]);
        }
        continue;
      } else if (/[A-Za-z]/.test(part)) {
        assert(isX);
      } else {
        part = +part;
        part += isX ? dx : dy;
        isX = !isX;
      }
      out.push(part);
    }
    return out.join(" ");
  }


  /* shapes */

  function rect(w, h, props) {
    return el('rect', extend(props, {
      x: 0,
      y: 0,
      width: w,
      height: h,
    }));
  }

  function arc(p1x, p1y, p2x, p2y, rx, ry) {
    var r = p2y - p1y;
    return ["L", p1x, p1y, "A", rx, ry, 0, 0, 1, p2x, p2y].join(" ");
  }

  function arcw(p1x, p1y, p2x, p2y, rx, ry) {
    var r = p2y - p1y;
    return ["L", p1x, p1y, "A", rx, ry, 0, 0, 0, p2x, p2y].join(" ");
  }

  function roundedRect(w, h, props) {
    var r = h / 2;
    return path(extend(props, {
      path: [
        "M", r, 0,
        arc(w - r, 0, w - r, h, r, r),
        arc(r, h, r, 0, r, r),
        "Z"
      ],
    }));
  }

  function pointedRect(w, h, props) {
    var r = h / 2;
    return path(extend(props, {
      path: [
        "M", r, 0,
        "L", w - r, 0, w, r,
        "L", w, r, w - r, h,
        "L", r, h, 0, r,
        "L", 0, r, r, 0,
        "Z",
      ],
    }));
  }

  function getTop(w) {
    return ["M", 0, 3,
      "L", 3, 0,
      "L", 13, 0,
      "L", 16, 3,
      "L", 24, 3,
      "L", 27, 0,
      "L", w - 3, 0,
      "L", w, 3
    ].join(" ");
  }

  function getRightAndBottom(w, y, hasNotch, inset) {
    if (typeof inset === "undefined") {
      inset = 0;
    }
    var arr = ["L", w, y - 3,
      "L", w - 3, y
    ];
    if (hasNotch) {
      arr = arr.concat([
        "L", inset + 27, y,
        "L", inset + 24, y + 3,
        "L", inset + 16, y + 3,
        "L", inset + 13, y
      ]);
    }
    if (inset > 0) {
      arr = arr.concat([
        "L", inset + 2, y,
        "L", inset, y + 2
      ])
    } else {
      arr = arr.concat([
        "L", inset + 3, y,
        "L", 0, y - 3
      ]);
    }
    return arr.join(" ");
  }

  function getArm(w, armTop) {
    return [
      "L", 15, armTop - 2,
      "L", 15 + 2, armTop,
      "L", w - 3, armTop,
      "L", w, armTop + 3
    ].join(" ");
  }


  function stackRect(w, h, props) {
    return path(extend(props, {
      path: [
        getTop(w),
        getRightAndBottom(w, h, true, 0),
        "Z",
      ],
    }));
  }

  function capRect(w, h, props) {
    return path(extend(props, {
      path: [
        getTop(w),
        getRightAndBottom(w, h, false, 0),
        "Z",
      ],
    }));
  }

  function hatRect(w, h, props) {
    return path(extend(props, {
      path: [
        "M", 0, 12,
        arc(0, 12, 80, 10, 80, 80),
        "L", w - 3, 10, "L", w, 10 + 3,
        getRightAndBottom(w, h, true),
        "Z",
      ],
    }));
  }

  function curve(p1x, p1y, p2x, p2y, roundness) {
    var roundness = roundness || 0.42;
    var midX = (p1x + p2x) / 2.0;
    var midY = (p1y + p2y) / 2.0;
    var cx = Math.round(midX + (roundness * (p2y - p1y)));
    var cy = Math.round(midY - (roundness * (p2x - p1x)));
    return [cx, cy, p2x, p2y].join(" ");
  }

  function procHatBase(w, h, archRoundness, props) {
    // TODO use arc()
    var archRoundness = Math.min(0.2, 35 / w);
    return path(extend(props, {
      path: [
        "M", 0, 15,
        "Q", curve(0, 15, w, 15, archRoundness),
        getRightAndBottom(w, h, true),
        "M", -1, 13,
        "Q", curve(-1, 13, w + 1, 13, archRoundness),
        "Q", curve(w + 1, 13, w, 16, 0.6),
        "Q", curve(w, 16, 0, 16, -archRoundness),
        "Q", curve(0, 16, -1, 13, 0.6),
        "Z",
      ],
    }));
  }

  function procHatCap(w, h, archRoundness) {
    // TODO use arc()
    // TODO this doesn't look quite right
    return path({
      path: [
        "M", -1, 13,
        "Q", curve(-1, 13, w + 1, 13, archRoundness),
        "Q", curve(w + 1, 13, w, 16, 0.6),
        "Q", curve(w, 16, 0, 16, -archRoundness),
        "Q", curve(0, 16, -1, 13, 0.6),
        "Z",
      ],
      class: 'define-hat-cap',
    });
  }

  function procHatRect(w, h, props) {
    var q = 52;
    var y = h - q;

    var archRoundness = Math.min(0.2, 35 / w);

    return translate(0, y, group([
        procHatBase(w, q, archRoundness, props),
        procHatCap(w, q, archRoundness),
    ]));
  }

  function mouthRect(w, h, isFinal, lines, props) {
    var y = lines[0].height;
    var p = [
      getTop(w),
      getRightAndBottom(w, y, true, 15),
    ];
    for (var i=1; i<lines.length; i += 2) {
      var isLast = (i + 2 === lines.length);

      y += lines[i].height - 3;
      p.push(getArm(w, y));

      var hasNotch = !(isLast && isFinal);
      var inset = isLast ? 0 : 15;
      y += lines[i + 1].height + 3;
      p.push(getRightAndBottom(w, y, hasNotch, inset));
    }
    return path(extend(props, {
      path: p,
    }));
  }

  function ringOuter(w, h, props) {
    var r = 8;
    return path(extend(props, {
      path: [
        "M", r, 0,
        arcw(r, 0, 0, r, r, r),
        arcw(0, h - r, r, h, r, r),
        arcw(w - r, h, w, h - r, r, r),
        arcw(w, r, w - r, 0, r, r),
        "Z"
      ],
    }));
  }

  function commentRect(w, h, props) {
    var r = 6;
    return path(extend(props, {
      class: 'comment',
      path: [
        "M", r, 0,
        arc(w - r, 0, w, r, r, r),
        arc(w, h - r, w - r, h, r, r),
        arc(r, h, 0, h - r, r, r),
        arc(0, r, r, 0, r, r),
        "Z"
      ],
    }));
  }

  function commentLine(width, props) {
    return translate(-width, 9, rect(width, 2, extend(props, {
      class: 'comment-line',
    })));
  }

  /* definitions */

  var cssContent = "text{font-family:Lucida Grande,Verdana,Arial,DejaVu Sans,sans-serif;font-weight:700;fill:#fff;font-size:10px;word-spacing:+1px}.obsolete{fill:#d42828}.motion{fill:#4a6cd4}.looks{fill:#8a55d7}.sound{fill:#bb42c3}.pen{fill:#0e9a6c}.events{fill:#c88330}.control{fill:#e1a91a}.sensing{fill:#2ca5e2}.operators{fill:#5cb712}.variables{fill:#ee7d16}.list{fill:#cc5b22}.custom{fill:#632d99}.custom-arg{fill:#5947b1}.extension{fill:#4b4a60}.grey{fill:#969696}.bevel{filter:url(#bevelFilter)}.input{filter:url(#inputBevelFilter)}.input-number,.input-number-dropdown,.input-string{fill:#fff}.literal-dropdown,.literal-number,.literal-number-dropdown,.literal-string{font-weight:400;font-size:9px;word-spacing:0}.literal-number,.literal-number-dropdown,.literal-string{fill:#000}.darker{filter:url(#inputDarkFilter)}.outline{stroke:#fff;stroke-opacity:.2;stroke-width:2;fill:none}.define-hat-cap{stroke:#632d99;stroke-width:1;fill:#8e2ec2}.comment{fill:#ffffa5;stroke:#d0d1d2;stroke-width:1}.comment-line{fill:#ffff80}.comment-label{font-family:Helevetica,Arial,DejaVu Sans,sans-serif;font-weight:700;fill:#5c5d5f;word-spacing:0;font-size:12px}";

  function makeStyle() {
    var style = el('style');
    style.appendChild(cdata(cssContent));
    return style;
  }

  function makeIcons() {
    return [
      el('path', {
        d: "M1.504 21L0 19.493 4.567 0h1.948l-.5 2.418s1.002-.502 3.006 0c2.006.503 3.008 2.01 6.517 2.01 3.508 0 4.463-.545 4.463-.545l-.823 9.892s-2.137 1.005-5.144.696c-3.007-.307-3.007-2.007-6.014-2.51-3.008-.502-4.512.503-4.512.503L1.504 21z",
        fill: '#3f8d15',
        id: 'greenFlag',
      }),
      el('path', {
        d: "M6.724 0C3.01 0 0 2.91 0 6.5c0 2.316 1.253 4.35 3.14 5.5H5.17v-1.256C3.364 10.126 2.07 8.46 2.07 6.5 2.07 4.015 4.152 2 6.723 2c1.14 0 2.184.396 2.993 1.053L8.31 4.13c-.45.344-.398.826.11 1.08L15 8.5 13.858.992c-.083-.547-.514-.714-.963-.37l-1.532 1.172A6.825 6.825 0 0 0 6.723 0z",
        fill: '#fff',
        id: 'turnRight',
      }),
      el('path', {
        d: "M3.637 1.794A6.825 6.825 0 0 1 8.277 0C11.99 0 15 2.91 15 6.5c0 2.316-1.253 4.35-3.14 5.5H9.83v-1.256c1.808-.618 3.103-2.285 3.103-4.244 0-2.485-2.083-4.5-4.654-4.5-1.14 0-2.184.396-2.993 1.053L6.69 4.13c.45.344.398.826-.11 1.08L0 8.5 1.142.992c.083-.547.514-.714.963-.37l1.532 1.172z",
        fill: '#fff',
        id: 'turnLeft',
      }),
      setProps(group([
        el('path', {
          d: "M8 0l2 -2l0 -3l3 0l-4 -5l-4 5l3 0l0 3l-8 0l0 2",
          fill: '#000',
          opacity: '0.3',
        }),
        translate(-1, -1, el('path', {
          d: "M8 0l2 -2l0 -3l3 0l-4 -5l-4 5l3 0l0 3l-8 0l0 2",
          fill: '#fff',
          opacity: '0.9',
        })),
      ]), {
        id: 'loopArrow',
      }),
    ];
  }

  var Filter = function(id, props) {
    this.el = el('filter', extend(props, {
      id: id,
      x0: '-50%',
      y0: '-50%',
      width: '200%',
      height: '200%',
    }));
    this.highestId = 0;
  };
  Filter.prototype.fe = function(name, props, children) {
    var shortName = name.toLowerCase().replace(/gaussian|osite/, '');
    var id = [shortName, '-', ++this.highestId].join('');
    this.el.appendChild(withChildren(el("fe" + name, extend(props, {
      result: id,
    })), children || []));
    return id;
  }
  Filter.prototype.comp = function(op, in1, in2, props) {
    return this.fe('Composite', extend(props, {
      operator: op,
      in: in1,
      in2: in2,
    }));
  }
  Filter.prototype.subtract = function(in1, in2) {
    return this.comp('arithmetic', in1, in2, { k2: +1, k3: -1 });
  }
  Filter.prototype.offset = function(dx, dy, in1) {
    return this.fe('Offset', {
      in: in1,
      dx: dx,
      dy: dy,
    });
  }
  Filter.prototype.flood = function(color, opacity, in1) {
    return this.fe('Flood', {
      in: in1,
      'flood-color': color,
      'flood-opacity': opacity,
    });
  }
  Filter.prototype.blur = function(dev, in1) {
    return this.fe('GaussianBlur', {
      'in': 'SourceAlpha',
      stdDeviation: [dev, dev].join(' '),
    });
  }
  Filter.prototype.merge = function(children) {
    this.fe('Merge', {}, children.map(function(name) {
      return el('feMergeNode', {
        in: name,
      });
    }));
  }

  function bevelFilter(id, inset) {
    var f = new Filter(id);

    var alpha = 'SourceAlpha';
    var s = inset ? -1 : 1;
    var blur = f.blur(1, alpha);

    f.merge([
      'SourceGraphic',
      f.comp('in',
           f.flood('#fff', 0.15),
           f.subtract(alpha, f.offset(+s, +s, blur))
      ),
      f.comp('in',
           f.flood('#000', 0.7),
           f.subtract(alpha, f.offset(-s, -s, blur))
      ),
    ]);

    return f.el;
  }

  function darkFilter(id) {
    var f = new Filter(id);

    f.merge([
      'SourceGraphic',
      f.comp('in',
        f.flood('#000', 0.2),
        'SourceAlpha'),
    ]);

    return f.el;
  }

  function darkRect(w, h, category, el) {
    return setProps(group([
      setProps(el, {
        class: [category, 'darker'].join(' '),
      })
    ]), { width: w, height: h });
  }


  /* layout */

  function draw(o) {
    o.draw();
  }

  /* Label */

  var Label = function(value, cls) {
    this.value = value;
    this.cls = cls || '';
    this.el = null;
    this.width = null;
    this.height = 12;
    this.x = 0;
  };
  Label.prototype.isLabel = true;

  Label.prototype.measure = function() {
    this.el = text(0, 10, this.value, {
      class: this.cls,
    });
    if (this.value === "") {
      this.width = 0;
    } else if (this.value === " ") {
      this.width = 4.15625;
    } else {
      Label.measure(this);
    }
  };

  Label.prototype.draw = function() {
    return this.el;
  };

  Label.measuring = null;
  Label.toMeasure = [];

  Label.startMeasuring = function() {
    Label.measuring = newSVG(1, 1);
    Label.measuring.classList.add('sb-measure');
    Label.measuring.style.visibility = 'hidden';
    document.body.appendChild(Label.measuring);

    var defs = el('defs');
    Label.measuring.appendChild(defs);
    defs.appendChild(makeStyle());
  };
  Label.measure = function(label) {
    Label.measuring.appendChild(label.el);
    Label.toMeasure.push(label);
  };
  Label.endMeasuring = function(cb) {
    var measuring = Label.measuring;
    var toMeasure = Label.toMeasure;
    Label.measuring = null;
    Label.toMeasure = [];

    setTimeout(Label.measureAll.bind(null, measuring, toMeasure, cb), 0);
    //Label.measureAll(measuring, toMeasure, cb);
  };
  Label.measureAll = function(measuring, toMeasure, cb) {
    for (var i=0; i<toMeasure.length; i++) {
      var label = toMeasure[i];
      var bbox = label.el.getBBox();
      label.width = (bbox.width + 0.5) | 0;

      var trailingSpaces = / *$/.exec(label.value)[0].length || 0;
      for (var j=0; j<trailingSpaces; j++) {
        label.width += 4.15625;
      }
    }
    document.body.removeChild(measuring);
    cb();
  };


  /* Icon */

  var Icon = function(name) {
    this.name = name;
    this.isArrow = name === 'loopArrow';

    var info = Icon.icons[name];
    assert(info, "no info for icon " + name);
    extend(info, this);
  };
  Icon.prototype.isIcon = true;
  Icon.icons = {
    greenFlag: { width: 20, height: 21, dy: -2 },
    turnLeft: { width: 15, height: 12, dy: +1 },
    turnRight: { width: 15, height: 12, dy: +1 },
    loopArrow: { width: 14, height: 11 },
  };
  Icon.prototype.draw = function() {
    return symbol('#' + this.name, {
      width: this.width,
      height: this.height,
    });
  };


  /* Input */

  var Input = function(shape, value) {
    this.shape = shape;
    this.value = value;

    this.isRound = shape === 'number' || shape === 'number-dropdown';
    this.isBoolean = shape === 'boolean';
    this.isStack = shape === 'stack';
    this.isInset = shape === 'boolean' || shape === 'stack' || shape === 'reporter';
    this.isColor = shape === 'color';
    this.hasArrow = shape === 'dropdown' || shape === 'number-dropdown';
    this.isDarker = shape === 'boolean' || shape === 'stack' || shape === 'dropdown';

    this.hasLabel = !(this.isColor || this.isInset);
    this.label = this.hasLabel ? new Label(value, ['literal-' + this.shape]) : null;
    this.x = 0;
  };
  Input.prototype.isInput = true;

  Input.prototype.measure = function() {
    if (this.hasLabel) this.label.measure();
  };

  Input.shapes = {
    'string': rect,
    'number': roundedRect,
    'number-dropdown': roundedRect,
    'color': rect,
    'dropdown': rect,

    'boolean': pointedRect,
    'stack': stackRect,
    'reporter': roundedRect,
  };

  Input.prototype.draw = function(parent) {
    if (this.hasLabel) {
      var label = this.label.draw();
      var w = Math.max(14, this.label.width + (this.shape === 'string' || this.shape === 'number-dropdown' ? 6 : 9));
    } else {
      var w = this.isStack ? 40
            : this.isInset ? 30
            : this.isColor ? 13 : null;
    }
    if (this.hasArrow) w += 10;
    this.width = w;

    var h = this.height = this.isStack ? 16 : this.isRound || this.isColor ? 13 : 14;

    var el = Input.shapes[this.shape](w, h);
    if (this.isColor) {
      setProps(el, {
        fill: this.value,
      });
    } else if (this.isDarker) {
      el = darkRect(w, h, parent.info.category, el);
    }

    var result = group([
      setProps(el, {
        class: ['input', 'input-'+this.shape].join(' '),
      }),
    ]);
    if (this.hasLabel) {
      var x = this.isRound ? 5 : 4;
      result.appendChild(translate(x, 0, label));
    }
    if (this.hasArrow) {
      var y = this.shape === 'dropdown' ? 5 : 4;
      result.appendChild(translate(w - 10, y, polygon({
        points: [
          7, 0,
          3.5, 4,
          0, 0,
        ],
        fill: '#000',
        opacity: '0.6',
      })));
    }
    return result;
  };

  Input.fromAST = function(input) {
    if (input.pieces.length === 0) {
      return new Input(input.shape, "");
    }
    assert(input.pieces.length === 1);
    return new Input(input.shape, input.pieces[0]);
  };


  /* Block */

  var Block = function(info, children, comment) {
    assert(children.length);
    this.info = info;
    this.children = children;
    this.comment = comment || null;

    var shape = this.info.shape;
    this.isHat = shape === 'hat';
    this.hasPuzzle = shape === 'stack' || shape === 'hat';
    this.isFinal = /cap/.test(shape);
    this.isCommand = shape === 'stack' || shape === 'cap' || /block/.test(shape);
    this.isOutline = shape === 'outline';
    this.isReporter = shape === 'reporter' || shape === 'embedded';
    this.isBoolean = shape === 'boolean';
    this.isRing = shape === 'ring';
    this.hasScript = /block/.test(shape);

    this.x = 0;
  };
  Block.prototype.isBlock = true;

  Block.prototype.measure = function() {
    for (var i=0; i<this.children.length; i++) {
      var child = this.children[i];
      if (child.measure) child.measure();
    }
    if (this.comment) this.comment.measure();
  };

  Block.shapes = {
    'stack': stackRect,
    'cap': capRect,
    'reporter': roundedRect,
    'embedded': roundedRect,
    'boolean': pointedRect,
    'hat': hatRect,
    'define-hat': procHatRect,
    'ring': ringOuter,
  };

  Block.prototype.drawSelf = function(w, h, lines) {
    // mouths
    if (lines.length > 1) {
      return mouthRect(w, h, this.isFinal, lines, {
        class: [this.info.category, 'bevel'].join(' '),
      });
    }

    // outlines
    if (this.info.shape === 'outline') {
      return setProps(stackRect(w, h), {
        class: 'outline',
      });
    }

    var func = Block.shapes[this.info.shape];
    assert(func, "no shape func: " + this.info.shape);
    var el = func(w, h, {
      class: [this.info.category, 'bevel'].join(' '),
    });

    // rings
    if (this.isRing) {
      var child = this.children[0];
      if (child) {
        var childEl = child.el;
        while (childEl.tagName !== 'path' && childEl.children.length) {
          childEl = childEl.children[0];
        }
        if (childEl.tagName === 'path') {
          setProps(group([
            setProps(el, {
              d: el.getAttribute('d') + ' ' + translatePath(4, child.y || 4, childEl.getAttribute('d')),
            }),
          ]), {
            'fill-rule': 'even-odd',
          });
        }
      }
    }

    return el;
  };

  Block.prototype.minDistance = function(child) {
    if (this.isBoolean) {
      return (
        child.isReporter ? 4 + child.height/4 | 0 :
        child.isLabel ? 5 + child.height/2 | 0 :
        child.isBoolean || child.shape === 'boolean' ? 5 :
        2 + child.height/2 | 0
      );
    }
    if (this.isReporter) {
      return (
        (child.isInput && child.isRound) || ((child.isReporter || child.isBoolean) && !child.hasScript) ? 0 :
        child.isLabel ? 2 + child.height/2 | 0 :
        -2 + child.height/2 | 0
      );
    }
    return 0;
  };

  Block.padding = {
    'hat':        [15, 6, 2],
    'define-hat': [21, 8, 9],
    'reporter':   [3, 4, 1],
    'embedded':   [3, 4, 1],
    'boolean':    [3, 4, 2],
    'cap':        [6, 6, 2],
    'c-block':    [3, 6, 2],
    'if-block':   [3, 6, 2],
    'ring':       [4, 4, 2],
    null:         [4, 6, 2],
  };

  Block.prototype.draw = function() {
    var isDefine = this.info.shape === 'define-hat';

    var padding = Block.padding[this.info.shape] || Block.padding[null];
    var pt = padding[0],
        px = padding[1],
        pb = padding[2];

    var y = 0;
    var Line = function(y) {
      this.y = y;
      this.width = 0;
      this.height = 16;
      this.children = [];
    };

    var innerWidth = 0;
    var scriptWidth = 0;
    var line = new Line(y);
    function pushLine(isLast) {
      if (lines.length === 0) {
        line.height += pt + pb;
      } else {
        line.height = isLast ? 13 : 15;
        line.y -= 1;
      }
      y += line.height;
      lines.push(line);
    }

    var lines = [];
    for (var i=0; i<this.children.length; i++) {
      var child = this.children[i];
      child.el = child.draw(this);

      if (child.isScript) {
        pushLine();
        child.y = y;
        lines.push(child);
        scriptWidth = Math.max(scriptWidth, Math.max(1, child.width));
        child.height = Math.max(12, child.height);
        if (child.isFinal) child.height += 3;
        y += child.height;
        line = new Line(y);
      } else {
        var cmw = i > 0 ? 30 : 0; // 27
        var md = this.isCommand ? 0 : this.minDistance(child);
        var mw = this.isCommand ? (child.isBlock || child.isInput ? cmw : 0) : md;
        if (mw && !lines.length && line.width < mw - px) {
          line.width = mw - px;
        }
        child.x = line.width;
        line.width += child.width;
        innerWidth = Math.max(innerWidth, line.width + Math.max(0, md - px));
        line.width += 4;
        if (!child.isLabel) {
          line.height = Math.max(line.height, child.height);
        }
        line.children.push(child);
      }
    }
    pushLine(true);

    innerWidth = Math.max(innerWidth + px * 2,
                          this.isHat || this.hasScript ? 83 :
                          this.isCommand || this.isOutline || this.isRing ? 39 : 0);
    this.height = y;
    this.width = scriptWidth ? Math.max(innerWidth, 15 + scriptWidth) : innerWidth;
    if (isDefine) {
      var p = Math.min(26, 3.5 + 0.13 * innerWidth | 0) - 18;
      this.height += p;
      pt += 2 * p;
    }

    var objects = [];

    for (var i=0; i<lines.length; i++) {
      var line = lines[i];
      if (line.isScript) {
        objects.push(translate(13, line.y, line.el));
        continue;
      }

      var h = line.height;

      for (var j=0; j<line.children.length; j++) {
        var child = line.children[j];
        if (child.isArrow) {
          objects.push(translate(innerWidth - 15, this.height - 3, child.el));
          continue;
        }

        var y = pt + (h - child.height - pt - pb) / 2 - 1;
        if (isDefine && child.isLabel) {
          y += 3;
        } else if (child.isIcon) {
          y += child.dy | 0;
        }
        if (this.isRing) {
          child.y = line.y + y|0;
          if (child.isInset) {
            continue;
          }
        }
        objects.push(translate(px + child.x, line.y + y|0, child.el));
      }
    }

    objects.splice(0, 0, this.drawSelf(innerWidth, this.height, lines));

    return group(objects);
  };

  Block.fromAST = function(thing) {
    var list = [];
    if (thing.type === 'cwrap') {
      for (var i=1; i<thing.contents.length; i++) {
        var item = thing.contents[i];
        if (item.type === 'cmouth') {
          list.push(Script.fromAST(item.contents));
        } else {
          item.pieces.forEach(function(l) {
            if (typeof l === 'string') {
              list.push(new Label(l.trim()));
            } else {
              list.push(Block.fromAST(l));
            }
          });
        }
      }
      var block = thing.contents[0];
      var shape = block.pieces[0] === 'if ' ? 'if-block' : 'c-block';
      if (thing.shape === 'cap') shape += ' cap';
      if (['repeat until _', 'repeat _', 'forever'].indexOf(block.blockid) > -1) {
        list.push(new Icon('loopArrow'));
      }
    } else {
      var block = thing;
      var shape = block.shape;
      if (thing.flag === 'ring') {
        shape = 'ring';
      }
    }

    var info = {
      shape: shape,
      category: block.category,
    };
    var children = block.pieces.map(function(piece) {
      if (/^ *$/.test(piece)) return;
      if (piece === '@') {
        var symbol = {
          'green-flag': 'greenFlag',
          'arrow-cw': 'turnRight',
          'arrow-ccw': 'turnLeft',
        }[block.image_replacement];
        if (symbol) return new Icon(symbol);
      }
      if (typeof piece === 'string') return new Label(piece.trim());
      switch (piece.shape) {
        case 'number':
        case 'string':
        case 'dropdown':
        case 'number-dropdown':
        case 'color':
          if (piece.shape === 'number' && piece.is_ringed) {
            return new Input('reporter', "");
          }
          return Input.fromAST(piece);
        default:
          if (piece.blockid === '' && (piece.shape === 'boolean' || piece.shape === 'stack')) {
            return Input.fromAST(piece);
          }
          return Block.fromAST(piece);
      }
    });
    children = children.filter(function(x) { return !!x; });
    children = children.concat(list);
    if (!children.length) {
      children.push(new Label(""));
    }
    return new Block(info, children, block.comment ? new Comment(block.comment.trim()) : undefined);
  };


  /* Comment */

  var Comment = function(value) {
    this.label = new Label(value, ['comment-label']);
    this.width = null;
  };
  Comment.lineLength = 12;
  Comment.prototype.height = 20;

  Comment.prototype.measure = function() {
    this.label.measure();
  };

  Comment.prototype.draw = function() {
    var labelEl = this.label.draw();

    this.width = this.label.width + 16;
    return group([
      commentLine(Comment.lineLength, 6),
      commentRect(this.width, this.height, {
        class: 'comment',
      }),
      translate(8, 4, labelEl),
    ]);
  };


  /* Script */

  var Script = function(blocks) {
    this.blocks = blocks;
    this.isEmpty = !blocks.length;
    this.isFinal = !this.isEmpty && blocks[blocks.length - 1].isFinal;
    this.y = 0;
  };
  Script.prototype.isScript = true;

  Script.prototype.measure = function() {
    for (var i=0; i<this.blocks.length; i++) {
      this.blocks[i].measure();
    }
  };

  Script.prototype.draw = function() {
    var children = [];
    var y = 0;
    this.width = 0;
    for (var i=0; i<this.blocks.length; i++) {
      var block = this.blocks[i];
      children.push(translate(2, y, block.draw()));
      y += block.height;
      this.width = Math.max(this.width, block.width);

      var comment = block.comment;
      if (comment) {
        var cx = block.width + 2 + Comment.lineLength;
        var cy = y - (block.height / 2);
        var el = comment.draw();
        children.push(translate(cx, cy - comment.height / 2, el));
        this.width = Math.max(this.width, cx + comment.width);
      }
    }
    this.height = y;
    if (!this.isFinal) {
      this.height += 3;
    }
    return group(children);
  };

  Script.fromAST = function(blocks) {
    return new Script(blocks.map(Block.fromAST));
  };

  /*****************************************************************************/

  function render(scripts, cb) {
    // measure strings
    Label.startMeasuring();
    scripts.forEach(function(script) {
      script.measure();
    });

    // finish measuring & render
    Label.endMeasuring(drawScripts.bind(null, scripts, cb));
  }

  function drawScripts(scripts, cb) {
    // render each script
    var width = 0;
    var height = 0;
    var elements = [];
    for (var i=0; i<scripts.length; i++) {
      var script = scripts[i];
      if (height) height += 10;
      elements.push(translate(0, height, script.draw()));
      height += script.height;
      width = Math.max(width, script.width + 4);
    }

    // return SVG
    var svg = newSVG(width, height);
    svg.appendChild(withChildren(el('defs'), [
        makeStyle(),
        bevelFilter('bevelFilter', false),
        bevelFilter('inputBevelFilter', true),
        darkFilter('inputDarkFilter'),
    ].concat(makeIcons())));

    svg.appendChild(group(elements));
    cb(svg);
  }

  function exportSVG(svg) {
    // TODO pad exported SVGs?
    return new XMLSerializer().serializeToString(svg);
  }

  /*** Render ***/

  // read code from a DOM element
  function readCode(el, options) {
    var options = extend({ 
      inline: false,
    }, options);

    var html = el.innerHTML.replace(/<br>\s?|\n|\r\n|\r/ig, '\n');
    var pre = document.createElement('pre');
    pre.innerHTML = html;
    var code = pre.textContent;
    if (options.inline) {
      code = code.replace('\n', '');
    }
    return code;
  }

  // parse code to list of Scripts
  function parse(code, options) {
    var options = extend({
      inline: false,
      languages: ['en'],
    }, options);

    reset_languages();
    options.languages.forEach(function(code) {
      if (code === 'en') return;
      load_language(scratchblocks._translations[code]);
    });

    var results = oldParser(code);

    // walk AST
    var scripts = [];
    for (var i=0; i<results.length; i++) {
      scripts.push(Script.fromAST(results[i]));
    }
    return scripts;
  }

  // insert 'svg' into 'el', with appropriate wrapper elements
  function replace(el, svg, scripts, options) {
    if (options.inline) {
      var container = document.createElement('span');
      container.className = "scratchblocks scratchblocks-inline";
      if (scripts[0] && !scripts[0].isEmpty) {
        container.classList.add('scratchblocks-inline-' + scripts[0].blocks[0].shape);
      }
      container.style.display = 'inline-block';
      container.style.verticalAlign = 'middle';
    } else {
      var container = document.createElement('div');
      container.className = "scratchblocks";
    }
    container.appendChild(svg);

    el.innerHTML = '';
    el.appendChild(container);
  }

  /* Render all matching elements in page to shiny scratch blocks.
   * Accepts a CSS selector as an argument.
   *
   *  scratchblocks.renderMatching("pre.blocks");
   *
   * Like the old 'scratchblocks2.parse().
   */
  var renderMatching = function (selector, options) {
    var selector = selector || "pre.blocks";
    var options = extend({
      inline: false,
      languages: ['en'],

      read: readCode, // function(el, options) => code
      parse: parse,   // function(code, options) => scripts
      render: render, // function(scripts, cb) => svg
      replace: replace, // function(el, svg, scripts, options)
    }, options);

    // find elements
    var results = [].slice.apply(document.querySelectorAll(selector));
    results.forEach(function(el) {
      var code = options.read(el, options);

      var scripts = options.parse(code, options);

      options.render(scripts, function(svg) {
        options.replace(el, svg, scripts, options);
      });
    });
  };



  return {
    Label: Label,
    Icon: Icon,
    Input: Input,
    Block: Block,
    Comment: Comment,
    Script: Script,

    read: readCode,
    _oldParser: oldParser,
    parse: parse,
    render: render,
    replace: replace,
    renderMatching: renderMatching,
    exportSVG: exportSVG,
  };

}();
