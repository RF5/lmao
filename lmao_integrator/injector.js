util = ace.require('ace/autocomplete/util')
const aceSnippetManager55 = ace.require('ace/snippets').snippetManager
const { Autocomplete } = ace.require('ace/autocomplete')

console.log("Content script initializing...");
var editorExtensionId = "iolciglhoknmnacbfjgccoibbcffofhk";
var editor_proxy = _debug_editors[0];

// inserting text at current position:
// var cursorPosition = editor_proxy.getCursorPosition();
// editor_proxy.session.insert(cursorPosition, "MEME REVIEW");

// gets the last 26 lines
// var lines = editor_proxy.session.getLines(cursorPosition["row"]-25, cursorPosition["row"])
// lines[lines.length - 1] = lines[lines.length - 1].substring(0, cursorPosition["column"])
var lm_prediction_flag = false;

var languageModelCompleter = {
    identifierRegexps: [/.+/],
    getCompletions: function(editor, session, pos, prefix, callback) {
        // console.log(pos, prefix);

        // don't try autocomplete if we are already doing commands...
        if(prefix.startsWith('\\') && prefix.length == 1) return
        if(prefix.startsWith('\\') && (prefix.includes(" ") == false) && (prefix.includes("{") == false)) return
        if(lm_prediction_flag == false) return

        // gather last n lines
        const grab_n_lines = 100;//50;
        var lines = editor_proxy.session.getLines(pos["row"] - grab_n_lines, pos["row"])

        lines[lines.length - 1] = lines[lines.length - 1].substring(0, pos["column"]+1)

        console.log(">>> Getting predictions with last 5 lines ", lines.slice(lines.length-5))

        // dispatch message to background script
        var resp = "None";
        chrome.runtime.sendMessage(editorExtensionId, 
            {lines: lines}, 
            function(response) {
                if(response === null) {
                    callback(null, []);
                    lm_prediction_flag = false;
                    return;
                }
                resp = response.prediction;
                console.log("Inserting text:\t", resp);
                const result = resp.map(function(x) { 
                    return {
                        caption: x, // what is shown in the preview bar
                        value: x, // what goes onto the line if u smash tab
                        // snippet: '>>'+x,
                        completer: {
                            insertMatch: function (editor, data) {
                                editor.completer.insertMatch({value: data.value})
                                Autocomplete.prototype.insertMatch = Autocomplete.prototype._overleafInsertMatch;
                            }
                        },
                        meta: 'gpt2',
                        score: 90
                    }
                })
                callback(null, result)
                lm_prediction_flag = false;
            });        
    }
};

function getLastCommandFragment(lineUpToCursor) {
    let index
    if ((index = getLastCommandFragmentIndex(lineUpToCursor)) > -1) {
      return lineUpToCursor.slice(index)
    } else {
      return null
    }
};

function getLastCommandFragmentIndex(lineUpToCursor) {
    let m
    const blankArguments = lineUpToCursor.replace(/\[([^\]]*)\]/g, args =>
      Array(args.length + 1).join('.')
    )
    if ((m = blankArguments.match(/(\\[^\\]*)$/))) {
      return m.index
    } else {
      return -1
    }
};

util.retrievePrecedingIdentifier = function(text, pos, regex) {
    let currentLineOffset = 0
    for (let i = pos - 1; i <= 0; i++) {
      if (text[i] === '\n') {
        currentLineOffset = i + 1
        break
      }
    }
    const currentLine = text.slice(currentLineOffset, pos) // problem 2: this fucks up
    var fragment = getLastCommandFragment(currentLine) || '';
    if (lm_prediction_flag) {
        fragment = ''
    }
    return fragment
};

editor_proxy.completers.push(languageModelCompleter);

Autocomplete.prototype._overleafInsertMatch = Autocomplete.prototype.insertMatch
Autocomplete.prototype._lmaoInsertMatch = function(data) {
    if (!data)
        data = this.popup.getData(this.popup.getRow());
    if (!data)
        return false;

    if (data.completer && data.completer.insertMatch) {
        data.completer.insertMatch(this.editor, data);
    } else {
        // TODO add support for options.deleteSuffix
        if (this.completions.filterText) {
            var ranges = this.editor.selection.getAllRanges();
            for (var i = 0, range; range = ranges[i]; i++) {
                range.start.column -= this.completions.filterText.length;
                this.editor.session.remove(range);
            }
        }
        if (data.snippet)
            aceSnippetManager55.insertSnippet(this.editor, data.snippet);
        else
            this.editor.execCommand("insertstring", data.value || data);
    }
    this.detach();
};

document.addEventListener("keyup", function (zEvent) {
    // console.log
    if (zEvent.shiftKey  &&  zEvent.key === "Tab") {  // case sensitive
        lm_prediction_flag = true;
        Autocomplete.prototype.insertMatch = Autocomplete.prototype._lmaoInsertMatch
        editor_proxy.execCommand("startAutocomplete");
    }
});
